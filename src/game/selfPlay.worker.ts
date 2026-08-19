/// <reference lib="webworker" />

import { initialPieces } from "../data/initialPieces";
import type { ChessPiece, PieceColor, RecordedMove } from "../types";
import { applyAiMove, searchBestMove, type AiChoice } from "./ai";
import { adjudicateRepetition, describeMoveForRules, getPositionKey, NO_CAPTURE_DRAW_LIMIT, type RuleMoveRecord } from "./adjudication";
import { getLearningMoveHints, recordLearningGame, type LearningDataset, type LearningGame } from "./learning";
import { getAllLegalMoves, isInCheck } from "./rules";
import { buildSelfPlayLearningGames, type SelfPlayDecisionLabel } from "./selfPlay";

interface SelfPlayRequest {
  type: "start";
  sessionId: string;
  targetGames: number;
  dataset: LearningDataset;
  seed: number;
}

export interface SelfPlayProgressMessage {
  type: "progress";
  completedGames: number;
  targetGames: number;
  redWins: number;
  blackWins: number;
  draws: number;
  acceptedDecisions: number;
  lastGamePlies: number;
  games: LearningGame[];
}

export interface SelfPlayCompleteMessage extends Omit<SelfPlayProgressMessage, "type" | "games"> {
  type: "complete";
}

export interface SelfPlayErrorMessage {
  type: "error";
  message: string;
}

export interface SelfPlayPreviewMessage {
  type: "preview";
  gameNumber: number;
  targetGames: number;
  ply: number;
  pieces: ChessPiece[];
  turn: PieceColor;
  lastMove: { from: { row: number; col: number }; to: { row: number; col: number } } | null;
}

type SelfPlayWorkerMessage = SelfPlayProgressMessage | SelfPlayCompleteMessage | SelfPlayErrorMessage | SelfPlayPreviewMessage;

const MAX_SELF_PLAY_PLIES = 60;
const EXPLORATION_RATE = 0.12;
const SEARCH_DEPTH = 2;
const SEARCH_TIME_MS = 140;

function opposite(color: PieceColor): PieceColor {
  return color === "red" ? "black" : "red";
}

function createRandom(seed: number) {
  let state = seed >>> 0 || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function sameChoice(first: AiChoice, second: AiChoice) {
  return first.piece.id === second.piece.id
    && first.move.row === second.move.row
    && first.move.col === second.move.col;
}

function chooseExplorationMove(
  pieces: ChessPiece[],
  color: PieceColor,
  teacher: AiChoice,
  legalMoves: AiChoice[],
  random: () => number,
) {
  const teacherTarget = pieces.find((piece) => piece.color !== color
    && piece.row === teacher.move.row && piece.col === teacher.move.col);
  const teacherBoard = applyAiMove(pieces, teacher.piece.id, teacher.move.row, teacher.move.col);
  if (teacherTarget || isInCheck(opposite(color), teacherBoard) || isInCheck(color, pieces)) return teacher;

  const alternatives = legalMoves.filter((candidate) => {
    if (sameChoice(candidate, teacher)) return false;
    if (pieces.some((piece) => piece.color !== color
      && piece.row === candidate.move.row && piece.col === candidate.move.col)) return false;
    const nextBoard = applyAiMove(pieces, candidate.piece.id, candidate.move.row, candidate.move.col);
    return !isInCheck(opposite(color), nextBoard);
  });
  if (alternatives.length === 0) return teacher;
  return alternatives[Math.floor(random() * alternatives.length)];
}

function playTrainingGame(
  trainingGameId: string,
  dataset: LearningDataset,
  random: () => number,
  onPreview: (preview: Omit<SelfPlayPreviewMessage, "type" | "gameNumber" | "targetGames">) => void,
) {
  const startPieces = initialPieces.map((piece) => ({ ...piece }));
  let pieces = startPieces;
  let turn: PieceColor = "red";
  let winner: PieceColor | null = null;
  let draw = false;
  let noCapturePlyCount = 0;
  const moves: RecordedMove[] = [];
  const labels: SelfPlayDecisionLabel[] = [];
  const positionHistory = [getPositionKey(pieces, turn)];
  const ruleMoves: RuleMoveRecord[] = [];
  onPreview({ ply: 0, pieces, turn, lastMove: null });

  for (let ply = 0; ply < MAX_SELF_PLAY_PLIES && !winner && !draw; ply += 1) {
    const legalMoves = getAllLegalMoves(turn, pieces);
    if (legalMoves.length === 0) {
      winner = opposite(turn);
      break;
    }

    const learningHints = getLearningMoveHints(dataset, getPositionKey(pieces, turn));
    const search = searchBestMove(pieces, turn, SEARCH_DEPTH, SEARCH_TIME_MS, {
      positionHistory,
      ruleMoves,
      moves,
      learningHints,
    });
    const teacher = search.choice ?? legalMoves[0];
    const canValidate = search.stats.completedDepth >= 1;
    const shouldExplore = canValidate && random() < EXPLORATION_RATE;
    const choice = shouldExplore
      ? chooseExplorationMove(pieces, turn, teacher, legalMoves, random)
      : teacher;
    labels.push(canValidate ? (sameChoice(choice, teacher) ? "teacher" : "explore") : null);

    const capturedPiece = pieces.find((piece) => piece.row === choice.move.row && piece.col === choice.move.col) ?? null;
    const nextPieces = applyAiMove(pieces, choice.piece.id, choice.move.row, choice.move.col);
    const nextTurn = opposite(turn);
    const opponentGeneralExists = nextPieces.some((piece) => piece.type === "general" && piece.color === nextTurn);
    const gaveCheck = opponentGeneralExists && isInCheck(nextTurn, nextPieces);
    const recordedMove: RecordedMove = {
      id: `${trainingGameId}-move-${ply}`,
      mover: turn,
      pieceId: choice.piece.id,
      pieceType: choice.piece.type,
      from: { row: choice.piece.row, col: choice.piece.col },
      to: choice.move,
      capturedPiece,
      gaveCheck,
      boardAfter: nextPieces,
    };
    moves.push(recordedMove);
    noCapturePlyCount = capturedPiece ? 0 : noCapturePlyCount + 1;
    ruleMoves.push(describeMoveForRules(choice.piece.id, turn, nextPieces));
    positionHistory.push(getPositionKey(nextPieces, nextTurn));
    pieces = nextPieces;

    if (!opponentGeneralExists || getAllLegalMoves(nextTurn, nextPieces).length === 0) {
      winner = turn;
    } else {
      const repetition = adjudicateRepetition(positionHistory, ruleMoves);
      if (repetition?.result === "loss") winner = opposite(repetition.offender);
      else if (repetition?.result === "draw" || noCapturePlyCount >= NO_CAPTURE_DRAW_LIMIT) draw = true;
    }
    turn = nextTurn;
    onPreview({
      ply: ply + 1,
      pieces,
      turn,
      lastMove: { from: recordedMove.from, to: recordedMove.to },
    });
  }

  const learningGames = buildSelfPlayLearningGames(trainingGameId, startPieces, moves, labels, winner);
  return { winner, draw: draw || !winner, moves, learningGames };
}

self.onmessage = (event: MessageEvent<SelfPlayRequest>) => {
  if (event.data.type !== "start") return;
  const targetGames = Math.max(1, Math.min(10, Math.round(event.data.targetGames)));
  const random = createRandom(event.data.seed);
  let dataset = event.data.dataset;
  let redWins = 0;
  let blackWins = 0;
  let draws = 0;
  let acceptedDecisions = 0;
  let lastGamePlies = 0;

  try {
    for (let index = 0; index < targetGames; index += 1) {
      const trainingGameId = `${event.data.sessionId}-${index}`;
      const result = playTrainingGame(trainingGameId, dataset, random, (preview) => {
        const message: SelfPlayWorkerMessage = {
          type: "preview",
          gameNumber: index + 1,
          targetGames,
          ...preview,
        };
        self.postMessage(message);
      });
      result.learningGames.forEach((game) => { dataset = recordLearningGame(dataset, game); });
      if (result.winner === "red") redWins += 1;
      else if (result.winner === "black") blackWins += 1;
      else draws += 1;
      acceptedDecisions += result.learningGames.reduce((total, game) => total + game.decisions.length, 0);
      lastGamePlies = result.moves.length;
      const message: SelfPlayWorkerMessage = {
        type: "progress",
        completedGames: index + 1,
        targetGames,
        redWins,
        blackWins,
        draws,
        acceptedDecisions,
        lastGamePlies,
        games: result.learningGames,
      };
      self.postMessage(message);
    }
    const complete: SelfPlayWorkerMessage = {
      type: "complete",
      completedGames: targetGames,
      targetGames,
      redWins,
      blackWins,
      draws,
      acceptedDecisions,
      lastGamePlies,
    };
    self.postMessage(complete);
  } catch (error) {
    const message: SelfPlayWorkerMessage = {
      type: "error",
      message: error instanceof Error ? error.message : "Self-play training failed",
    };
    self.postMessage(message);
  }
};

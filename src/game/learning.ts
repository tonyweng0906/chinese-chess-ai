import type { ChessPiece, PieceColor, RecordedMove } from "../types";
import { getPositionKey } from "./adjudication";

export const LEARNING_STORAGE_KEY = "chinese-chess-ai-learning-v1";
export const MAX_LEARNING_GAMES = 200;

export type LearningOutcome = "win" | "loss" | "draw";

export interface LearningDecision {
  positionKey: string;
  moveKey: string;
  ply: number;
}

export interface LearningGame {
  id: string;
  aiColor: PieceColor;
  outcome: LearningOutcome;
  finishedAt: number;
  decisions: LearningDecision[];
}

export interface LearningDataset {
  version: 1;
  games: LearningGame[];
}

export function createLearningDataset(): LearningDataset {
  return { version: 1, games: [] };
}

export function getLearningGameId(moves: RecordedMove[]) {
  return moves[0]?.id ?? null;
}

function learningMoveKey(move: RecordedMove) {
  return `${move.pieceType}:${move.from.row},${move.from.col}->${move.to.row},${move.to.col}`;
}

export function buildLearningGame(
  startPieces: ChessPiece[],
  moves: RecordedMove[],
  aiColor: PieceColor,
  outcome: LearningOutcome,
  finishedAt = Date.now(),
): LearningGame | null {
  const id = getLearningGameId(moves);
  if (!id) return null;
  let board = startPieces;
  const decisions: LearningDecision[] = [];
  moves.forEach((move, ply) => {
    if (move.mover === aiColor) {
      decisions.push({
        positionKey: getPositionKey(board, aiColor),
        moveKey: learningMoveKey(move),
        ply,
      });
    }
    board = move.boardAfter;
  });
  if (decisions.length === 0) return null;
  return { id, aiColor, outcome, finishedAt, decisions };
}

export function recordLearningGame(dataset: LearningDataset, game: LearningGame) {
  const withoutPreviousVersion = dataset.games.filter((item) => item.id !== game.id);
  return {
    version: 1,
    games: [...withoutPreviousVersion, game]
      .sort((first, second) => first.finishedAt - second.finishedAt)
      .slice(-MAX_LEARNING_GAMES),
  } satisfies LearningDataset;
}

export function removeLearningGame(dataset: LearningDataset, gameId: string): LearningDataset {
  const games = dataset.games.filter((game) => game.id !== gameId);
  return games.length === dataset.games.length ? dataset : { version: 1, games };
}

export function getLearningStats(dataset: LearningDataset) {
  return {
    games: dataset.games.length,
    decisions: dataset.games.reduce((total, game) => total + game.decisions.length, 0),
    wins: dataset.games.filter((game) => game.outcome === "win").length,
    draws: dataset.games.filter((game) => game.outcome === "draw").length,
    losses: dataset.games.filter((game) => game.outcome === "loss").length,
  };
}

export function parseLearningDataset(value: string | null): LearningDataset {
  if (!value) return createLearningDataset();
  try {
    const data = JSON.parse(value) as Partial<LearningDataset>;
    if (data.version !== 1 || !Array.isArray(data.games)) return createLearningDataset();
    const games = data.games.filter((game): game is LearningGame => Boolean(
      game
      && typeof game.id === "string"
      && (game.aiColor === "red" || game.aiColor === "black")
      && (game.outcome === "win" || game.outcome === "loss" || game.outcome === "draw")
      && Number.isFinite(game.finishedAt)
      && Array.isArray(game.decisions)
      && game.decisions.every((decision) => decision
        && typeof decision.positionKey === "string"
        && typeof decision.moveKey === "string"
        && Number.isInteger(decision.ply)
        && decision.ply >= 0),
    ));
    return { version: 1, games: games.sort((first, second) => first.finishedAt - second.finishedAt).slice(-MAX_LEARNING_GAMES) };
  } catch {
    return createLearningDataset();
  }
}

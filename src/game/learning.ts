import type { ChessPiece, PieceColor, RecordedMove } from "../types";
import { getPositionKey } from "./adjudication";

export const LEARNING_STORAGE_KEY = "chinese-chess-ai-learning-v1";
export const MAX_LEARNING_GAMES = 200;
export const MIN_TRUSTED_SAMPLES = 3;
export const MAX_LEARNING_BONUS = 40;

export type LearningOutcome = "win" | "loss" | "draw";

export interface LearningDecision {
  positionKey: string;
  moveKey: string;
  ply: number;
  reward?: number;
}

export interface LearningGame {
  id: string;
  aiColor: PieceColor;
  outcome: LearningOutcome;
  finishedAt: number;
  decisions: LearningDecision[];
  source?: "played" | "self-play";
  trainingGameId?: string;
}

export interface LearningDataset {
  version: 1;
  games: LearningGame[];
}

export interface LearningMoveHint {
  moveKey: string;
  bonus: number;
  samples: number;
  confidence: number;
}

export function createLearningDataset(): LearningDataset {
  return { version: 1, games: [] };
}

export function getLearningGameId(moves: RecordedMove[]) {
  return moves[0]?.id ?? null;
}

export function getLearningMoveKey(
  pieceType: RecordedMove["pieceType"],
  from: { row: number; col: number },
  to: { row: number; col: number },
) {
  return `${pieceType}:${from.row},${from.col}->${to.row},${to.col}`;
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
        moveKey: getLearningMoveKey(move.pieceType, move.from, move.to),
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
  const samplesByPositionAndMove = new Map<string, number>();
  dataset.games.forEach((game) => {
    const seenInGame = new Set<string>();
    game.decisions.forEach((decision) => {
      const key = `${decision.positionKey}::${decision.moveKey}`;
      if (seenInGame.has(key)) return;
      seenInGame.add(key);
      samplesByPositionAndMove.set(key, (samplesByPositionAndMove.get(key) ?? 0) + 1);
    });
  });
  return {
    games: new Set(dataset.games.map((game) => game.source === "self-play"
      ? game.trainingGameId ?? game.id
      : game.id)).size,
    decisions: dataset.games.reduce((total, game) => total + game.decisions.length, 0),
    wins: dataset.games.filter((game) => game.outcome === "win").length,
    draws: dataset.games.filter((game) => game.outcome === "draw").length,
    losses: dataset.games.filter((game) => game.outcome === "loss").length,
    trustedMoves: [...samplesByPositionAndMove.values()].filter((samples) => samples >= MIN_TRUSTED_SAMPLES).length,
    selfPlayGames: new Set(dataset.games
      .filter((game) => game.source === "self-play")
      .map((game) => game.trainingGameId ?? game.id)).size,
  };
}

export function getLearningMoveHints(dataset: LearningDataset, positionKey: string): LearningMoveHint[] {
  const aggregates = new Map<string, { samples: number; reward: number }>();
  dataset.games.forEach((game) => {
    const gameResult = game.outcome === "win" ? 1 : game.outcome === "loss" ? -1 : 0;
    const seenInGame = new Set<string>();
    game.decisions.forEach((decision) => {
      if (decision.positionKey !== positionKey) return;
      if (seenInGame.has(decision.moveKey)) return;
      seenInGame.add(decision.moveKey);
      const aggregate = aggregates.get(decision.moveKey) ?? { samples: 0, reward: 0 };
      aggregate.samples += 1;
      aggregate.reward += typeof decision.reward === "number"
        ? Math.max(-1, Math.min(1, decision.reward))
        : gameResult;
      aggregates.set(decision.moveKey, aggregate);
    });
  });

  return [...aggregates.entries()].flatMap(([moveKey, aggregate]) => {
    if (aggregate.samples < MIN_TRUSTED_SAMPLES) return [];
    const confidence = Math.min(1, (aggregate.samples - MIN_TRUSTED_SAMPLES + 1) / 8);
    const smoothedReward = aggregate.reward / (aggregate.samples + 2);
    const bonus = Math.max(-MAX_LEARNING_BONUS, Math.min(MAX_LEARNING_BONUS, Math.round(smoothedReward * MAX_LEARNING_BONUS * confidence)));
    if (bonus === 0) return [];
    return [{ moveKey, bonus, samples: aggregate.samples, confidence }];
  }).sort((first, second) => second.bonus - first.bonus);
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
      && (game.source === undefined || game.source === "played" || game.source === "self-play")
      && (game.trainingGameId === undefined || typeof game.trainingGameId === "string")
      && Array.isArray(game.decisions)
      && game.decisions.every((decision) => decision
        && typeof decision.positionKey === "string"
        && typeof decision.moveKey === "string"
        && Number.isInteger(decision.ply)
        && decision.ply >= 0
        && (decision.reward === undefined || Number.isFinite(decision.reward))),
    ));
    return { version: 1, games: games.sort((first, second) => first.finishedAt - second.finishedAt).slice(-MAX_LEARNING_GAMES) };
  } catch {
    return createLearningDataset();
  }
}

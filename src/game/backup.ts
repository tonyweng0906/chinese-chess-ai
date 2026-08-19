import type { ChessPiece, PieceColor, RecordedMove } from "../types";
import { getPositionKey, type RuleMoveRecord } from "./adjudication";
import type { Position } from "./rules";

export const PREVIOUS_GAME_KEY = "chinese-chess-ai-previous-game";

export type GameEndReason = "general-captured" | "checkmate" | "stalemate" | "repetition" | "perpetual-check" | "perpetual-chase" | "no-capture-limit";

export interface GameSnapshot {
  pieces: ChessPiece[];
  turn: PieceColor;
  moveHistory: string[];
  positionHistory: string[];
  ruleMoves: RuleMoveRecord[];
  noCapturePlyCount: number;
  lastMove: { from: Position; to: Position } | null;
  gameStartPieces: ChessPiece[];
  gameMoves: RecordedMove[];
}

export interface PreviousGameBackup extends GameSnapshot {
  history: GameSnapshot[];
  winner: PieceColor | null;
  draw: boolean;
  endReason: GameEndReason | null;
  mode: "local" | "ai";
  playerColor: PieceColor;
  difficulty: "easy" | "normal" | "hard";
}

export function compactPreviousGameBackup(backup: PreviousGameBackup, historyLimit = 8): PreviousGameBackup {
  const limit = Math.max(0, historyLimit);
  return { ...backup, history: limit === 0 ? [] : backup.history.slice(-limit) };
}

export function minimalPreviousGameBackup(backup: PreviousGameBackup): PreviousGameBackup {
  return {
    ...backup,
    history: [],
    gameMoves: [],
    ruleMoves: [],
    positionHistory: backup.positionHistory.length > 0 ? [backup.positionHistory.at(-1)!] : [],
  };
}

export function hasGameProgress(
  pieces: ChessPiece[],
  turn: PieceColor,
  moveCount: number,
  startingPieces: ChessPiece[],
) {
  return moveCount > 0 || getPositionKey(pieces, turn) !== getPositionKey(startingPieces, "red");
}

export function parsePreviousGameBackup(value: string | null): PreviousGameBackup | null {
  if (!value) return null;
  try {
    const data = JSON.parse(value) as Partial<PreviousGameBackup>;
    if (!Array.isArray(data.pieces) || data.pieces.length === 0) return null;
    if (data.turn !== "red" && data.turn !== "black") return null;
    if (!Array.isArray(data.moveHistory) || !Array.isArray(data.positionHistory)) return null;
    if (!Array.isArray(data.ruleMoves) || !Array.isArray(data.gameStartPieces) || !Array.isArray(data.gameMoves)) return null;
    if (!Array.isArray(data.history) || typeof data.draw !== "boolean") return null;
    if (data.mode !== "local" && data.mode !== "ai") return null;
    if (data.playerColor !== "red" && data.playerColor !== "black") return null;
    if (data.difficulty !== "easy" && data.difficulty !== "normal" && data.difficulty !== "hard") return null;
    if (data.winner !== null && data.winner !== "red" && data.winner !== "black") return null;
    const endReasons: Array<GameEndReason | null> = [null, "general-captured", "checkmate", "stalemate", "repetition", "perpetual-check", "perpetual-chase", "no-capture-limit"];
    if (!endReasons.includes(data.endReason ?? null)) return null;
    if (!Number.isInteger(data.noCapturePlyCount) || (data.noCapturePlyCount ?? -1) < 0) return null;
    return data as PreviousGameBackup;
  } catch {
    return null;
  }
}

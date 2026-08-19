import type { PieceColor } from "../types";
import { getUndoSnapshotIndex } from "./undo";

export interface UndoBenchmarkResult {
  name: string;
  passed: boolean;
  actualIndex: number;
  expectedIndex: number;
}

function result(name: string, turns: PieceColor[], mode: "local" | "ai", playerColor: PieceColor, expectedIndex: number): UndoBenchmarkResult {
  const actualIndex = getUndoSnapshotIndex(turns.map((turn) => ({ turn })), mode, playerColor);
  return { name, passed: actualIndex === expectedIndex, actualIndex, expectedIndex };
}

export function runUndoBenchmarks(): UndoBenchmarkResult[] {
  return [
    result("local-undo-one-ply", ["red", "black"], "local", "red", 1),
    result("red-player-undo-full-turn", ["red", "black"], "ai", "red", 0),
    result("red-player-cancel-thinking", ["red"], "ai", "red", 0),
    result("black-player-cannot-undo-ai-opening", ["red"], "ai", "black", -1),
    result("black-player-undo-full-turn", ["red", "black", "red"], "ai", "black", 1),
    result("black-player-cancel-thinking", ["red", "black"], "ai", "black", 1),
  ];
}

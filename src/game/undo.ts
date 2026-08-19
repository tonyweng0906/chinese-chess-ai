import type { PieceColor } from "../types";

interface TurnSnapshot {
  turn: PieceColor;
}

export function getUndoSnapshotIndex(
  history: TurnSnapshot[],
  mode: "local" | "ai" | "setup",
  playerColor: PieceColor,
) {
  if (mode !== "ai") return history.length - 1;
  for (let index = history.length - 1; index >= 0; index -= 1) {
    if (history[index].turn === playerColor) return index;
  }
  return -1;
}

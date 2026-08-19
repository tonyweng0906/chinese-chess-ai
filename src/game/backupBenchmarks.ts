import { initialPieces } from "../data/initialPieces";
import { applyAiMove } from "./ai";
import { getPositionKey } from "./adjudication";
import { compactPreviousGameBackup, hasGameProgress, minimalPreviousGameBackup, parsePreviousGameBackup, type PreviousGameBackup } from "./backup";

export interface BackupBenchmarkResult {
  name: string;
  passed: boolean;
}

export function runBackupBenchmarks(): BackupBenchmarkResult[] {
  const movedPieces = applyAiMove(initialPieces, "red-soldier-0", 5, 0);
  const backup: PreviousGameBackup = {
    pieces: movedPieces,
    turn: "black",
    moveHistory: ["红方：(6,0) → (5,0)"],
    positionHistory: [getPositionKey(initialPieces, "red"), getPositionKey(movedPieces, "black")],
    ruleMoves: [],
    noCapturePlyCount: 1,
    lastMove: { from: { row: 6, col: 0 }, to: { row: 5, col: 0 } },
    gameStartPieces: initialPieces,
    gameMoves: [],
    history: [],
    winner: null,
    draw: false,
    endReason: null,
    mode: "ai",
    playerColor: "red",
    difficulty: "normal",
  };
  const restored = parsePreviousGameBackup(JSON.stringify(backup));
  const completedBackup: PreviousGameBackup = {
    ...backup,
    history: Array.from({ length: 30 }, () => ({
      pieces: movedPieces,
      turn: "black",
      moveHistory: backup.moveHistory,
      positionHistory: backup.positionHistory,
      ruleMoves: [],
      noCapturePlyCount: 1,
      lastMove: backup.lastMove,
      gameStartPieces: initialPieces,
      gameMoves: [],
    })),
    winner: "red",
    endReason: "checkmate",
  };
  const compactCompleted = compactPreviousGameBackup(completedBackup);
  const minimalCompleted = minimalPreviousGameBackup(completedBackup);
  const restoredCompleted = parsePreviousGameBackup(JSON.stringify(minimalCompleted));

  return [
    { name: "round-trip-complete-game", passed: Boolean(restored && restored.turn === "black" && restored.pieces.some((piece) => piece.id === "red-soldier-0" && piece.row === 5)) },
    { name: "reject-corrupt-backup", passed: parsePreviousGameBackup("{broken") === null },
    { name: "reject-incomplete-backup", passed: parsePreviousGameBackup(JSON.stringify({ pieces: initialPieces })) === null },
    { name: "blank-new-game-does-not-overwrite", passed: !hasGameProgress(initialPieces, "red", 0, initialPieces) },
    { name: "moved-position-is-backed-up", passed: hasGameProgress(movedPieces, "black", 1, initialPieces) },
    { name: "long-game-history-is-compacted", passed: compactCompleted.history.length === 8 },
    { name: "checkmate-survives-minimal-fallback", passed: Boolean(restoredCompleted && restoredCompleted.winner === "red" && restoredCompleted.endReason === "checkmate" && restoredCompleted.pieces.length === movedPieces.length && restoredCompleted.history.length === 0) },
  ];
}

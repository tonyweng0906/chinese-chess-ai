import { initialPieces } from "../data/initialPieces";
import { applyAiMove } from "./ai";
import { getPositionKey } from "./adjudication";
import { hasGameProgress, parsePreviousGameBackup, type PreviousGameBackup } from "./backup";

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

  return [
    { name: "round-trip-complete-game", passed: Boolean(restored && restored.turn === "black" && restored.pieces.some((piece) => piece.id === "red-soldier-0" && piece.row === 5)) },
    { name: "reject-corrupt-backup", passed: parsePreviousGameBackup("{broken") === null },
    { name: "reject-incomplete-backup", passed: parsePreviousGameBackup(JSON.stringify({ pieces: initialPieces })) === null },
    { name: "blank-new-game-does-not-overwrite", passed: !hasGameProgress(initialPieces, "red", 0, initialPieces) },
    { name: "moved-position-is-backed-up", passed: hasGameProgress(movedPieces, "black", 1, initialPieces) },
  ];
}

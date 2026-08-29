import type { ChessPiece, PieceColor, PieceType } from "../types";
import { solveEndgame } from "./endgameSolver";

function piece(id: string, type: PieceType, color: PieceColor, row: number, col: number): ChessPiece {
  return { id, type, color, row, col };
}

export function runEndgameSolverBenchmarks() {
  const mateInOne = [
    piece("bg", "general", "black", 0, 4),
    piece("target", "soldier", "black", 1, 4),
    piece("left", "soldier", "red", 1, 3),
    piece("right", "soldier", "red", 1, 5),
    piece("rook", "rook", "red", 2, 4),
    piece("horse", "horse", "red", 3, 3),
    piece("rg", "general", "red", 9, 4),
  ];
  const mateResult = solveEndgame(mateInOne, "red", 3, 2_000);

  const quietPosition = [
    piece("bg", "general", "black", 0, 4),
    piece("block", "soldier", "black", 5, 4),
    piece("rg", "general", "red", 9, 4),
  ];
  const quietResult = solveEndgame(quietPosition, "red", 3, 2_000);

  return [
    {
      name: "proves-forced-mate",
      passed: mateResult.status === "solved"
        && mateResult.line[0]?.pieceId === "rook"
        && mateResult.line[0]?.to.row === 1
        && mateResult.line[0]?.to.col === 4,
      status: mateResult.status,
      depth: mateResult.completedDepth,
      nodes: mateResult.nodes,
    },
    {
      name: "does-not-guess-unproven-win",
      passed: quietResult.status === "not-proven" && quietResult.line.length === 0,
      status: quietResult.status,
      depth: quietResult.completedDepth,
      nodes: quietResult.nodes,
    },
  ];
}

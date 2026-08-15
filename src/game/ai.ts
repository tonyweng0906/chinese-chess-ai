import { getAllLegalMoves, isInCheck } from "./rules";
import type { ChessPiece, PieceColor, PieceType } from "../types";

const values: Record<PieceType, number> = { general: 10000, rook: 900, cannon: 450, horse: 400, elephant: 200, advisor: 200, soldier: 100 };

function applyMove(pieces: ChessPiece[], pieceId: string, row: number, col: number) {
  return pieces.filter((piece) => !(piece.row === row && piece.col === col)).map((piece) => piece.id === pieceId ? { ...piece, row, col } : piece);
}

function evaluate(pieces: ChessPiece[], root: PieceColor) {
  return pieces.reduce((total, piece) => {
    const value = values[piece.type] + (piece.type === "soldier" && (piece.color === "red" ? piece.row <= 4 : piece.row >= 5) ? 45 : 0);
    return total + (piece.color === root ? value : -value);
  }, 0);
}

function minimax(pieces: ChessPiece[], turn: PieceColor, root: PieceColor, depth: number): number {
  const moves = getAllLegalMoves(turn, pieces);
  if (moves.length === 0) return isInCheck(turn, pieces) ? (turn === root ? -100000 : 100000) : 0;
  if (depth === 0) return evaluate(pieces, root);
  const scores = moves.map(({ piece, move }) => minimax(applyMove(pieces, piece.id, move.row, move.col), turn === "red" ? "black" : "red", root, depth - 1));
  return turn === root ? Math.max(...scores) : Math.min(...scores);
}

export function chooseBestMove(pieces: ChessPiece[], color: PieceColor = "black", depth = 2) {
  const moves = getAllLegalMoves(color, pieces);
  if (moves.length === 0) return null;
  let best = moves[0];
  let bestScore = -Infinity;
  for (const candidate of moves) {
    const next = applyMove(pieces, candidate.piece.id, candidate.move.row, candidate.move.col);
    const candidateScore = minimax(next, color === "red" ? "black" : "red", color, depth - 1);
    if (candidateScore > bestScore) { best = candidate; bestScore = candidateScore; }
  }
  return best;
}

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

interface SearchContext { deadline: number; stopped: boolean }

function minimax(pieces: ChessPiece[], turn: PieceColor, root: PieceColor, depth: number, alpha: number, beta: number, context: SearchContext): number {
  if (performance.now() >= context.deadline) { context.stopped = true; return evaluate(pieces, root); }
  const moves = getAllLegalMoves(turn, pieces);
  if (moves.length === 0) return isInCheck(turn, pieces) ? (turn === root ? -100000 : 100000) : 0;
  if (depth === 0) return evaluate(pieces, root);
  const maximizing = turn === root;
  let best = maximizing ? -Infinity : Infinity;
  for (const { piece, move } of moves) {
    const value = minimax(applyMove(pieces, piece.id, move.row, move.col), turn === "red" ? "black" : "red", root, depth - 1, alpha, beta, context);
    best = maximizing ? Math.max(best, value) : Math.min(best, value);
    if (maximizing) alpha = Math.max(alpha, best); else beta = Math.min(beta, best);
    if (beta <= alpha || context.stopped) break;
  }
  return best;
}

export function chooseBestMove(pieces: ChessPiece[], color: PieceColor = "black", depth = 2, timeLimit = 700) {
  const moves = getAllLegalMoves(color, pieces);
  if (moves.length === 0) return null;
  const context: SearchContext = { deadline: performance.now() + timeLimit, stopped: false };
  let best = moves[0];
  let bestScore = -Infinity;
  for (const candidate of moves) {
    const next = applyMove(pieces, candidate.piece.id, candidate.move.row, candidate.move.col);
    const candidateScore = minimax(next, color === "red" ? "black" : "red", color, depth - 1, -Infinity, Infinity, context);
    if (candidateScore > bestScore) { best = candidate; bestScore = candidateScore; }
    if (context.stopped) break;
  }
  return best;
}

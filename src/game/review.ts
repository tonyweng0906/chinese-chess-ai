import type { ChessPiece, PieceColor, PieceType, RecordedMove } from "../types";
import { chooseBestMove } from "./ai";
import { getAllLegalMoves, isInCheck } from "./rules";

export type MoveQuality = "best" | "good" | "questionable" | "mistake";

export interface MoveAnalysis {
  quality: MoveQuality;
  isRecommendedMove: boolean;
  isMate: boolean;
  captured: PieceType | null;
  gaveCheck: boolean;
  recommendation: {
    pieceType: PieceType;
    from: { row: number; col: number };
    to: { row: number; col: number };
    captures: PieceType | null;
    givesCheck: boolean;
  } | null;
}

const pieceValues: Record<PieceType, number> = {
  general: 10000,
  rook: 900,
  cannon: 450,
  horse: 400,
  elephant: 200,
  advisor: 200,
  soldier: 100,
};

function applyMove(pieces: ChessPiece[], pieceId: string, row: number, col: number) {
  return pieces
    .filter((piece) => !(piece.row === row && piece.col === col))
    .map((piece) => piece.id === pieceId ? { ...piece, row, col } : piece);
}

function evaluateFor(pieces: ChessPiece[], color: PieceColor) {
  const opponent: PieceColor = color === "red" ? "black" : "red";
  if (!pieces.some((piece) => piece.type === "general" && piece.color === opponent)) return 100000;
  if (!pieces.some((piece) => piece.type === "general" && piece.color === color)) return -100000;
  const opponentMoves = getAllLegalMoves(opponent, pieces);
  if (opponentMoves.length === 0) return 100000;

  const material = pieces.reduce((total, piece) => {
    const crossedBonus = piece.type === "soldier" && (piece.color === "red" ? piece.row <= 4 : piece.row >= 5) ? 45 : 0;
    const value = pieceValues[piece.type] + crossedBonus;
    return total + (piece.color === color ? value : -value);
  }, 0);
  const mobility = getAllLegalMoves(color, pieces).length - opponentMoves.length;
  const checkPressure = isInCheck(opponent, pieces) ? 45 : 0;
  return material + mobility * 2 + checkPressure;
}

export function analyzeRecordedMove(piecesBefore: ChessPiece[], move: RecordedMove, depth = 2): MoveAnalysis {
  const opponent: PieceColor = move.mover === "red" ? "black" : "red";
  const best = chooseBestMove(piecesBefore, move.mover, Math.min(2, Math.max(1, depth)), 240);
  const sameMove = Boolean(best && best.piece.id === move.pieceId && best.move.row === move.to.row && best.move.col === move.to.col);
  const actualScore = evaluateFor(move.boardAfter, move.mover);
  const bestBoard = best ? applyMove(piecesBefore, best.piece.id, best.move.row, best.move.col) : move.boardAfter;
  const bestScore = evaluateFor(bestBoard, move.mover);
  const difference = Math.max(0, bestScore - actualScore);
  const equivalentToBest = sameMove || difference <= 35;
  const quality: MoveQuality = equivalentToBest ? "best" : difference <= 130 ? "good" : difference <= 300 ? "questionable" : "mistake";
  const isMate = !move.boardAfter.some((piece) => piece.type === "general" && piece.color === opponent)
    || getAllLegalMoves(opponent, move.boardAfter).length === 0;

  const target = best ? piecesBefore.find((piece) => piece.row === best.move.row && piece.col === best.move.col) ?? null : null;
  const recommendationBoard = best ? applyMove(piecesBefore, best.piece.id, best.move.row, best.move.col) : null;
  return {
    quality,
    isRecommendedMove: equivalentToBest,
    isMate,
    captured: move.capturedPiece?.type ?? null,
    gaveCheck: move.gaveCheck,
    recommendation: !best || equivalentToBest ? null : {
      pieceType: best.piece.type,
      from: { row: best.piece.row, col: best.piece.col },
      to: best.move,
      captures: target?.type ?? null,
      givesCheck: recommendationBoard ? isInCheck(opponent, recommendationBoard) : false,
    },
  };
}

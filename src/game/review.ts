import type { ChessPiece, PieceColor, PieceType, RecordedMove } from "../types";
import { applyAiMove, searchBestMove, type AiChoice } from "./ai";
import { getAllLegalMoves, isInCheck } from "./rules";

export type MoveQuality = "best" | "good" | "questionable" | "mistake";
export type ReviewConfidence = "low" | "medium" | "high";
export type ReviewReason = "mate" | "capture" | "check" | "equivalent" | "missed-capture" | "missed-check" | "position";

interface ReviewLineMove {
  pieceType: PieceType;
  from: { row: number; col: number };
  to: { row: number; col: number };
  captures: PieceType | null;
  givesCheck: boolean;
}

export interface MoveAnalysis {
  quality: MoveQuality;
  isRecommendedMove: boolean;
  isMate: boolean;
  captured: PieceType | null;
  gaveCheck: boolean;
  scoreLoss: number;
  confidence: ReviewConfidence;
  reason: ReviewReason;
  recommendation: ReviewLineMove | null;
  reply: ReviewLineMove | null;
}

const MATE_SCORE = 1_000_000;

function opposite(color: PieceColor): PieceColor {
  return color === "red" ? "black" : "red";
}

function sameChoice(choice: AiChoice | null, move: RecordedMove) {
  return Boolean(choice
    && choice.piece.id === move.pieceId
    && choice.move.row === move.to.row
    && choice.move.col === move.to.col);
}

function describeChoice(pieces: ChessPiece[], choice: AiChoice | null, opponent: PieceColor): ReviewLineMove | null {
  if (!choice) return null;
  const target = pieces.find((piece) => piece.row === choice.move.row && piece.col === choice.move.col) ?? null;
  const nextBoard = applyAiMove(pieces, choice.piece.id, choice.move.row, choice.move.col);
  return {
    pieceType: choice.piece.type,
    from: { row: choice.piece.row, col: choice.piece.col },
    to: choice.move,
    captures: target?.type ?? null,
    givesCheck: isInCheck(opponent, nextBoard),
  };
}

function getConfidence(bestDepth: number, replyDepth: number, isMate: boolean): ReviewConfidence {
  if (isMate || bestDepth >= 3 && replyDepth >= 2) return "high";
  if (bestDepth >= 2 && replyDepth >= 1) return "medium";
  return "low";
}

function getReason(
  sameMove: boolean,
  scoreLoss: number,
  move: RecordedMove,
  isMate: boolean,
  recommendation: ReviewLineMove | null,
): ReviewReason {
  if (isMate) return "mate";
  if (sameMove) {
    if (move.capturedPiece) return "capture";
    if (move.gaveCheck) return "check";
    return "position";
  }
  if (scoreLoss <= 35) return "equivalent";
  if (recommendation?.captures && !move.capturedPiece) return "missed-capture";
  if (recommendation?.givesCheck && !move.gaveCheck) return "missed-check";
  return "position";
}

export function analyzeRecordedMove(piecesBefore: ChessPiece[], move: RecordedMove, depth = 2): MoveAnalysis {
  const opponent = opposite(move.mover);
  const requestedDepth = Math.min(3, Math.max(2, depth));
  const bestTimeLimit = requestedDepth >= 3 ? 900 : 520;
  const bestSearch = searchBestMove(piecesBefore, move.mover, requestedDepth, bestTimeLimit);
  const sameMove = sameChoice(bestSearch.choice, move);
  const isMate = !move.boardAfter.some((piece) => piece.type === "general" && piece.color === opponent)
    || getAllLegalMoves(opponent, move.boardAfter).length === 0;

  const comparisonDepth = Math.max(1, bestSearch.stats.completedDepth - 1);
  const replySearch = searchBestMove(move.boardAfter, opponent, comparisonDepth, comparisonDepth >= 2 ? 620 : 360);
  const actualScore = replySearch.choice ? -replySearch.score : MATE_SCORE;
  const scoreLoss = Math.max(0, Math.min(MATE_SCORE, bestSearch.score - actualScore));

  const quality: MoveQuality = sameMove
    ? "best"
    : scoreLoss <= 35
      ? "good"
      : scoreLoss <= 160
        ? "questionable"
        : "mistake";

  const recommendation = describeChoice(piecesBefore, bestSearch.choice, opponent);
  const reply = quality === "questionable" || quality === "mistake"
    ? describeChoice(move.boardAfter, replySearch.choice, move.mover)
    : null;

  return {
    quality,
    isRecommendedMove: sameMove,
    isMate,
    captured: move.capturedPiece?.type ?? null,
    gaveCheck: move.gaveCheck,
    scoreLoss,
    confidence: getConfidence(bestSearch.stats.completedDepth, replySearch.stats.completedDepth, isMate),
    reason: getReason(sameMove, scoreLoss, move, isMate, recommendation),
    recommendation: sameMove ? null : recommendation,
    reply,
  };
}

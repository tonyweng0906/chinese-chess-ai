import type { ChessPiece, PieceColor, RecordedMove } from "../types";
import { initialPieces } from "../data/initialPieces";
import { applyAiMove, searchBestMove } from "./ai";
import { analyzeRecordedMove } from "./review";
import { getReviewBoardComparison } from "./reviewComparison";
import { isInCheck } from "./rules";

export interface ReviewBenchmarkResult {
  name: string;
  passed: boolean;
  quality: string;
  scoreLoss: number;
}

function piece(id: string, type: ChessPiece["type"], color: PieceColor, row: number, col: number): ChessPiece {
  return { id, type, color, row, col };
}

function recordedMove(pieces: ChessPiece[], pieceId: string, row: number, col: number): RecordedMove {
  const movingPiece = pieces.find((item) => item.id === pieceId)!;
  const capturedPiece = pieces.find((item) => item.row === row && item.col === col) ?? null;
  const boardAfter = applyAiMove(pieces, pieceId, row, col);
  const opponent = movingPiece.color === "red" ? "black" : "red";
  return {
    id: `${pieceId}-${row}-${col}`,
    mover: movingPiece.color,
    pieceId,
    pieceType: movingPiece.type,
    from: { row: movingPiece.row, col: movingPiece.col },
    to: { row, col },
    capturedPiece,
    gaveCheck: isInCheck(opponent, boardAfter),
    boardAfter,
  };
}

export function runReviewBenchmarks(): ReviewBenchmarkResult[] {
  const position = [
    piece("bg", "general", "black", 0, 4),
    piece("rg", "general", "red", 9, 4),
    piece("block", "soldier", "red", 5, 4),
    piece("rr", "rook", "red", 4, 0),
    piece("br", "rook", "black", 4, 5),
  ];
  const engineChoice = searchBestMove(position, "red", 2, 500).choice!;
  const engineMove = recordedMove(position, engineChoice.piece.id, engineChoice.move.row, engineChoice.move.col);
  const engineAnalysis = analyzeRecordedMove(position, engineMove, 2);

  const blunderMove = recordedMove(position, "rr", 3, 0);
  const blunderAnalysis = analyzeRecordedMove(position, blunderMove, 2);
  const quietMove = recordedMove(initialPieces, "red-advisor-3", 8, 4);
  const quietAnalysis = analyzeRecordedMove(initialPieces, quietMove, 2);
  const blunderComparison = getReviewBoardComparison(blunderAnalysis, blunderMove);
  const engineComparison = getReviewBoardComparison(engineAnalysis, engineMove);

  return [
    {
      name: "engine-choice-is-top-choice",
      passed: engineAnalysis.quality === "best" && engineAnalysis.isRecommendedMove,
      quality: engineAnalysis.quality,
      scoreLoss: engineAnalysis.scoreLoss,
    },
    {
      name: "missed-rook-is-not-best",
      passed: blunderAnalysis.quality !== "best" && !blunderAnalysis.isRecommendedMove,
      quality: blunderAnalysis.quality,
      scoreLoss: blunderAnalysis.scoreLoss,
    },
    {
      name: "bad-move-has-concrete-lines",
      passed: Boolean(blunderAnalysis.recommendation && blunderAnalysis.reply),
      quality: blunderAnalysis.quality,
      scoreLoss: blunderAnalysis.scoreLoss,
    },
    {
      name: "bad-move-has-board-comparison",
      passed: Boolean(
        blunderComparison
        && blunderComparison.actual.from.row === blunderMove.from.row
        && blunderComparison.actual.to.row === blunderMove.to.row
        && blunderComparison.recommended.from.row === blunderAnalysis.recommendation?.from.row
        && blunderComparison.recommended.to.col === blunderAnalysis.recommendation?.to.col
      ),
      quality: blunderAnalysis.quality,
      scoreLoss: blunderAnalysis.scoreLoss,
    },
    {
      name: "top-choice-keeps-simple-board",
      passed: engineComparison === null,
      quality: engineAnalysis.quality,
      scoreLoss: engineAnalysis.scoreLoss,
    },
    {
      name: "ordinary-move-is-not-automatically-best",
      passed: quietAnalysis.quality !== "best" && !quietAnalysis.isRecommendedMove,
      quality: quietAnalysis.quality,
      scoreLoss: quietAnalysis.scoreLoss,
    },
  ];
}

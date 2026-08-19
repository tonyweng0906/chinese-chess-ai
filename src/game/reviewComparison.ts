import type { RecordedMove } from "../types";
import type { MoveAnalysis } from "./review";
import type { Position } from "./rules";

export interface ReviewMoveRoute {
  from: Position;
  to: Position;
}

export interface ReviewBoardComparison {
  actual: ReviewMoveRoute;
  recommended: ReviewMoveRoute;
}

export function getReviewBoardComparison(
  analysis: MoveAnalysis | null,
  move: RecordedMove | null,
): ReviewBoardComparison | null {
  if (
    !analysis
    || !move
    || !analysis.recommendation
    || (analysis.quality !== "questionable" && analysis.quality !== "mistake")
  ) return null;

  return {
    actual: { from: move.from, to: move.to },
    recommended: {
      from: analysis.recommendation.from,
      to: analysis.recommendation.to,
    },
  };
}

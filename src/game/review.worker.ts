import type { ChessPiece, RecordedMove } from "../types";
import { analyzeRecordedMove } from "./review";

interface ReviewWorkerRequest {
  piecesBefore: ChessPiece[];
  move: RecordedMove;
  depth: number;
}

self.onmessage = (event: MessageEvent<ReviewWorkerRequest>) => {
  const { piecesBefore, move, depth } = event.data;
  self.postMessage(analyzeRecordedMove(piecesBefore, move, depth));
};

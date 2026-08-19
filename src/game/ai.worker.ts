import type { ChessPiece, PieceColor } from "../types";
import { searchBestMove } from "./ai";

interface AiWorkerRequest {
  pieces: ChessPiece[];
  color: PieceColor;
  maxDepth: number;
  timeLimit: number;
}

self.onmessage = (event: MessageEvent<AiWorkerRequest>) => {
  const { pieces, color, maxDepth, timeLimit } = event.data;
  self.postMessage(searchBestMove(pieces, color, maxDepth, timeLimit));
};

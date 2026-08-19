import type { ChessPiece, PieceColor } from "../types";
import { searchBestMove } from "./ai";
import type { RuleMoveRecord } from "./adjudication";

interface AiWorkerRequest {
  pieces: ChessPiece[];
  color: PieceColor;
  maxDepth: number;
  timeLimit: number;
  positionHistory: string[];
  ruleMoves: RuleMoveRecord[];
}

self.onmessage = (event: MessageEvent<AiWorkerRequest>) => {
  const { pieces, color, maxDepth, timeLimit, positionHistory, ruleMoves } = event.data;
  self.postMessage(searchBestMove(pieces, color, maxDepth, timeLimit, { positionHistory, ruleMoves }));
};

import type { ChessPiece, PieceColor } from "../types";
import { solveEndgame } from "./endgameSolver";

interface EndgameSolverRequest {
  pieces: ChessPiece[];
  attacker: PieceColor;
  maxDepth: number;
  timeLimit: number;
}

self.onmessage = (event: MessageEvent<EndgameSolverRequest>) => {
  const { pieces, attacker, maxDepth, timeLimit } = event.data;
  const result = solveEndgame(
    pieces,
    attacker,
    maxDepth,
    timeLimit,
    (progress) => self.postMessage(progress),
  );
  self.postMessage(result);
};

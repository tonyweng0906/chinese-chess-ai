import type { ChessPiece, PieceColor, PieceType } from "../types";
import { getAllLegalMoves, isInCheck, type Position } from "./rules";
import { getPositionKey } from "./adjudication";

const SOLVER_TIMEOUT = Symbol("endgame-solver-timeout");

const orderingValues: Record<PieceType, number> = {
  general: 100_000,
  rook: 900,
  cannon: 450,
  horse: 400,
  elephant: 200,
  advisor: 200,
  soldier: 120,
};

export interface EndgameSolverMove {
  pieceId: string;
  pieceType: PieceType;
  color: PieceColor;
  from: Position;
  to: Position;
  captured: PieceType | null;
  givesCheck: boolean;
}

export interface EndgameSolverProgress {
  type: "progress";
  depth: number;
  nodes: number;
  elapsedMs: number;
}

export interface EndgameSolverResult {
  type: "result";
  status: "solved" | "not-proven" | "timeout";
  attacker: PieceColor;
  requestedDepth: number;
  completedDepth: number;
  nodes: number;
  elapsedMs: number;
  line: EndgameSolverMove[];
}

interface SolverContext {
  attacker: PieceColor;
  deadline: number;
  startedAt: number;
  nodes: number;
}

interface ProofResult {
  proven: boolean;
  line: EndgameSolverMove[];
}

interface OrderedSolverMove {
  move: EndgameSolverMove;
  nextPieces: ChessPiece[];
  orderScore: number;
}

function opposite(color: PieceColor): PieceColor {
  return color === "red" ? "black" : "red";
}

function applyMove(pieces: ChessPiece[], pieceId: string, to: Position) {
  return pieces
    .filter((piece) => piece.row !== to.row || piece.col !== to.col)
    .map((piece) => piece.id === pieceId ? { ...piece, ...to } : piece);
}

function checkTime(context: SolverContext) {
  context.nodes += 1;
  if ((context.nodes & 255) === 0 && performance.now() >= context.deadline) throw SOLVER_TIMEOUT;
}

function orderMoves(pieces: ChessPiece[], turn: PieceColor, attacker: PieceColor) {
  return getAllLegalMoves(turn, pieces).map(({ piece, move }): OrderedSolverMove => {
    const captured = pieces.find((target) => target.row === move.row && target.col === move.col) ?? null;
    const nextPieces = applyMove(pieces, piece.id, move);
    const givesCheck = isInCheck(opposite(turn), nextPieces);
    const solverMove: EndgameSolverMove = {
      pieceId: piece.id,
      pieceType: piece.type,
      color: piece.color,
      from: { row: piece.row, col: piece.col },
      to: move,
      captured: captured?.type ?? null,
      givesCheck,
    };
    let orderScore = captured ? 10_000 + orderingValues[captured.type] * 10 - orderingValues[piece.type] : 0;
    if (givesCheck) orderScore += 8_000;
    // On the defending turn, examine the most disruptive replies first.  An
    // unproved reply immediately refutes the current forced-win claim.
    if (turn !== attacker && captured) orderScore += 4_000;
    return { move: solverMove, nextPieces, orderScore };
  }).sort((first, second) => second.orderScore - first.orderScore);
}

function proveForcedWin(
  pieces: ChessPiece[],
  turn: PieceColor,
  depthLeft: number,
  path: Set<string>,
  context: SolverContext,
): ProofResult {
  checkTime(context);
  const attackerGeneral = pieces.some((piece) => piece.type === "general" && piece.color === context.attacker);
  const defenderGeneral = pieces.some((piece) => piece.type === "general" && piece.color !== context.attacker);
  if (!attackerGeneral) return { proven: false, line: [] };
  if (!defenderGeneral) return { proven: true, line: [] };

  const moves = orderMoves(pieces, turn, context.attacker);
  if (moves.length === 0) return { proven: turn !== context.attacker, line: [] };
  if (depthLeft <= 0) return { proven: false, line: [] };

  if (turn === context.attacker) {
    for (const candidate of moves) {
      const nextTurn = opposite(turn);
      const nextKey = getPositionKey(candidate.nextPieces, nextTurn);
      if (path.has(nextKey)) continue;
      const nextPath = new Set(path);
      nextPath.add(nextKey);
      const child = proveForcedWin(candidate.nextPieces, nextTurn, depthLeft - 1, nextPath, context);
      if (child.proven) return { proven: true, line: [candidate.move, ...child.line] };
    }
    return { proven: false, line: [] };
  }

  let longestDefense: EndgameSolverMove[] = [];
  for (const candidate of moves) {
    const nextTurn = opposite(turn);
    const nextKey = getPositionKey(candidate.nextPieces, nextTurn);
    if (path.has(nextKey)) return { proven: false, line: [] };
    const nextPath = new Set(path);
    nextPath.add(nextKey);
    const child = proveForcedWin(candidate.nextPieces, nextTurn, depthLeft - 1, nextPath, context);
    if (!child.proven) return { proven: false, line: [] };
    const defenseLine = [candidate.move, ...child.line];
    if (defenseLine.length > longestDefense.length) longestDefense = defenseLine;
  }
  return { proven: true, line: longestDefense };
}

export function solveEndgame(
  pieces: ChessPiece[],
  attacker: PieceColor,
  requestedDepth = 10,
  timeLimit = 15_000,
  onProgress?: (progress: EndgameSolverProgress) => void,
): EndgameSolverResult {
  const startedAt = performance.now();
  const context: SolverContext = {
    attacker,
    deadline: startedAt + Math.max(100, timeLimit),
    startedAt,
    nodes: 0,
  };
  const maxDepth = Math.max(1, Math.floor(requestedDepth));
  let completedDepth = 0;

  try {
    for (let depth = 1; depth <= maxDepth; depth += 1) {
      const rootKey = getPositionKey(pieces, attacker);
      const result = proveForcedWin(pieces, attacker, depth, new Set([rootKey]), context);
      completedDepth = depth;
      onProgress?.({ type: "progress", depth, nodes: context.nodes, elapsedMs: performance.now() - startedAt });
      if (result.proven) {
        return {
          type: "result",
          status: "solved",
          attacker,
          requestedDepth: maxDepth,
          completedDepth,
          nodes: context.nodes,
          elapsedMs: performance.now() - startedAt,
          line: result.line,
        };
      }
    }
  } catch (error) {
    if (error !== SOLVER_TIMEOUT) throw error;
    return {
      type: "result",
      status: "timeout",
      attacker,
      requestedDepth: maxDepth,
      completedDepth,
      nodes: context.nodes,
      elapsedMs: performance.now() - startedAt,
      line: [],
    };
  }

  return {
    type: "result",
    status: "not-proven",
    attacker,
    requestedDepth: maxDepth,
    completedDepth,
    nodes: context.nodes,
    elapsedMs: performance.now() - startedAt,
    line: [],
  };
}

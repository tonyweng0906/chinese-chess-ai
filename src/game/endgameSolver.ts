import type { ChessPiece, PieceColor, PieceType } from "../types";
import { getAllLegalMoves, isInCheck, type Position } from "./rules";
import { getPositionKey } from "./adjudication";
import { searchBestMove } from "./ai";

const SOLVER_TIMEOUT = Symbol("endgame-solver-timeout");
const MAX_MOVE_CACHE = 60_000;
const MAX_NO_WIN_CACHE = 180_000;

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
  cacheHits: number;
  rootKey: string;
  preferredRootMove: string | null;
  moveCache: Map<string, OrderedSolverMove[]>;
  noWinCache: Set<string>;
}

interface ProofResult {
  proven: boolean;
  line: EndgameSolverMove[];
  pathDependent: boolean;
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

function solverPositionKey(pieces: ChessPiece[], turn: PieceColor) {
  const board = pieces
    .map((piece) => `${piece.id}:${piece.color}:${piece.type}:${piece.row}:${piece.col}`)
    .sort()
    .join("|");
  return `${turn}|${board}`;
}

function solverMoveKey(pieceId: string, to: Position) {
  return `${pieceId}:${to.row},${to.col}`;
}

function checkTime(context: SolverContext) {
  context.nodes += 1;
  if ((context.nodes & 255) === 0 && performance.now() >= context.deadline) throw SOLVER_TIMEOUT;
}

function rememberNoWin(context: SolverContext, key: string) {
  if (context.noWinCache.size < MAX_NO_WIN_CACHE) context.noWinCache.add(key);
}

function orderMoves(pieces: ChessPiece[], turn: PieceColor, context: SolverContext) {
  const positionKey = solverPositionKey(pieces, turn);
  const cached = context.moveCache.get(positionKey);
  if (cached) { context.cacheHits += 1; return cached; }
  const ordered = getAllLegalMoves(turn, pieces).map(({ piece, move }): OrderedSolverMove => {
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
    if (turn !== context.attacker && captured) orderScore += 4_000;
    if (positionKey === context.rootKey && solverMoveKey(piece.id, move) === context.preferredRootMove) orderScore += 1_000_000;
    return { move: solverMove, nextPieces, orderScore };
  }).sort((first, second) => second.orderScore - first.orderScore);
  if (context.moveCache.size < MAX_MOVE_CACHE) context.moveCache.set(positionKey, ordered);
  return ordered;
}

function proveForcedWin(
  pieces: ChessPiece[],
  turn: PieceColor,
  depthLeft: number,
  path: Set<string>,
  context: SolverContext,
): ProofResult {
  checkTime(context);
  const cacheKey = `${solverPositionKey(pieces, turn)}|${depthLeft}`;
  if (context.noWinCache.has(cacheKey)) {
    context.cacheHits += 1;
    return { proven: false, line: [], pathDependent: false };
  }
  const attackerGeneral = pieces.some((piece) => piece.type === "general" && piece.color === context.attacker);
  const defenderGeneral = pieces.some((piece) => piece.type === "general" && piece.color !== context.attacker);
  if (!attackerGeneral) return { proven: false, line: [], pathDependent: false };
  if (!defenderGeneral) return { proven: true, line: [], pathDependent: false };

  const moves = orderMoves(pieces, turn, context);
  if (moves.length === 0) return { proven: turn !== context.attacker, line: [], pathDependent: false };
  if (depthLeft <= 0) {
    rememberNoWin(context, cacheKey);
    return { proven: false, line: [], pathDependent: false };
  }

  if (turn === context.attacker) {
    let pathDependent = false;
    for (const candidate of moves) {
      const nextTurn = opposite(turn);
      const nextKey = getPositionKey(candidate.nextPieces, nextTurn);
      if (path.has(nextKey)) { pathDependent = true; continue; }
      const nextPath = new Set(path);
      nextPath.add(nextKey);
      const child = proveForcedWin(candidate.nextPieces, nextTurn, depthLeft - 1, nextPath, context);
      if (child.proven) return { proven: true, line: [candidate.move, ...child.line], pathDependent: false };
      pathDependent ||= child.pathDependent;
    }
    if (!pathDependent) rememberNoWin(context, cacheKey);
    return { proven: false, line: [], pathDependent };
  }

  let longestDefense: EndgameSolverMove[] = [];
  for (const candidate of moves) {
    const nextTurn = opposite(turn);
    const nextKey = getPositionKey(candidate.nextPieces, nextTurn);
    if (path.has(nextKey)) return { proven: false, line: [], pathDependent: true };
    const nextPath = new Set(path);
    nextPath.add(nextKey);
    const child = proveForcedWin(candidate.nextPieces, nextTurn, depthLeft - 1, nextPath, context);
    if (!child.proven) {
      if (!child.pathDependent) rememberNoWin(context, cacheKey);
      return { proven: false, line: [], pathDependent: child.pathDependent };
    }
    const defenseLine = [candidate.move, ...child.line];
    if (defenseLine.length > longestDefense.length) longestDefense = defenseLine;
  }
  return { proven: true, line: longestDefense, pathDependent: false };
}

export function solveEndgame(
  pieces: ChessPiece[],
  attacker: PieceColor,
  requestedDepth = 10,
  timeLimit = 15_000,
  onProgress?: (progress: EndgameSolverProgress) => void,
): EndgameSolverResult {
  const guide = searchBestMove(pieces, attacker, 4, Math.min(900, Math.max(180, timeLimit * 0.08)));
  const startedAt = performance.now();
  const rootKey = solverPositionKey(pieces, attacker);
  const context: SolverContext = {
    attacker,
    deadline: startedAt + Math.max(100, timeLimit),
    startedAt,
    nodes: 0,
    cacheHits: 0,
    rootKey,
    preferredRootMove: guide.choice ? solverMoveKey(guide.choice.piece.id, guide.choice.move) : null,
    moveCache: new Map(),
    noWinCache: new Set(),
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

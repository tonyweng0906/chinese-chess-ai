import { getAllLegalMoves, getPseudoLegalMoves, isInCheck, type Position } from "./rules";
import type { ChessPiece, PieceColor, PieceType } from "../types";
import { adjudicateRepetition, describeMoveForRules, getPositionKey, type RuleMoveRecord } from "./adjudication";

const pieceValues: Record<PieceType, number> = {
  general: 100000,
  rook: 900,
  cannon: 450,
  horse: 400,
  elephant: 200,
  advisor: 200,
  soldier: 100,
};

const MATE_SCORE = 1_000_000;
const MAX_QUIESCENCE_DEPTH = 4;
const TIMEOUT = Symbol("ai-search-timeout");

export interface AiChoice {
  piece: ChessPiece;
  move: Position;
}

export interface AiSearchStats {
  completedDepth: number;
  nodes: number;
  quiescenceNodes: number;
  cacheHits: number;
  cutoffs: number;
  elapsedMs: number;
  timedOut: boolean;
}

export interface AiSearchResult {
  choice: AiChoice | null;
  score: number;
  stats: AiSearchStats;
}

export interface AiSearchHistory {
  positionHistory: string[];
  ruleMoves: RuleMoveRecord[];
}

interface OrderedMove extends AiChoice {
  nextPieces: ChessPiece[];
  captured: ChessPiece | null;
  givesCheck: boolean;
  key: string;
  orderScore: number;
}

interface TranspositionEntry {
  depth: number;
  score: number;
  flag: "exact" | "lower" | "upper";
  bestMoveKey: string | null;
}

interface SearchContext {
  deadline: number;
  nodes: number;
  quiescenceNodes: number;
  cacheHits: number;
  cutoffs: number;
  table: Map<string, TranspositionEntry>;
  killerMoves: Map<number, string[]>;
  historyScores: Map<string, number>;
  positionHistory: string[];
  positionCounts: Map<string, number>;
  ruleMoves: RuleMoveRecord[];
}

function opposite(color: PieceColor): PieceColor {
  return color === "red" ? "black" : "red";
}

export function applyAiMove(pieces: ChessPiece[], pieceId: string, row: number, col: number) {
  return pieces
    .filter((piece) => !(piece.row === row && piece.col === col))
    .map((piece) => piece.id === pieceId ? { ...piece, row, col } : piece);
}

function moveKey(pieceId: string, move: Position) {
  return `${pieceId}:${move.row},${move.col}`;
}

function checkTime(context: SearchContext, quiescence = false) {
  if (quiescence) context.quiescenceNodes += 1;
  else context.nodes += 1;
  if (performance.now() >= context.deadline) throw TIMEOUT;
}

function evaluate(pieces: ChessPiece[], color: PieceColor) {
  const opponent = opposite(color);
  const ownGeneral = pieces.some((piece) => piece.type === "general" && piece.color === color);
  const enemyGeneral = pieces.some((piece) => piece.type === "general" && piece.color === opponent);
  if (!ownGeneral) return -MATE_SCORE;
  if (!enemyGeneral) return MATE_SCORE;

  return pieces.reduce((total, piece) => {
    const crossedBonus = piece.type === "soldier" && (piece.color === "red" ? piece.row <= 4 : piece.row >= 5) ? 45 : 0;
    const value = pieceValues[piece.type] + crossedBonus;
    return total + (piece.color === color ? value : -value);
  }, 0);
}

function rememberKiller(context: SearchContext, ply: number, key: string) {
  const killers = context.killerMoves.get(ply) ?? [];
  if (killers[0] === key) return;
  context.killerMoves.set(ply, [key, ...killers.filter((move) => move !== key)].slice(0, 2));
}

function orderMoves(
  pieces: ChessPiece[],
  turn: PieceColor,
  context: SearchContext,
  ply: number,
  preferredMoveKey: string | null = null,
  includeCheckPriority = true,
  capturesOnly = false,
) {
  const killers = context.killerMoves.get(ply) ?? [];
  const opponent = opposite(turn);
  const legalMoves = capturesOnly
    ? pieces.filter((piece) => piece.color === turn).flatMap((piece) =>
        getPseudoLegalMoves(piece, pieces)
          .filter((move) => pieces.some((target) => target.color !== turn && target.row === move.row && target.col === move.col))
          .filter((move) => !isInCheck(turn, applyAiMove(pieces, piece.id, move.row, move.col)))
          .map((move) => ({ piece, move })))
    : getAllLegalMoves(turn, pieces);
  return legalMoves.flatMap(({ piece, move }): OrderedMove[] => {
    const captured = pieces.find((item) => item.row === move.row && item.col === move.col) ?? null;
    if (capturesOnly && !captured) return [];
    const nextPieces = applyAiMove(pieces, piece.id, move.row, move.col);
    const givesCheck = includeCheckPriority && isInCheck(opponent, nextPieces);
    const key = moveKey(piece.id, move);
    let orderScore = context.historyScores.get(key) ?? 0;
    if (key === preferredMoveKey) orderScore += 2_000_000;
    if (captured) orderScore += 1_000_000 + pieceValues[captured.type] * 16 - pieceValues[piece.type];
    if (givesCheck) orderScore += 500_000;
    const previousOccurrences = context.positionCounts.get(getPositionKey(nextPieces, opponent)) ?? 0;
    if (previousOccurrences === 1) orderScore -= 250_000;
    if (previousOccurrences >= 2) orderScore -= 600_000;
    const killerIndex = killers.indexOf(key);
    if (killerIndex >= 0) orderScore += 200_000 - killerIndex * 10_000;
    if (piece.type === "soldier" && (piece.color === "red" ? move.row <= 4 : move.row >= 5)) orderScore += 2_000;
    return [{ piece, move, nextPieces, captured, givesCheck, key, orderScore }];
  }).sort((a, b) => b.orderScore - a.orderScore);
}

function quiescence(
  pieces: ChessPiece[],
  turn: PieceColor,
  alpha: number,
  beta: number,
  ply: number,
  depthLeft: number,
  context: SearchContext,
): number {
  checkTime(context, true);
  const inCheck = isInCheck(turn, pieces);
  const standPat = evaluate(pieces, turn);
  if (depthLeft <= 0) return standPat;

  const moves = orderMoves(pieces, turn, context, ply, null, false, !inCheck);
  if (inCheck && moves.length === 0) return -MATE_SCORE + ply;
  if (!inCheck) {
    if (standPat >= beta) return beta;
    if (standPat > alpha) alpha = standPat;
  }
  if (moves.length === 0) return alpha;

  for (const candidate of moves) {
    const score = -quiescence(candidate.nextPieces, opposite(turn), -beta, -alpha, ply + 1, depthLeft - 1, context);
    if (score >= beta) { context.cutoffs += 1; return beta; }
    if (score > alpha) alpha = score;
  }
  return alpha;
}

function negamax(
  pieces: ChessPiece[],
  turn: PieceColor,
  depth: number,
  alpha: number,
  beta: number,
  ply: number,
  context: SearchContext,
  lineKeys: string[],
): number {
  checkTime(context);
  const key = getPositionKey(pieces, turn);
  if (lineKeys.includes(key)) return 0;
  const nextLineKeys = [...lineKeys, key];
  if (depth <= 0) return quiescence(pieces, turn, alpha, beta, ply, MAX_QUIESCENCE_DEPTH, context);

  const originalAlpha = alpha;
  const originalBeta = beta;
  const cached = context.table.get(key);
  if (cached && cached.depth >= depth) {
    context.cacheHits += 1;
    if (cached.flag === "exact") return cached.score;
    if (cached.flag === "lower") alpha = Math.max(alpha, cached.score);
    else beta = Math.min(beta, cached.score);
    if (alpha >= beta) return cached.score;
  }

  const moves = orderMoves(pieces, turn, context, ply, cached?.bestMoveKey ?? null, false);
  if (moves.length === 0) return -MATE_SCORE + ply;

  let bestScore = -Infinity;
  let bestMoveKey: string | null = null;
  for (let index = 0; index < moves.length; index += 1) {
    const candidate = moves[index];
    let score: number;
    if (index === 0 || !Number.isFinite(alpha)) {
      score = -negamax(candidate.nextPieces, opposite(turn), depth - 1, -beta, -alpha, ply + 1, context, nextLineKeys);
    } else {
      score = -negamax(candidate.nextPieces, opposite(turn), depth - 1, -alpha - 1, -alpha, ply + 1, context, nextLineKeys);
      if (score > alpha && score < beta) {
        score = -negamax(candidate.nextPieces, opposite(turn), depth - 1, -beta, -alpha, ply + 1, context, nextLineKeys);
      }
    }
    if (score > bestScore) { bestScore = score; bestMoveKey = candidate.key; }
    if (score > alpha) alpha = score;
    if (alpha >= beta) {
      context.cutoffs += 1;
      if (!candidate.captured) {
        rememberKiller(context, ply, candidate.key);
        context.historyScores.set(candidate.key, (context.historyScores.get(candidate.key) ?? 0) + depth * depth);
      }
      break;
    }
  }

  const flag: TranspositionEntry["flag"] = bestScore <= originalAlpha ? "upper" : bestScore >= originalBeta ? "lower" : "exact";
  if (context.table.size < 60_000) context.table.set(key, { depth, score: bestScore, flag, bestMoveKey });
  return bestScore;
}

function searchRoot(pieces: ChessPiece[], color: PieceColor, depth: number, context: SearchContext, preferredMoveKey: string | null) {
  checkTime(context);
  const moves = orderMoves(pieces, color, context, 0, preferredMoveKey);
  if (moves.length === 0) return { choice: null, score: -MATE_SCORE, bestMoveKey: null };
  let alpha = -Infinity;
  const beta = Infinity;
  let best = moves[0];
  let bestScore = -Infinity;
  const rootKey = getPositionKey(pieces, color);
  const hasFreshMove = moves.some((candidate) =>
    (context.positionCounts.get(getPositionKey(candidate.nextPieces, opposite(color))) ?? 0) === 0);
  for (let index = 0; index < moves.length; index += 1) {
    const candidate = moves[index];
    let score: number;
    if (index === 0 || !Number.isFinite(alpha)) {
      score = -negamax(candidate.nextPieces, opposite(color), depth - 1, -beta, -alpha, 1, context, [rootKey]);
    } else {
      score = -negamax(candidate.nextPieces, opposite(color), depth - 1, -alpha - 1, -alpha, 1, context, [rootKey]);
      if (score > alpha && score < beta) {
        score = -negamax(candidate.nextPieces, opposite(color), depth - 1, -beta, -alpha, 1, context, [rootKey]);
      }
    }
    const nextPositionKey = getPositionKey(candidate.nextPieces, opposite(color));
    const previousOccurrences = context.positionCounts.get(nextPositionKey) ?? 0;
    if (previousOccurrences >= 2) {
      const decision = adjudicateRepetition(
        [...context.positionHistory, nextPositionKey],
        [...context.ruleMoves, describeMoveForRules(candidate.piece.id, color, candidate.nextPieces)],
      );
      if (decision?.result === "draw") score = 0;
      if (decision?.result === "loss") score = decision.offender === color ? -MATE_SCORE + 1 : MATE_SCORE - 1;
    } else if (hasFreshMove && previousOccurrences === 1) {
      score -= 35;
    }
    if (score > bestScore) { bestScore = score; best = candidate; }
    if (score > alpha) alpha = score;
  }
  return { choice: { piece: best.piece, move: best.move }, score: bestScore, bestMoveKey: best.key };
}

export function searchBestMove(
  pieces: ChessPiece[],
  color: PieceColor = "black",
  maxDepth = 4,
  timeLimit = 700,
  searchHistory: AiSearchHistory = { positionHistory: [], ruleMoves: [] },
): AiSearchResult {
  const startedAt = performance.now();
  const legalMoves = getAllLegalMoves(color, pieces);
  if (legalMoves.length === 0) {
    return {
      choice: null,
      score: -MATE_SCORE,
      stats: { completedDepth: 0, nodes: 0, quiescenceNodes: 0, cacheHits: 0, cutoffs: 0, elapsedMs: performance.now() - startedAt, timedOut: false },
    };
  }

  const positionCounts = searchHistory.positionHistory.reduce((counts, key) => {
    counts.set(key, (counts.get(key) ?? 0) + 1);
    return counts;
  }, new Map<string, number>());
  const fallback = legalMoves.find(({ piece, move }) => {
    const nextPieces = applyAiMove(pieces, piece.id, move.row, move.col);
    return !positionCounts.has(getPositionKey(nextPieces, opposite(color)));
  }) ?? legalMoves[0];
  const context: SearchContext = {
    deadline: startedAt + Math.max(20, timeLimit),
    nodes: 0,
    quiescenceNodes: 0,
    cacheHits: 0,
    cutoffs: 0,
    table: new Map(),
    killerMoves: new Map(),
    historyScores: new Map(),
    positionHistory: searchHistory.positionHistory,
    positionCounts,
    ruleMoves: searchHistory.ruleMoves,
  };
  let choice: AiChoice = fallback;
  let score = evaluate(applyAiMove(pieces, fallback.piece.id, fallback.move.row, fallback.move.col), color);
  let completedDepth = 0;
  let preferredMoveKey: string | null = null;
  let timedOut = false;

  for (let depth = 1; depth <= Math.max(1, maxDepth); depth += 1) {
    try {
      const iteration = searchRoot(pieces, color, depth, context, preferredMoveKey);
      if (iteration.choice) {
        choice = iteration.choice;
        score = iteration.score;
        preferredMoveKey = iteration.bestMoveKey;
        completedDepth = depth;
      }
    } catch (error) {
      if (error !== TIMEOUT) throw error;
      timedOut = true;
      break;
    }
  }

  return {
    choice,
    score,
    stats: {
      completedDepth,
      nodes: context.nodes,
      quiescenceNodes: context.quiescenceNodes,
      cacheHits: context.cacheHits,
      cutoffs: context.cutoffs,
      elapsedMs: performance.now() - startedAt,
      timedOut,
    },
  };
}

export function chooseBestMove(
  pieces: ChessPiece[],
  color: PieceColor = "black",
  depth = 4,
  timeLimit = 700,
  searchHistory?: AiSearchHistory,
) {
  return searchBestMove(pieces, color, depth, timeLimit, searchHistory).choice;
}

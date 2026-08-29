import { getAllLegalMoves, getPseudoLegalMoves, isInCheck, type Position } from "./rules";
import type { ChessPiece, PieceColor, PieceType, RecordedMove } from "../types";
import { adjudicateRepetition, describeMoveForRules, getPositionKey, type RuleMoveRecord } from "./adjudication";
import { getLearningMoveKey, MAX_LEARNING_BONUS, type LearningMoveHint } from "./learning";
import { getOpeningBookMove, OPENING_BOOK_PLY_LIMIT } from "./openingBook";

const pieceValues: Record<PieceType, number> = {
  general: 100000,
  rook: 900,
  cannon: 450,
  horse: 400,
  elephant: 200,
  advisor: 200,
  soldier: 100,
};

/**
 * The value of a piece is deliberately dynamic.  Rooks become more valuable
 * as the board opens, while cannons lose some of their screen-dependent power.
 * Advanced soldiers also become more important in sparse endgames.
 */
export function getPieceValue(piece: ChessPiece, pieces: ChessPiece[] = []) {
  const nonGenerals = pieces.length > 0
    ? pieces.filter((item) => item.type !== "general").length
    : 32;
  const endgame = nonGenerals <= 6 ? 2 : nonGenerals <= 10 ? 1 : 0;
  const progress = piece.color === "red" ? 9 - piece.row : piece.row;
  const crossed = piece.color === "red" ? piece.row <= 4 : piece.row >= 5;
  switch (piece.type) {
    case "rook": return pieceValues.rook + endgame * 42;
    case "cannon": return pieceValues.cannon - endgame * 28;
    case "soldier": return pieceValues.soldier + endgame * 18 + progress * 2 + (crossed ? 18 + endgame * 8 : 0);
    default: return pieceValues[piece.type];
  }
}

const MATE_SCORE = 1_000_000;
const MAX_QUIESCENCE_DEPTH = 4;
const OPENING_PLY_LIMIT = 20;
const TIMEOUT = Symbol("ai-search-timeout");

export interface AiChoice {
  piece: ChessPiece;
  move: Position;
}

export interface AiCandidate {
  choice: AiChoice;
  score: number;
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
  candidates?: AiCandidate[];
  stats: AiSearchStats;
}

export interface AiSearchHistory {
  positionHistory: string[];
  ruleMoves: RuleMoveRecord[];
  moves?: RecordedMove[];
  learningHints?: LearningMoveHint[];
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
  legalMoveCache: Map<string, AiChoice[]>;
  evaluationCache: Map<string, number>;
  killerMoves: Map<number, string[]>;
  historyScores: Map<string, number>;
  positionHistory: string[];
  positionCounts: Map<string, number>;
  ruleMoves: RuleMoveRecord[];
  recentMoves: RecordedMove[];
  learningBonuses: Map<string, number>;
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

function samePosition(first: Position, second: Position) {
  return first.row === second.row && first.col === second.col;
}

interface EvaluationSignals {
  attackers: Map<string, ChessPiece[]>;
  defenders: Map<string, ChessPiece[]>;
  forks: Map<string, number>;
  skewers: Map<string, number>;
  pinned: Set<string>;
}

function insidePalace(color: PieceColor, row: number, col: number) {
  return row >= (color === "red" ? 7 : 0)
    && row <= (color === "red" ? 9 : 2)
    && col >= 3
    && col <= 5;
}

function pathIsClear(pieces: ChessPiece[], from: ChessPiece, to: Position) {
  const rowStep = Math.sign(to.row - from.row);
  const colStep = Math.sign(to.col - from.col);
  let row = from.row + rowStep;
  let col = from.col + colStep;
  while (row !== to.row || col !== to.col) {
    if (pieces.some((piece) => piece.row === row && piece.col === col)) return false;
    row += rowStep;
    col += colStep;
  }
  return true;
}

/** Attack geometry that also counts an occupied friendly square as defended. */
function attacksSquare(attacker: ChessPiece, target: Position, pieces: ChessPiece[]) {
  const rowDelta = target.row - attacker.row;
  const colDelta = target.col - attacker.col;
  const absRow = Math.abs(rowDelta);
  const absCol = Math.abs(colDelta);
  switch (attacker.type) {
    case "general":
      return absRow + absCol === 1 && insidePalace(attacker.color, target.row, target.col);
    case "advisor":
      return absRow === 1 && absCol === 1 && insidePalace(attacker.color, target.row, target.col);
    case "elephant":
      return absRow === 2 && absCol === 2
        && (attacker.color === "red" ? target.row >= 5 : target.row <= 4)
        && !pieces.some((piece) => piece.row === attacker.row + rowDelta / 2 && piece.col === attacker.col + colDelta / 2);
    case "horse":
      if (!((absRow === 2 && absCol === 1) || (absRow === 1 && absCol === 2))) return false;
      return !pieces.some((piece) => piece.row === attacker.row + (absRow === 2 ? Math.sign(rowDelta) : 0)
        && piece.col === attacker.col + (absCol === 2 ? Math.sign(colDelta) : 0));
    case "rook":
      return (rowDelta === 0 || colDelta === 0) && (rowDelta !== 0 || colDelta !== 0) && pathIsClear(pieces, attacker, target);
    case "cannon": {
      if (!((rowDelta === 0 || colDelta === 0) && (rowDelta !== 0 || colDelta !== 0))) return false;
      const rowStep = Math.sign(rowDelta);
      const colStep = Math.sign(colDelta);
      let row = attacker.row + rowStep;
      let col = attacker.col + colStep;
      let blockers = 0;
      while (row !== target.row || col !== target.col) {
        if (pieces.some((piece) => piece.row === row && piece.col === col)) blockers += 1;
        row += rowStep;
        col += colStep;
      }
      return blockers === 1;
    }
    case "soldier": {
      const forward = attacker.color === "red" ? -1 : 1;
      const crossed = attacker.color === "red" ? attacker.row <= 4 : attacker.row >= 5;
      return rowDelta === forward && colDelta === 0 || crossed && rowDelta === 0 && absCol === 1;
    }
  }
}

function lineSkewerCount(piece: ChessPiece, pieces: ChessPiece[]) {
  if (piece.type !== "rook" && piece.type !== "cannon") return 0;
  const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  let count = 0;
  for (const [rowStep, colStep] of directions) {
    const line: ChessPiece[] = [];
    let row = piece.row + rowStep;
    let col = piece.col + colStep;
    while (row >= 0 && row < 10 && col >= 0 && col < 9) {
      const occupant = pieces.find((item) => item.row === row && item.col === col);
      if (occupant) line.push(occupant);
      row += rowStep;
      col += colStep;
    }
    if (piece.type === "rook") {
      if (line.length >= 2 && line[0].color !== piece.color && line[1].color !== piece.color) count += 1;
    } else if (line.length >= 2 && line[0].color !== piece.color && line[1].color !== piece.color) {
      // A cannon can use the first enemy as a screen to pressure the second.
      count += 1;
    }
  }
  return count;
}

function buildEvaluationSignals(pieces: ChessPiece[]): EvaluationSignals {
  const attackers = new Map<string, ChessPiece[]>();
  const defenders = new Map<string, ChessPiece[]>();
  const forks = new Map<string, number>();
  const skewers = new Map<string, number>();
  const pinned = new Set<string>();
  for (const target of pieces) {
    const enemy: ChessPiece[] = [];
    const friendly: ChessPiece[] = [];
    for (const attacker of pieces) {
      if (attacker.id === target.id || !attacksSquare(attacker, target, pieces)) continue;
      if (attacker.color === target.color) friendly.push(attacker);
      else enemy.push(attacker);
    }
    attackers.set(target.id, enemy);
    defenders.set(target.id, friendly);
  }
  for (const attacker of pieces) {
    const targets = pieces.filter((target) => target.color !== attacker.color && attacksSquare(attacker, target, pieces));
    if (targets.length >= 2) forks.set(attacker.id, targets.length);
    const skewersForPiece = lineSkewerCount(attacker, pieces);
    if (skewersForPiece > 0) skewers.set(attacker.id, skewersForPiece);
  }
  const generals = new Map<PieceColor, ChessPiece>();
  for (const piece of pieces) {
    if (piece.type === "general") generals.set(piece.color, piece);
  }
  for (const piece of pieces) {
    if (piece.type === "general") continue;
    const general = generals.get(piece.color);
    if (!general) continue;
    const aligned = piece.row === general.row || piece.col === general.col;
    if (!aligned) continue;
    const withoutPiece = pieces.filter((item) => item.id !== piece.id);
    if (!isInCheck(piece.color, pieces) && isInCheck(piece.color, withoutPiece)) pinned.add(piece.id);
  }
  return { attackers, defenders, forks, skewers, pinned };
}

function isPieceUnderAttack(pieces: ChessPiece[], piece: ChessPiece) {
  return pieces.some((attacker) => attacker.color !== piece.color && attacksSquare(attacker, piece, pieces));
}

export function getRecentMovePenalty(
  pieces: ChessPiece[],
  candidate: AiChoice,
  color: PieceColor,
  recentMoves: RecordedMove[] = [],
) {
  const ownMoves = recentMoves.filter((move) => move.mover === color);
  const lastOwnMove = ownMoves.at(-1);
  const pieceMoves = ownMoves.filter((move) => move.pieceId === candidate.piece.id);
  const lastPieceMove = pieceMoves.at(-1);
  if (!lastPieceMove || !samePosition(lastPieceMove.to, candidate.piece)) return 0;

  const pieceMoveIndex = ownMoves.lastIndexOf(lastPieceMove);
  const ownMovesSincePieceMoved = ownMoves.length - pieceMoveIndex - 1;
  const returnsImmediately = samePosition(lastPieceMove.from, candidate.move);
  const opening = recentMoves.length < OPENING_PLY_LIMIT && pieces.length >= 26;
  const continuesWithSamePiece = lastOwnMove?.pieceId === candidate.piece.id && opening;
  const isRecentReturn = returnsImmediately && ownMovesSincePieceMoved <= 2;
  if (!continuesWithSamePiece && !isRecentReturn) return 0;

  const captured = pieces.some((piece) => piece.color !== color && samePosition(piece, candidate.move));
  const nextPieces = applyAiMove(pieces, candidate.piece.id, candidate.move.row, candidate.move.col);
  const givesCheck = isInCheck(opposite(color), nextPieces);
  if (captured || givesCheck || isInCheck(color, pieces) || isPieceUnderAttack(pieces, candidate.piece)) return 0;

  const previousPieceMove = pieceMoves.at(-2);
  const continuesShuttle = Boolean(
    returnsImmediately
    && previousPieceMove
    && samePosition(previousPieceMove.from, candidate.piece)
    && samePosition(previousPieceMove.to, candidate.move)
  );
  if (isRecentReturn) return continuesShuttle ? 140 : ownMovesSincePieceMoved === 0 ? 65 : 45;

  if (!opening || lastOwnMove?.pieceId !== candidate.piece.id || lastOwnMove.capturedPiece || lastOwnMove.gaveCheck) return 0;
  const previousOwnMove = ownMoves.at(-2);
  const movedSamePieceTwice = previousOwnMove?.pieceId === candidate.piece.id;
  const movesBackward = color === "red" ? candidate.move.row > candidate.piece.row : candidate.move.row < candidate.piece.row;
  return (movedSamePieceTwice ? 100 : 55) + (movesBackward ? 25 : 0);
}

function checkTime(context: SearchContext, quiescence = false) {
  if (quiescence) context.quiescenceNodes += 1;
  else context.nodes += 1;
  const visited = context.nodes + context.quiescenceNodes;
  if ((visited & 31) !== 0) return;
  if (performance.now() >= context.deadline) throw TIMEOUT;
}

function getCachedLegalMoves(pieces: ChessPiece[], turn: PieceColor, context: SearchContext) {
  const key = getPositionKey(pieces, turn);
  const cached = context.legalMoveCache.get(key);
  if (cached) return cached;
  const legalMoves = getAllLegalMoves(turn, pieces);
  if (context.legalMoveCache.size < 60_000) context.legalMoveCache.set(key, legalMoves);
  return legalMoves;
}

function evaluateCached(pieces: ChessPiece[], color: PieceColor, context: SearchContext) {
  const key = getPositionKey(pieces, color);
  const cached = context.evaluationCache.get(key);
  if (cached !== undefined) return cached;
  const score = evaluate(pieces, color);
  if (context.evaluationCache.size < 80_000) context.evaluationCache.set(key, score);
  return score;
}

function strategicPieceBonus(piece: ChessPiece, pieces: ChessPiece[], enemyGeneral: ChessPiece | undefined) {
  const homeRow = piece.color === "red" ? 9 : 0;
  const progress = piece.color === "red" ? 9 - piece.row : piece.row;
  const center = 4 - Math.abs(piece.col - 4);
  const developed = piece.row !== homeRow;
  let moves: Position[] = [];
  if (piece.type === "rook" || piece.type === "horse" || piece.type === "cannon") {
    moves = getPseudoLegalMoves(piece, pieces);
  }

  let bonus = 0;
  switch (piece.type) {
    case "rook":
      bonus += moves.length * 1.5;
      if (developed) bonus += 10;
      if (progress >= 5) bonus += 10;
      break;
    case "horse":
      bonus += moves.length * 3.5 + center * 5 + progress * 2;
      if (developed) bonus += 16;
      if (piece.col === 0 || piece.col === 8) bonus -= 10;
      break;
    case "cannon":
      bonus += moves.length * 1.25 + center * 4 + progress * 1.5;
      if (piece.col === 4) bonus += 8;
      break;
    case "soldier": {
      const crossed = piece.color === "red" ? piece.row <= 4 : piece.row >= 5;
      bonus += progress * 5 + center * 1.5;
      if (crossed) bonus += 45;
      break;
    }
    case "general":
      if (progress > 0) bonus -= 6;
      break;
    case "advisor":
    case "elephant":
      bonus += center;
      break;
  }

  if (enemyGeneral && moves.length > 0) {
    const pressure = moves.reduce((total, move) => {
      const distance = Math.abs(move.row - enemyGeneral.row) + Math.abs(move.col - enemyGeneral.col);
      if (distance === 0) return total + 16;
      if (distance <= 2) return total + 3;
      return total;
    }, 0);
    bonus += Math.min(18, pressure);
  }
  return bonus;
}

function tacticalPieceBonus(piece: ChessPiece, pieces: ChessPiece[], signals: EvaluationSignals) {
  const attackers = signals.attackers.get(piece.id) ?? [];
  const defenders = signals.defenders.get(piece.id) ?? [];
  const value = getPieceValue(piece, pieces);
  let bonus = 0;
  if (piece.type !== "general") {
    if (attackers.length === 0) {
      bonus += Math.min(18, defenders.length * 6);
    } else if (defenders.length === 0) {
      // An attacked and undefended piece is a likely hanging piece.  Scale the
      // penalty by its value so losing a rook is treated more seriously than a pawn.
      bonus -= Math.min(115, Math.round(value * 0.2));
      if (attackers.some((attacker) => getPieceValue(attacker, pieces) < value)) bonus -= 24;
    } else if (attackers.length > defenders.length) {
      bonus -= Math.min(54, 12 + (attackers.length - defenders.length) * 14);
    } else {
      bonus += Math.min(16, defenders.length * 5);
    }
  }
  if (signals.pinned.has(piece.id)) bonus -= piece.type === "general" ? 0 : 30;
  const forkTargets = signals.forks.get(piece.id) ?? 0;
  if (forkTargets >= 2) bonus += Math.min(72, 26 + (forkTargets - 2) * 18);
  const skewerTargets = signals.skewers.get(piece.id) ?? 0;
  if (skewerTargets > 0) bonus += Math.min(48, skewerTargets * 24);
  return bonus;
}

function generalSafetyBonus(pieces: ChessPiece[], color: PieceColor, signals: EvaluationSignals) {
  const general = pieces.find((piece) => piece.type === "general" && piece.color === color);
  if (!general) return -MATE_SCORE;
  const defenders = signals.defenders.get(general.id)?.length ?? 0;
  const attackers = signals.attackers.get(general.id)?.length ?? 0;
  const guards = pieces.filter((piece) => piece.color === color && (piece.type === "advisor" || piece.type === "elephant")).length;
  let bonus = Math.min(24, defenders * 8) + Math.min(18, guards * 6);
  if (attackers > 0 || isInCheck(color, pieces)) bonus -= 220 + Math.min(60, attackers * 16);
  else if (defenders === 0) bonus -= 16;
  return bonus;
}

function evaluateSide(pieces: ChessPiece[], color: PieceColor, signals: EvaluationSignals) {
  const enemyGeneral = pieces.find((piece) => piece.type === "general" && piece.color !== color);
  return pieces
    .filter((piece) => piece.color === color)
    .reduce((total, piece) => total
      + getPieceValue(piece, pieces)
      + strategicPieceBonus(piece, pieces, enemyGeneral)
      + tacticalPieceBonus(piece, pieces, signals), generalSafetyBonus(pieces, color, signals));
}

function evaluate(pieces: ChessPiece[], color: PieceColor) {
  const opponent = opposite(color);
  const ownGeneral = pieces.some((piece) => piece.type === "general" && piece.color === color);
  const enemyGeneral = pieces.some((piece) => piece.type === "general" && piece.color === opponent);
  if (!ownGeneral) return -MATE_SCORE;
  if (!enemyGeneral) return MATE_SCORE;
  const signals = buildEvaluationSignals(pieces);
  return evaluateSide(pieces, color, signals) - evaluateSide(pieces, opponent, signals);
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
    : getCachedLegalMoves(pieces, turn, context);
  return legalMoves.flatMap(({ piece, move }): OrderedMove[] => {
    const captured = pieces.find((item) => item.row === move.row && item.col === move.col) ?? null;
    if (capturesOnly && !captured) return [];
    const nextPieces = applyAiMove(pieces, piece.id, move.row, move.col);
    const givesCheck = includeCheckPriority && isInCheck(opponent, nextPieces);
    const key = moveKey(piece.id, move);
    let orderScore = context.historyScores.get(key) ?? 0;
    if (key === preferredMoveKey) orderScore += 2_000_000;
    if (captured) orderScore += 1_000_000 + getPieceValue(captured, pieces) * 16 - getPieceValue(piece, pieces);
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
  const standPat = evaluateCached(pieces, turn, context);
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
  if (moves.length === 0) return { choice: null, score: -MATE_SCORE, bestMoveKey: null, candidates: [] };
  let alpha = -Infinity;
  const beta = Infinity;
  let best = moves[0];
  let bestScore = -Infinity;
  const candidates: AiCandidate[] = [];
  const rootKey = getPositionKey(pieces, color);
  const canUseLearning = !isInCheck(color, pieces)
    && !moves.some((candidate) => candidate.captured || candidate.givesCheck);
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
    score -= getRecentMovePenalty(pieces, candidate, color, context.recentMoves);
    if (canUseLearning) {
      const learningKey = getLearningMoveKey(candidate.piece.type, candidate.piece, candidate.move);
      score += context.learningBonuses.get(learningKey) ?? 0;
    }
    candidates.push({ choice: { piece: candidate.piece, move: candidate.move }, score });
    if (score > bestScore) { bestScore = score; best = candidate; }
    if (score > alpha) alpha = score;
  }
  candidates.sort((first, second) => second.score - first.score);
  return { choice: { piece: best.piece, move: best.move }, score: bestScore, bestMoveKey: best.key, candidates };
}

export function searchBestMove(
  pieces: ChessPiece[],
  color: PieceColor = "black",
  maxDepth = 4,
  timeLimit = 700,
  searchHistory: AiSearchHistory = { positionHistory: [], ruleMoves: [], moves: [], learningHints: [] },
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
  const learningBonuses = new Map((searchHistory.learningHints ?? []).map((hint) => [
    hint.moveKey,
    Math.max(-MAX_LEARNING_BONUS, Math.min(MAX_LEARNING_BONUS, hint.bonus)),
  ]));
  const isFreshMove = ({ piece, move }: AiChoice) => {
    const nextPieces = applyAiMove(pieces, piece.id, move.row, move.col);
    return !positionCounts.has(getPositionKey(nextPieces, opposite(color)));
  };
  const firstFreshMove = legalMoves.find(isFreshMove);
  let fallback = firstFreshMove ?? legalMoves[0];
  if (getRecentMovePenalty(pieces, fallback, color, searchHistory.moves ?? []) > 0) {
    fallback = legalMoves.find((candidate) =>
      (!firstFreshMove || isFreshMove(candidate))
      && getRecentMovePenalty(pieces, candidate, color, searchHistory.moves ?? []) === 0) ?? fallback;
  }
  const fallbackCaptured = pieces.some((piece) => piece.color !== color && samePosition(piece, fallback.move));
  const fallbackBoard = applyAiMove(pieces, fallback.piece.id, fallback.move.row, fallback.move.col);
  const fallbackGivesCheck = isInCheck(opposite(color), fallbackBoard);
  const freshLearningMoves = learningBonuses.size > 0 ? legalMoves.filter(isFreshMove) : [];
  const fallbackCandidates = freshLearningMoves.length > 0 ? freshLearningMoves : legalMoves;
  const movesPlayed = searchHistory.moves?.length ?? 0;
  const openingBookChoice = movesPlayed < OPENING_BOOK_PLY_LIMIT ? getOpeningBookMove(pieces, color) : null;
  const hasFallbackTactic = learningBonuses.size > 0 && fallbackCandidates.some((candidate) => {
    if (pieces.some((piece) => piece.color !== color && samePosition(piece, candidate.move))) return true;
    const nextPieces = applyAiMove(pieces, candidate.piece.id, candidate.move.row, candidate.move.col);
    return isInCheck(opposite(color), nextPieces);
  });
  if (learningBonuses.size > 0 && !hasFallbackTactic && !fallbackCaptured && !fallbackGivesCheck && !isInCheck(color, pieces)) {
    const fallbackBonus = learningBonuses.get(getLearningMoveKey(fallback.piece.type, fallback.piece, fallback.move)) ?? 0;
    const learnedFallback = fallbackCandidates
      .filter((candidate) => (learningBonuses.get(getLearningMoveKey(candidate.piece.type, candidate.piece, candidate.move)) ?? 0) > fallbackBonus)
      .find((candidate) => {
        const captured = pieces.some((piece) => piece.color !== color && samePosition(piece, candidate.move));
        if (captured) return false;
        const nextPieces = applyAiMove(pieces, candidate.piece.id, candidate.move.row, candidate.move.col);
        return !isInCheck(opposite(color), nextPieces);
      });
    if (learnedFallback) fallback = learnedFallback;
  }
  const context: SearchContext = {
    deadline: startedAt + Math.max(20, timeLimit),
    nodes: 0,
    quiescenceNodes: 0,
    cacheHits: 0,
    cutoffs: 0,
    table: new Map(),
    legalMoveCache: new Map(),
    evaluationCache: new Map(),
    killerMoves: new Map(),
    historyScores: new Map(),
    positionHistory: searchHistory.positionHistory,
    positionCounts,
    ruleMoves: searchHistory.ruleMoves,
    recentMoves: searchHistory.moves ?? [],
    learningBonuses,
  };
  let choice: AiChoice = openingBookChoice ?? fallback;
  let score = evaluate(applyAiMove(pieces, fallback.piece.id, fallback.move.row, fallback.move.col), color);
  let candidates: AiCandidate[] = [{ choice: { piece: fallback.piece, move: fallback.move }, score }];
  let completedDepth = 0;
  let preferredMoveKey: string | null = null;
  let timedOut = false;

  for (let depth = 1; depth <= Math.max(1, maxDepth); depth += 1) {
    try {
      const iteration = searchRoot(pieces, color, depth, context, preferredMoveKey);
      if (iteration.choice) {
        choice = iteration.choice;
        score = iteration.score;
        candidates = iteration.candidates;
        preferredMoveKey = iteration.bestMoveKey;
        completedDepth = depth;
      }
    } catch (error) {
      if (error !== TIMEOUT) throw error;
      timedOut = true;
      break;
    }
  }

  if (openingBookChoice) {
    choice = openingBookChoice;
    score = evaluate(applyAiMove(pieces, openingBookChoice.piece.id, openingBookChoice.move.row, openingBookChoice.move.col), color);
    candidates = [
      { choice: openingBookChoice, score },
      ...candidates.filter((candidate) => moveKey(candidate.choice.piece.id, candidate.choice.move) !== moveKey(openingBookChoice.piece.id, openingBookChoice.move)),
    ];
  }

  return {
    choice,
    score,
    candidates,
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

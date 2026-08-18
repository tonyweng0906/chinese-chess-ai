import type { ChessPiece, PieceColor } from "../types";
import { getLegalMoves, isInCheck } from "./rules";

export const NO_CAPTURE_DRAW_LIMIT = 100;

export interface RuleMoveRecord {
  mover: PieceColor;
  gaveCheck: boolean;
  chasingPieceId: string | null;
  chasedPieceIds: string | null;
}

export type RepetitionDecision =
  | { result: "draw"; reason: "repetition" }
  | { result: "loss"; reason: "perpetual-check" | "perpetual-chase"; offender: PieceColor };

export function getPositionKey(pieces: ChessPiece[], turn: PieceColor) {
  const board = pieces
    .map((piece) => `${piece.color[0]}:${piece.type}:${piece.row}:${piece.col}`)
    .sort()
    .join("|");
  return `${turn}|${board}`;
}

function soldierHasCrossedRiver(piece: ChessPiece) {
  return piece.color === "red" ? piece.row <= 4 : piece.row >= 5;
}

export function describeMoveForRules(movedPieceId: string, mover: PieceColor, pieces: ChessPiece[]): RuleMoveRecord {
  const movedPiece = pieces.find((piece) => piece.id === movedPieceId);
  const opponent: PieceColor = mover === "red" ? "black" : "red";
  if (!movedPiece) return { mover, gaveCheck: isInCheck(opponent, pieces), chasingPieceId: null, chasedPieceIds: null };

  const gaveCheck = isInCheck(opponent, pieces);
  if (gaveCheck || movedPiece.type === "general" || movedPiece.type === "soldier") {
    return { mover, gaveCheck, chasingPieceId: null, chasedPieceIds: null };
  }

  const legalTargets = new Set(getLegalMoves(movedPiece, pieces).map((move) => `${move.row},${move.col}`));
  const chased = pieces.filter((target) => {
    if (target.color === mover || target.type === "general") return false;
    if (target.type === "soldier" && !soldierHasCrossedRiver(target)) return false;
    if (!legalTargets.has(`${target.row},${target.col}`)) return false;

    const canExchange = getLegalMoves(target, pieces).some((move) => move.row === movedPiece.row && move.col === movedPiece.col);
    if (canExchange) return false;

    const afterCapture = pieces
      .filter((piece) => piece.id !== target.id)
      .map((piece) => piece.id === movedPiece.id ? { ...piece, row: target.row, col: target.col } : piece);
    return !afterCapture.some((defender) => defender.color === opponent
      && getLegalMoves(defender, afterCapture).some((move) => move.row === target.row && move.col === target.col));
  });

  return {
    mover,
    gaveCheck,
    chasingPieceId: chased.length > 0 ? movedPiece.id : null,
    chasedPieceIds: chased.length > 0 ? chased.map((piece) => piece.id).sort().join("|") : null,
  };
}

type RepetitionBehavior = "check" | "chase" | "neutral";

function classifyBehavior(records: RuleMoveRecord[], color: PieceColor): RepetitionBehavior {
  const moves = records.filter((record) => record.mover === color);
  if (moves.length === 0) return "neutral";
  if (moves.every((record) => record.gaveCheck)) return "check";
  const first = moves[0];
  if (first.chasingPieceId && first.chasedPieceIds && moves.every((record) =>
    record.chasingPieceId === first.chasingPieceId && record.chasedPieceIds === first.chasedPieceIds)) return "chase";
  return "neutral";
}

export function adjudicateRepetition(positionHistory: string[], ruleMoves: RuleMoveRecord[]): RepetitionDecision | null {
  const currentPosition = positionHistory.at(-1);
  if (!currentPosition) return null;
  const occurrences = positionHistory
    .map((position, index) => position === currentPosition ? index : -1)
    .filter((index) => index >= 0);
  if (occurrences.length < 3) return null;

  const cycleStart = occurrences.at(-3) ?? 0;
  const repeatedMoves = ruleMoves.slice(cycleStart);
  const red = classifyBehavior(repeatedMoves, "red");
  const black = classifyBehavior(repeatedMoves, "black");

  if (red === "check" && black !== "check") return { result: "loss", reason: "perpetual-check", offender: "red" };
  if (black === "check" && red !== "check") return { result: "loss", reason: "perpetual-check", offender: "black" };
  if (red === "chase" && black === "neutral") return { result: "loss", reason: "perpetual-chase", offender: "red" };
  if (black === "chase" && red === "neutral") return { result: "loss", reason: "perpetual-chase", offender: "black" };
  return { result: "draw", reason: "repetition" };
}

import type { ChessPiece, PieceColor } from "../types";
import { initialPieces } from "../data/initialPieces";
import { getPositionKey } from "./adjudication";
import { getAllLegalMoves, isInCheck } from "./rules";

export const OPENING_BOOK_PLY_LIMIT = 16;

interface BookMove {
  pieceId: string;
  row: number;
  col: number;
}

interface BookEntry {
  ply: number;
  moves: BookMove[];
}

const openingLines: BookMove[][] = [
  [
    { pieceId: "red-cannon-1", row: 7, col: 4 }, { pieceId: "black-horse-1", row: 2, col: 2 },
    { pieceId: "red-horse-1", row: 7, col: 2 }, { pieceId: "black-cannon-7", row: 2, col: 4 },
    { pieceId: "red-soldier-2", row: 5, col: 2 }, { pieceId: "black-soldier-6", row: 4, col: 6 },
    { pieceId: "red-horse-7", row: 7, col: 6 }, { pieceId: "black-horse-7", row: 2, col: 6 },
    { pieceId: "red-cannon-7", row: 5, col: 7 }, { pieceId: "black-soldier-2", row: 4, col: 2 },
    { pieceId: "red-rook-0", row: 8, col: 0 }, { pieceId: "black-rook-0", row: 1, col: 0 },
    { pieceId: "red-cannon-7", row: 5, col: 5 }, { pieceId: "black-cannon-1", row: 2, col: 3 },
    { pieceId: "red-soldier-4", row: 5, col: 4 }, { pieceId: "black-soldier-4", row: 4, col: 4 },
  ],
  [
    { pieceId: "red-cannon-1", row: 7, col: 4 }, { pieceId: "black-cannon-7", row: 2, col: 4 },
    { pieceId: "red-horse-1", row: 7, col: 2 }, { pieceId: "black-horse-1", row: 2, col: 2 },
    { pieceId: "red-soldier-2", row: 5, col: 2 }, { pieceId: "black-soldier-2", row: 4, col: 2 },
    { pieceId: "red-horse-7", row: 7, col: 6 }, { pieceId: "black-horse-7", row: 2, col: 6 },
    { pieceId: "red-rook-0", row: 8, col: 0 }, { pieceId: "black-rook-0", row: 1, col: 0 },
    { pieceId: "red-cannon-7", row: 5, col: 7 }, { pieceId: "black-soldier-6", row: 4, col: 6 },
    { pieceId: "red-soldier-4", row: 5, col: 4 }, { pieceId: "black-soldier-4", row: 4, col: 4 },
    { pieceId: "red-rook-8", row: 8, col: 8 }, { pieceId: "black-rook-8", row: 1, col: 8 },
  ],
  [
    { pieceId: "red-horse-1", row: 7, col: 2 }, { pieceId: "black-horse-7", row: 2, col: 6 },
    { pieceId: "red-cannon-1", row: 7, col: 4 }, { pieceId: "black-cannon-7", row: 2, col: 4 },
    { pieceId: "red-soldier-2", row: 5, col: 2 }, { pieceId: "black-soldier-6", row: 4, col: 6 },
    { pieceId: "red-horse-7", row: 7, col: 6 }, { pieceId: "black-horse-1", row: 2, col: 2 },
    { pieceId: "red-cannon-7", row: 5, col: 7 }, { pieceId: "black-soldier-2", row: 4, col: 2 },
    { pieceId: "red-rook-0", row: 8, col: 0 }, { pieceId: "black-rook-0", row: 1, col: 0 },
    { pieceId: "red-soldier-4", row: 5, col: 4 }, { pieceId: "black-soldier-4", row: 4, col: 4 },
    { pieceId: "red-cannon-7", row: 5, col: 5 }, { pieceId: "black-cannon-1", row: 2, col: 3 },
  ],
  [
    { pieceId: "red-soldier-2", row: 5, col: 2 }, { pieceId: "black-soldier-6", row: 4, col: 6 },
    { pieceId: "red-horse-1", row: 7, col: 2 }, { pieceId: "black-horse-1", row: 2, col: 2 },
    { pieceId: "red-cannon-1", row: 7, col: 4 }, { pieceId: "black-cannon-7", row: 2, col: 4 },
    { pieceId: "red-horse-7", row: 7, col: 6 }, { pieceId: "black-horse-7", row: 2, col: 6 },
    { pieceId: "red-rook-0", row: 8, col: 0 }, { pieceId: "black-rook-0", row: 1, col: 0 },
    { pieceId: "red-cannon-7", row: 5, col: 7 }, { pieceId: "black-soldier-2", row: 4, col: 2 },
    { pieceId: "red-soldier-4", row: 5, col: 4 }, { pieceId: "black-soldier-4", row: 4, col: 4 },
    { pieceId: "red-cannon-7", row: 5, col: 5 }, { pieceId: "black-cannon-1", row: 2, col: 3 },
  ],
];

function opposite(color: PieceColor): PieceColor {
  return color === "red" ? "black" : "red";
}

function applyBookMove(pieces: ChessPiece[], move: BookMove) {
  return pieces
    .filter((piece) => !(piece.row === move.row && piece.col === move.col))
    .map((piece) => piece.id === move.pieceId ? { ...piece, row: move.row, col: move.col } : piece);
}

function isStandardBoard(pieces: ChessPiece[]) {
  if (pieces.length !== initialPieces.length) return false;
  if (new Set(pieces.map((piece) => piece.id)).size !== initialPieces.length) return false;
  const initialById = new Map(initialPieces.map((piece) => [piece.id, piece]));
  return pieces.every((piece) => {
    const initial = initialById.get(piece.id);
    return Boolean(initial && initial.type === piece.type && initial.color === piece.color);
  });
}

function moveKey(move: BookMove) {
  return `${move.pieceId}:${move.row},${move.col}`;
}

function buildBook() {
  const book = new Map<string, BookEntry>();
  for (const line of openingLines) {
    let pieces = initialPieces.map((piece) => ({ ...piece }));
    let turn: PieceColor = "red";
    for (let ply = 0; ply < Math.min(line.length, OPENING_BOOK_PLY_LIMIT); ply += 1) {
      const move = line[ply];
      const legal = getAllLegalMoves(turn, pieces).some(({ piece, move: target }) => piece.id === move.pieceId && target.row === move.row && target.col === move.col);
      if (!legal) break;
      const key = getPositionKey(pieces, turn);
      const entry = book.get(key) ?? { ply, moves: [] };
      if (!entry.moves.some((candidate) => moveKey(candidate) === moveKey(move))) entry.moves.push(move);
      book.set(key, entry);
      pieces = applyBookMove(pieces, move);
      turn = opposite(turn);
    }
  }
  return book;
}

const openingBook = buildBook();

export function getOpeningBookMove(pieces: ChessPiece[], color: PieceColor) {
  if (!isStandardBoard(pieces) || isInCheck(color, pieces)) return null;
  const entry = openingBook.get(getPositionKey(pieces, color));
  if (!entry || entry.ply >= OPENING_BOOK_PLY_LIMIT) return null;
  const legalMoves = getAllLegalMoves(color, pieces);
  const candidates = entry.moves
    .map((bookMove) => legalMoves.find(({ piece, move }) => piece.id === bookMove.pieceId && move.row === bookMove.row && move.col === bookMove.col))
    .filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate));
  if (candidates.length === 0) return null;
  const selected = candidates[0];
  const captured = pieces.some((target) => target.color !== color && target.row === selected.move.row && target.col === selected.move.col);
  const nextPieces = applyBookMove(pieces, { pieceId: selected.piece.id, row: selected.move.row, col: selected.move.col });
  if (captured || isInCheck(opposite(color), nextPieces)) return null;
  return { piece: selected.piece, move: selected.move };
}

export function getOpeningBookSize() {
  return openingBook.size;
}

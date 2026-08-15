import type { ChessPiece } from "../types";

export interface Position { row: number; col: number }
const inside = (row: number, col: number) => row >= 0 && row < 10 && col >= 0 && col < 9;
const at = (row: number, col: number) => `${row},${col}`;

function inPalace(piece: ChessPiece, row: number, col: number) {
  const rows = piece.color === "red" ? [7, 8, 9] : [0, 1, 2];
  return rows.includes(row) && col >= 3 && col <= 5;
}

function add(moves: Position[], piece: ChessPiece, board: Map<string, ChessPiece>, row: number, col: number) {
  if (!inside(row, col)) return false;
  const occupant = board.get(at(row, col));
  if (!occupant || occupant.color !== piece.color) moves.push({ row, col });
  return !occupant;
}

function slide(piece: ChessPiece, board: Map<string, ChessPiece>, directions: Position[]) {
  const moves: Position[] = [];
  directions.forEach(({ row: dr, col: dc }) => {
    let row = piece.row + dr;
    let col = piece.col + dc;
    while (inside(row, col)) {
      if (!add(moves, piece, board, row, col)) break;
      row += dr;
      col += dc;
    }
  });
  return moves;
}

function cannon(piece: ChessPiece, board: Map<string, ChessPiece>) {
  const moves: Position[] = [];
  [{ row: 1, col: 0 }, { row: -1, col: 0 }, { row: 0, col: 1 }, { row: 0, col: -1 }].forEach(({ row: dr, col: dc }) => {
    let row = piece.row + dr;
    let col = piece.col + dc;
    let jumped = false;
    while (inside(row, col)) {
      const occupant = board.get(at(row, col));
      if (!jumped) {
        if (!occupant) moves.push({ row, col });
        else jumped = true;
      } else if (occupant) {
        if (occupant.color !== piece.color) moves.push({ row, col });
        break;
      }
      row += dr;
      col += dc;
    }
  });
  return moves;
}

export function getPseudoLegalMoves(piece: ChessPiece, pieces: ChessPiece[]): Position[] {
  const board = new Map(pieces.map((item) => [at(item.row, item.col), item]));
  const moves: Position[] = [];
  switch (piece.type) {
    case "general":
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dr, dc]) => {
        if (inPalace(piece, piece.row + dr, piece.col + dc)) add(moves, piece, board, piece.row + dr, piece.col + dc);
      });
      return moves;
    case "advisor":
      [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([dr, dc]) => {
        if (inPalace(piece, piece.row + dr, piece.col + dc)) add(moves, piece, board, piece.row + dr, piece.col + dc);
      });
      return moves;
    case "elephant":
      [[2, 2], [2, -2], [-2, 2], [-2, -2]].forEach(([dr, dc]) => {
        const row = piece.row + dr;
        const col = piece.col + dc;
        const stays = piece.color === "red" ? row >= 5 : row <= 4;
        if (inside(row, col) && stays && !board.has(at(piece.row + dr / 2, piece.col + dc / 2))) add(moves, piece, board, row, col);
      });
      return moves;
    case "horse":
      [[2, 1, 1, 0], [2, -1, 1, 0], [-2, 1, -1, 0], [-2, -1, -1, 0], [1, 2, 0, 1], [1, -2, 0, -1], [-1, 2, 0, 1], [-1, -2, 0, -1]].forEach(([dr, dc, lr, lc]) => {
        if (!board.has(at(piece.row + lr, piece.col + lc))) add(moves, piece, board, piece.row + dr, piece.col + dc);
      });
      return moves;
    case "rook":
      return slide(piece, board, [{ row: 1, col: 0 }, { row: -1, col: 0 }, { row: 0, col: 1 }, { row: 0, col: -1 }]);
    case "cannon":
      return cannon(piece, board);
    case "soldier": {
      const forward = piece.color === "red" ? -1 : 1;
      add(moves, piece, board, piece.row + forward, piece.col);
      const crossed = piece.color === "red" ? piece.row <= 4 : piece.row >= 5;
      if (crossed) {
        add(moves, piece, board, piece.row, piece.col - 1);
        add(moves, piece, board, piece.row, piece.col + 1);
      }
      return moves;
    }
  }
}

function generalsFace(pieces: ChessPiece[]) {
  const red = pieces.find((piece) => piece.type === "general" && piece.color === "red");
  const black = pieces.find((piece) => piece.type === "general" && piece.color === "black");
  if (!red || !black || red.col !== black.col) return false;
  const minRow = Math.min(red.row, black.row);
  const maxRow = Math.max(red.row, black.row);
  return pieces.every((piece) => piece.col !== red.col || piece.row <= minRow || piece.row >= maxRow);
}

export function isInCheck(color: ChessPiece["color"], pieces: ChessPiece[]) {
  const general = pieces.find((piece) => piece.type === "general" && piece.color === color);
  if (!general) return true;
  if (generalsFace(pieces)) return true;
  return pieces.some((piece) => piece.color !== color && getPseudoLegalMoves(piece, pieces).some((move) => move.row === general.row && move.col === general.col));
}

export function getLegalMoves(piece: ChessPiece, pieces: ChessPiece[]): Position[] {
  return getPseudoLegalMoves(piece, pieces).filter((move) => {
    const next = pieces
      .filter((item) => !(item.row === move.row && item.col === move.col))
      .map((item) => item.id === piece.id ? { ...item, ...move } : item);
    return !isInCheck(piece.color, next);
  });
}

export function getAllLegalMoves(color: ChessPiece["color"], pieces: ChessPiece[]) {
  return pieces
    .filter((piece) => piece.color === color)
    .flatMap((piece) => getLegalMoves(piece, pieces).map((move) => ({ piece, move })));
}

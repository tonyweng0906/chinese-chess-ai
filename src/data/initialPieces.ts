import type { ChessPiece, PieceColor, PieceType } from "../types";

const backRank: PieceType[] = [
  "rook",
  "horse",
  "elephant",
  "advisor",
  "general",
  "advisor",
  "elephant",
  "horse",
  "rook",
];

function createSide(color: PieceColor): ChessPiece[] {
  const isBlack = color === "black";
  const homeRow = isBlack ? 0 : 9;
  const cannonRow = isBlack ? 2 : 7;
  const soldierRow = isBlack ? 3 : 6;

  const pieces: ChessPiece[] = backRank.map((type, col) => ({
    id: `${color}-${type}-${col}`,
    type,
    color,
    row: homeRow,
    col,
  }));

  [1, 7].forEach((col) => {
    pieces.push({
      id: `${color}-cannon-${col}`,
      type: "cannon",
      color,
      row: cannonRow,
      col,
    });
  });

  [0, 2, 4, 6, 8].forEach((col) => {
    pieces.push({
      id: `${color}-soldier-${col}`,
      type: "soldier",
      color,
      row: soldierRow,
      col,
    });
  });

  return pieces;
}

export const initialPieces: ChessPiece[] = [
  ...createSide("black"),
  ...createSide("red"),
];

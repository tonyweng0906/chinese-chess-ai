export type PieceColor = "red" | "black";
export type Language = "zh" | "en";
export type PieceStyle = "hanzi" | "symbols";
export type PieceTheme = "wood" | "jade" | "flat";

export type PieceType =
  | "general"
  | "advisor"
  | "elephant"
  | "horse"
  | "rook"
  | "cannon"
  | "soldier";

export interface ChessPiece {
  id: string;
  type: PieceType;
  color: PieceColor;
  row: number;
  col: number;
}

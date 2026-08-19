export type PieceColor = "red" | "black";
export type Language = "zh" | "en" | "ko";
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

export interface RecordedMove {
  id: string;
  mover: PieceColor;
  pieceId: string;
  pieceType: PieceType;
  from: { row: number; col: number };
  to: { row: number; col: number };
  capturedPiece: ChessPiece | null;
  gaveCheck: boolean;
  boardAfter: ChessPiece[];
}

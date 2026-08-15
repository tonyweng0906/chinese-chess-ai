import { initialPieces } from "../data/initialPieces";
import type { ChessPiece, PieceType } from "../types";

const labels: Record<ChessPiece["color"], Record<PieceType, string>> = {
  black: {
    general: "将",
    advisor: "士",
    elephant: "象",
    horse: "马",
    rook: "车",
    cannon: "炮",
    soldier: "卒",
  },
  red: {
    general: "帅",
    advisor: "仕",
    elephant: "相",
    horse: "馬",
    rook: "車",
    cannon: "炮",
    soldier: "兵",
  },
};

const x = (col: number) => 40 + col * 90;
const y = (row: number) => 40 + row * 90;

function BoardLines() {
  return (
    <svg
      className="board-lines"
      viewBox="0 0 800 890"
      aria-hidden="true"
      preserveAspectRatio="xMidYMid meet"
    >
      <rect x="18" y="18" width="764" height="854" rx="5" className="outer-frame" />
      {Array.from({ length: 10 }, (_, row) => (
        <line key={`row-${row}`} x1="40" y1={y(row)} x2="760" y2={y(row)} />
      ))}
      {[0, 8].map((col) => (
        <line key={`edge-${col}`} x1={x(col)} y1="40" x2={x(col)} y2="850" />
      ))}
      {Array.from({ length: 7 }, (_, index) => index + 1).flatMap((col) => [
        <line key={`top-${col}`} x1={x(col)} y1="40" x2={x(col)} y2="400" />,
        <line key={`bottom-${col}`} x1={x(col)} y1="490" x2={x(col)} y2="850" />,
      ])}
      <line x1="310" y1="40" x2="490" y2="220" />
      <line x1="490" y1="40" x2="310" y2="220" />
      <line x1="310" y1="670" x2="490" y2="850" />
      <line x1="490" y1="670" x2="310" y2="850" />
      <text x="215" y="463" className="river-label">楚 河</text>
      <text x="585" y="463" className="river-label" transform="rotate(180 585 445)">漢 界</text>
    </svg>
  );
}

export function ChessBoard() {
  return (
    <div className="board-shell" aria-label="中国象棋初始棋盘">
      <BoardLines />
      {initialPieces.map((piece) => (
        <button
          className={`piece piece--${piece.color}`}
          key={piece.id}
          type="button"
          style={{
            left: `${(x(piece.col) / 800) * 100}%`,
            top: `${(y(piece.row) / 890) * 100}%`,
          }}
          aria-label={`${piece.color === "red" ? "红方" : "黑方"}${labels[piece.color][piece.type]}`}
        >
          <span>{labels[piece.color][piece.type]}</span>
        </button>
      ))}
    </div>
  );
}

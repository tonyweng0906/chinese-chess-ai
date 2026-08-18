import type { ChessPiece, Language, PieceStyle, PieceTheme, PieceType } from "../types";
import type { DragEvent, MouseEvent } from "react";
import type { Position } from "../game/rules";

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

const englishLabels: Record<PieceType, string> = {
  general: "General", advisor: "Advisor", elephant: "Elephant", horse: "Horse", rook: "Rook", cannon: "Cannon", soldier: "Soldier",
};

const symbols: Record<PieceType, string> = {
  general: "♔", advisor: "◇", elephant: "△", horse: "♞", rook: "♜", cannon: "◉", soldier: "●",
};

function pieceText(piece: ChessPiece, language: Language, style: PieceStyle) {
  return style === "symbols" ? symbols[piece.type] : language === "zh" ? labels[piece.color][piece.type] : piece.type.slice(0, 1).toUpperCase();
}

function pieceName(piece: ChessPiece, language: Language) {
  return language === "zh" ? labels[piece.color][piece.type] : englishLabels[piece.type];
}

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

interface ChessBoardProps {
  pieces: ChessPiece[];
  selectedId: string | null;
  legalMoves: Position[];
  onPieceClick: (piece: ChessPiece) => void;
  onMove: (position: Position) => void;
  language: Language;
  pieceStyle: PieceStyle;
  lastMove: { from: Position; to: Position } | null;
  pieceTheme: PieceTheme;
  customImage: string | null;
  flipped: boolean;
  invalidPieceId: string | null;
  hintPieceIds: Set<string>;
  onInvalidAction: () => void;
  onBoardClick: (event: MouseEvent<HTMLDivElement>) => void;
  onBoardDrop: (event: DragEvent<HTMLDivElement>) => void;
  setupMode: boolean;
}

export function ChessBoard({ pieces, selectedId, legalMoves, onPieceClick, onMove, language, pieceStyle, lastMove, pieceTheme, customImage, flipped, invalidPieceId, hintPieceIds, onInvalidAction, onBoardClick, onBoardDrop, setupMode }: ChessBoardProps) {
  return (
    <div className={`board-shell board-shell--${pieceTheme} ${flipped ? "board-shell--flipped" : ""} ${setupMode ? "board-shell--setup" : ""}`} aria-label="中国象棋初始棋盘" onClick={onBoardClick} onDragOver={(event) => event.preventDefault()} onDrop={onBoardDrop}>
      <BoardLines />
      {lastMove && (
        <svg className="move-trail" viewBox="0 0 800 890" aria-hidden="true">
          <line x1={x(lastMove.from.col)} y1={y(lastMove.from.row)} x2={x(lastMove.to.col)} y2={y(lastMove.to.row)} />
          <circle cx={x(lastMove.from.col)} cy={y(lastMove.from.row)} r="10" className="trail-origin" />
          <circle cx={x(lastMove.to.col)} cy={y(lastMove.to.row)} r="17" className="trail-destination" />
        </svg>
      )}
      {pieces.map((piece) => (
        <button
          className={`piece piece--${piece.color} ${selectedId === piece.id ? "piece--selected" : ""} ${invalidPieceId === piece.id ? "piece--invalid" : ""} ${hintPieceIds.has(piece.id) ? "piece--escape-hint" : ""}`}
          key={piece.id}
          type="button"
          style={{
            left: `${(x(piece.col) / 800) * 100}%`,
            top: `${(y(piece.row) / 890) * 100}%`,
          }}
          aria-label={`${piece.color === "red" ? (language === "zh" ? "红方" : "Red") : (language === "zh" ? "黑方" : "Black")} ${pieceName(piece, language)}`}
          onClick={(event) => { event.stopPropagation(); onPieceClick(piece); }}
          draggable={setupMode}
          onDragStart={(event) => event.dataTransfer.setData("application/x-chess-piece", JSON.stringify({ id: piece.id }))}
        >
          {customImage && <img className="piece-image" src={customImage} alt="" aria-hidden="true" />}
          <span>{pieceText(piece, language, pieceStyle)}</span>
        </button>
      ))}
      {legalMoves.map((position) => {
        const occupied = pieces.some((piece) => piece.row === position.row && piece.col === position.col);
        return (
          <button
            className={`move-target ${occupied ? "move-target--capture" : ""}`}
            key={`${position.row},${position.col}`}
            type="button"
            style={{ left: `${(x(position.col) / 800) * 100}%`, top: `${(y(position.row) / 890) * 100}%` }}
            aria-label={occupied ? "吃子" : "移动到此处"}
            onClick={(event) => { event.stopPropagation(); onMove(position); }}
          />
        );
      })}
    </div>
  );
}

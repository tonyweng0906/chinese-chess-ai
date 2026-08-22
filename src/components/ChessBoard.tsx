import type { ChessPiece, Language, PieceStyle, PieceTheme, PieceType } from "../types";
import { type DragEvent, type MouseEvent } from "react";
import type { Position } from "../game/rules";
import type { ReviewBoardComparison } from "../game/reviewComparison";
import { PieceIcon } from "./PieceIcon";

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
  general: "King", advisor: "Guard", elephant: "Bishop", horse: "Knight", rook: "Rook", cannon: "Cannon", soldier: "Pawn",
};

const englishMarks: Record<PieceType, string> = {
  general: "K", advisor: "G", elephant: "B", horse: "N", rook: "R", cannon: "C", soldier: "P",
};

const koreanLabels: Record<ChessPiece["color"], Record<PieceType, string>> = {
  black: { general: "장", advisor: "사", elephant: "상", horse: "마", rook: "차", cannon: "포", soldier: "졸" },
  red: { general: "장", advisor: "사", elephant: "상", horse: "마", rook: "차", cannon: "포", soldier: "병" },
};

function pieceText(piece: ChessPiece, language: Language) {
  return language === "zh" ? labels[piece.color][piece.type] : language === "ko" ? koreanLabels[piece.color][piece.type] : englishMarks[piece.type];
}

function pieceName(piece: ChessPiece, language: Language) {
  return language === "zh" ? labels[piece.color][piece.type] : language === "ko" ? koreanLabels[piece.color][piece.type] : englishLabels[piece.type];
}

const x = (col: number) => 40 + col * 90;
const y = (row: number) => 40 + row * 90;

function routePath(from: Position, to: Position, offset = 0) {
  const x1 = x(from.col);
  const y1 = y(from.row);
  const x2 = x(to.col);
  const y2 = y(to.row);
  const distance = Math.hypot(x2 - x1, y2 - y1) || 1;
  const directionX = (x2 - x1) / distance;
  const directionY = (y2 - y1) / distance;
  const normalX = -directionY;
  const normalY = directionX;
  const startInset = Math.min(34, distance * 0.24);
  const endInset = Math.min(28, distance * 0.2);
  const startX = x1 + directionX * startInset + normalX * offset;
  const startY = y1 + directionY * startInset + normalY * offset;
  const endX = x2 - directionX * endInset + normalX * offset;
  const endY = y2 - directionY * endInset + normalY * offset;
  return `M ${startX} ${startY} L ${endX} ${endY}`;
}

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
  invalidMoves?: Position[];
  onPieceClick: (piece: ChessPiece) => void;
  onMove: (position: Position) => void;
  onInvalidMove?: (position: Position) => void;
  invalidMoveLabel?: string;
  language: Language;
  pieceStyle: PieceStyle;
  lastMove: { from: Position; to: Position } | null;
  pieceTheme: PieceTheme;
  flipped: boolean;
  hintMove?: { piece: ChessPiece; move: Position } | null;
  invalidPieceId: string | null;
  hintPieceIds: Set<string>;
  onInvalidAction: () => void;
  onBoardClick: (event: MouseEvent<HTMLDivElement>) => void;
  onBoardDrop: (event: DragEvent<HTMLDivElement>) => void;
  setupMode: boolean;
  reviewComparison?: ReviewBoardComparison | null;
  disabled?: boolean;
}

export function ChessBoard({ pieces, selectedId, legalMoves, invalidMoves = [], onPieceClick, onMove, onInvalidMove, invalidMoveLabel = "尝试此步", language, pieceStyle, lastMove, hintMove = null, pieceTheme, flipped, invalidPieceId, hintPieceIds, onInvalidAction, onBoardClick, onBoardDrop, setupMode, reviewComparison = null, disabled = false }: ChessBoardProps) {
  const sharedOrigin = Boolean(
    reviewComparison
    && reviewComparison.actual.from.row === reviewComparison.recommended.from.row
    && reviewComparison.actual.from.col === reviewComparison.recommended.from.col
  );
  const actualRoute = reviewComparison ? routePath(reviewComparison.actual.from, reviewComparison.actual.to, sharedOrigin ? -8 : 0) : "";
  const recommendedRoute = reviewComparison ? routePath(reviewComparison.recommended.from, reviewComparison.recommended.to, sharedOrigin ? 8 : 0) : "";
  return (
    <div className={`board-shell board-shell--${pieceTheme} ${flipped ? "board-shell--flipped" : ""} ${setupMode ? "board-shell--setup" : ""}`} aria-label="中国象棋初始棋盘" onClick={disabled ? undefined : onBoardClick} onDragOver={disabled ? undefined : (event) => event.preventDefault()} onDrop={disabled ? undefined : onBoardDrop}>
      <BoardLines />
      {lastMove && (
        <svg className="move-trail" viewBox="0 0 800 890" aria-hidden="true">
          <line x1={x(lastMove.from.col)} y1={y(lastMove.from.row)} x2={x(lastMove.to.col)} y2={y(lastMove.to.row)} />
          <circle cx={x(lastMove.from.col)} cy={y(lastMove.from.row)} r="10" className="trail-origin" />
          <circle cx={x(lastMove.to.col)} cy={y(lastMove.to.row)} r="17" className="trail-destination" />
        </svg>
      )}
      {hintMove && (
        <svg className="hint-trail" viewBox="0 0 800 890" aria-hidden="true">
          <line x1={x(hintMove.piece.col)} y1={y(hintMove.piece.row)} x2={x(hintMove.move.col)} y2={y(hintMove.move.row)} />
          <circle cx={x(hintMove.piece.col)} cy={y(hintMove.piece.row)} r="10" className="hint-origin" />
          <circle cx={x(hintMove.move.col)} cy={y(hintMove.move.row)} r="16" className="hint-destination" />
        </svg>
      )}
      {reviewComparison && (
        <svg className="review-comparison-overlay" viewBox="0 0 800 890" aria-hidden="true">
          <path className="review-route-backdrop" d={actualRoute} />
          <path className="review-route-backdrop" d={recommendedRoute} />
          <path className="review-route review-route--actual" d={actualRoute} />
          <path className="review-route review-route--recommended" d={recommendedRoute} />
          <circle className="review-route-point review-route-point--actual" cx={x(reviewComparison.actual.to.col)} cy={y(reviewComparison.actual.to.row)} r="14" />
          <path className="review-bad-move-cross" d={`M ${x(reviewComparison.actual.to.col) - 6} ${y(reviewComparison.actual.to.row) - 6} L ${x(reviewComparison.actual.to.col) + 6} ${y(reviewComparison.actual.to.row) + 6} M ${x(reviewComparison.actual.to.col) + 6} ${y(reviewComparison.actual.to.row) - 6} L ${x(reviewComparison.actual.to.col) - 6} ${y(reviewComparison.actual.to.row) + 6}`} />
          <circle className="review-route-point review-route-point--recommended" cx={x(reviewComparison.recommended.to.col)} cy={y(reviewComparison.recommended.to.row)} r="14" />
          <circle className="review-recommended-destination" cx={x(reviewComparison.recommended.to.col)} cy={y(reviewComparison.recommended.to.row)} r="4" />
        </svg>
      )}
      {pieces.map((piece) => {
        const isActualPiece = Boolean(reviewComparison && (
          (reviewComparison.actual.from.row === piece.row && reviewComparison.actual.from.col === piece.col)
          || (reviewComparison.actual.to.row === piece.row && reviewComparison.actual.to.col === piece.col)
        ));
        const isRecommendedPiece = reviewComparison?.recommended.from.row === piece.row && reviewComparison.recommended.from.col === piece.col;
        return (
          <button
            className={`piece piece--${piece.color} ${pieceStyle === "symbols" ? "piece--symbols" : ""} ${selectedId === piece.id ? "piece--selected" : ""} ${invalidPieceId === piece.id ? "piece--invalid" : ""} ${hintPieceIds.has(piece.id) ? "piece--escape-hint" : ""} ${hintMove?.piece.id === piece.id ? "piece--hint-source" : ""} ${isActualPiece ? "piece--review-actual" : ""} ${isRecommendedPiece ? "piece--review-recommended" : ""}`}
            key={piece.id}
            type="button"
            disabled={disabled}
            style={{
              left: `${(x(piece.col) / 800) * 100}%`,
              top: `${(y(piece.row) / 890) * 100}%`,
            }}
            aria-label={`${piece.color === "red" ? (language === "zh" ? "红方" : language === "ko" ? "홍" : "Red") : (language === "zh" ? "黑方" : language === "ko" ? "흑" : "Black")} ${pieceName(piece, language)}`}
            onClick={(event) => { event.stopPropagation(); onPieceClick(piece); }}
            draggable={setupMode && !disabled}
            onDragStart={(event) => event.dataTransfer.setData("application/x-chess-piece", JSON.stringify({ id: piece.id }))}
          >
            {pieceStyle === "symbols" ? <PieceIcon type={piece.type} /> : <span>{pieceText(piece, language)}</span>}
          </button>
        );
      })}
      {legalMoves.map((position) => {
        const occupied = pieces.some((piece) => piece.row === position.row && piece.col === position.col);
        return (
          <button
            className={`move-target ${occupied ? "move-target--capture" : ""}`}
            key={`${position.row},${position.col}`}
            type="button"
            disabled={disabled}
            style={{ left: `${(x(position.col) / 800) * 100}%`, top: `${(y(position.row) / 890) * 100}%` }}
            aria-label={occupied ? "吃子" : "移动到此处"}
            onClick={(event) => { event.stopPropagation(); onMove(position); }}
          />
        );
      })}
      {invalidMoves.map((position) => (
        <button
          className="move-target move-target--invalid"
          key={`invalid-${position.row},${position.col}`}
          type="button"
          disabled={disabled}
          style={{ left: `${(x(position.col) / 800) * 100}%`, top: `${(y(position.row) / 890) * 100}%` }}
          aria-label={invalidMoveLabel}
          onClick={(event) => { event.stopPropagation(); onInvalidMove?.(position); }}
        />
      ))}
    </div>
  );
}

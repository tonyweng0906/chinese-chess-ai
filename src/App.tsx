import "./App.css";
import { ChessBoard } from "./components/ChessBoard";
import { useMemo, useState } from "react";
import { getLegalMoves, type Position } from "./game/rules";
import { initialPieces } from "./data/initialPieces";
import type { ChessPiece, PieceColor } from "./types";

function App() {
  const [pieces, setPieces] = useState<ChessPiece[]>(initialPieces);
  const [turn, setTurn] = useState<PieceColor>("red");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedPiece = pieces.find((piece) => piece.id === selectedId) ?? null;
  const legalMoves = useMemo(() => selectedPiece ? getLegalMoves(selectedPiece, pieces) : [], [selectedPiece, pieces]);

  function handlePieceClick(piece: ChessPiece) {
    if (piece.color !== turn) return;
    setSelectedId(piece.id === selectedId ? null : piece.id);
  }

  function handleMove(position: Position) {
    if (!selectedPiece || !legalMoves.some((move) => move.row === position.row && move.col === position.col)) return;
    setPieces((current) => current
      .filter((piece) => !(piece.row === position.row && piece.col === position.col))
      .map((piece) => piece.id === selectedPiece.id ? { ...piece, ...position } : piece));
    setTurn((current) => current === "red" ? "black" : "red");
    setSelectedId(null);
  }

  const turnName = turn === "red" ? "红方" : "黑方";
  const moveCount = 32 - pieces.length;

  return (
    <main className="app">
      <header className="hero">
        <p className="eyebrow">AI CHINESE CHESS</p>
        <h1>弈境</h1>
        <p className="subtitle">方寸棋盘，推演千秋</p>
      </header>

      <section className="game-layout">
        <div className="board-area">
          <div className="player-label player-label--black">
            <span className="player-dot" />
            黑方
          </div>
          <ChessBoard pieces={pieces} selectedId={selectedId} legalMoves={legalMoves} onPieceClick={handlePieceClick} onMove={handleMove} />
          <div className="player-label player-label--red">
            <span className="player-dot" />
            红方
          </div>
        </div>

        <aside className="game-panel">
          <p className="panel-kicker">当前对局</p>
          <h2>{turnName}回合</h2>
          <div className="turn-card">
            <span className={`turn-piece turn-piece--${turn}`}>{turn === "red" ? "帥" : "將"}</span>
            <div>
              <strong>{selectedPiece ? "请选择落点" : "等待落子"}</strong>
              <p>{selectedPiece ? "棋盘上的金色标记是可走位置" : `请选择一枚${turnName}棋子`}</p>
            </div>
          </div>
          <div className="divider" />
          <dl className="game-stats">
            <div><dt>回合</dt><dd>{String(Math.floor(moveCount / 2) + 1).padStart(2, "0")}</dd></div>
            <div><dt>已行棋</dt><dd>{moveCount} 步</dd></div>
            <div><dt>状态</dt><dd>进行中</dd></div>
          </dl>
          <p className="coming-soon">已支持基础走法 · 将军判断将在后续加入</p>
        </aside>
      </section>
    </main>
  );
}

export default App;

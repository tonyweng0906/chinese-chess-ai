import "./App.css";
import { ChessBoard } from "./components/ChessBoard";
import { useMemo, useState } from "react";
import { getAllLegalMoves, getLegalMoves, isInCheck, type Position } from "./game/rules";
import { initialPieces } from "./data/initialPieces";
import type { ChessPiece, PieceColor } from "./types";

function App() {
  const [pieces, setPieces] = useState<ChessPiece[]>(initialPieces);
  const [turn, setTurn] = useState<PieceColor>("red");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [winner, setWinner] = useState<PieceColor | null>(null);
  const [draw, setDraw] = useState(false);
  const [history, setHistory] = useState<ChessPiece[][]>([]);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const selectedPiece = pieces.find((piece) => piece.id === selectedId) ?? null;
  const legalMoves = useMemo(() => selectedPiece ? getLegalMoves(selectedPiece, pieces) : [], [selectedPiece, pieces]);

  function handlePieceClick(piece: ChessPiece) {
    if (winner || draw || piece.color !== turn) return;
    setSelectedId(piece.id === selectedId ? null : piece.id);
  }

  function handleMove(position: Position) {
    if (winner || draw || !selectedPiece || !legalMoves.some((move) => move.row === position.row && move.col === position.col)) return;
    const nextPieces = pieces
      .filter((piece) => !(piece.row === position.row && piece.col === position.col))
      .map((piece) => piece.id === selectedPiece.id ? { ...piece, ...position } : piece);
    setHistory((current) => [...current, pieces]);
    setMoveHistory((current) => [...current, `${turnName}：(${selectedPiece.row},${selectedPiece.col}) → (${position.row},${position.col})`]);
    setPieces(nextPieces);
    const nextTurn = turn === "red" ? "black" : "red";
    const opponentGeneralExists = nextPieces.some((piece) => piece.type === "general" && piece.color === nextTurn);
    if (!opponentGeneralExists) setWinner(turn);
    else if (getAllLegalMoves(nextTurn, nextPieces).length === 0) {
      if (isInCheck(nextTurn, nextPieces)) setWinner(turn);
      else setDraw(true);
    }
    setTurn(nextTurn);
    setSelectedId(null);
  }

  function undoMove() {
    const previous = history.at(-1);
    if (!previous || winner) return;
    setPieces(previous);
    setHistory((current) => current.slice(0, -1));
    setMoveHistory((current) => current.slice(0, -1));
    setTurn((current) => current === "red" ? "black" : "red");
    setSelectedId(null);
  }

  function resetGame() {
    setPieces(initialPieces);
    setTurn("red");
    setSelectedId(null);
    setWinner(null);
    setDraw(false);
    setHistory([]);
    setMoveHistory([]);
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
          <h2>{winner ? `${winner === "red" ? "红方" : "黑方"}获胜` : draw ? "和棋" : `${turnName}回合`}</h2>
          <div className="turn-card">
            <span className={`turn-piece turn-piece--${turn}`}>{turn === "red" ? "帥" : "將"}</span>
            <div>
              <strong>{winner || draw ? "对局结束" : selectedPiece ? "请选择落点" : isInCheck(turn, pieces) ? "正在被将军" : "等待落子"}</strong>
              <p>{winner ? "对方已无合法应对" : draw ? "当前局面无合法着法" : selectedPiece ? "棋盘上的金色标记是可走位置" : `请选择一枚${turnName}棋子`}</p>
            </div>
          </div>
          <div className="divider" />
          <dl className="game-stats">
            <div><dt>回合</dt><dd>{String(Math.floor(moveCount / 2) + 1).padStart(2, "0")}</dd></div>
            <div><dt>已行棋</dt><dd>{moveCount} 步</dd></div>
            <div><dt>状态</dt><dd>{winner || draw ? "已结束" : isInCheck(turn, pieces) ? "将军" : "进行中"}</dd></div>
          </dl>
          <button className="reset-button" type="button" onClick={resetGame}>重新开始</button>
          <button className="undo-button" type="button" onClick={undoMove} disabled={history.length === 0 || Boolean(winner) || draw}>悔棋</button>
          <div className="move-log" aria-label="走棋记录">
            <p>走棋记录</p>
            {moveHistory.length === 0 ? <span>暂无记录</span> : moveHistory.slice(-6).map((move, index) => <span key={`${move}-${index}`}>{move}</span>)}
          </div>
          <p className="coming-soon">已支持基础走法与将军限制</p>
        </aside>
      </section>
    </main>
  );
}

export default App;

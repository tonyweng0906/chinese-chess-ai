import "./App.css";
import { ChessBoard } from "./components/ChessBoard";
import { useEffect, useMemo, useState } from "react";
import { getAllLegalMoves, getLegalMoves, isInCheck, type Position } from "./game/rules";
import { initialPieces } from "./data/initialPieces";
import { chooseBestMove } from "./game/ai";
import type { ChessPiece, PieceColor, Language, PieceStyle } from "./types";

const copy = {
  zh: { black: "黑方", red: "红方", current: "当前对局", waiting: "等待落子", choose: "请选择一枚", chooseTarget: "请选择落点", marker: "棋盘上的金色标记是可走位置", check: "正在被将军", finished: "对局结束", captured: "对方已无合法应对", draw: "当前局面无合法着法", turn: "回合", moves: "已行棋", status: "状态", playing: "进行中", checkShort: "将军", ended: "已结束", reset: "重新开始", undo: "悔棋", log: "走棋记录", noLog: "暂无记录", chinese: "汉字棋子", symbols: "图形棋子", language: "语言", redWin: "红方获胜", blackWin: "黑方获胜", drawTitle: "和棋", mode: "模式", local: "双人", ai: "人机", thinking: "AI 思考中..." },
  en: { black: "Black", red: "Red", current: "Game", waiting: "Your move", choose: "Select a", chooseTarget: "Choose a destination", marker: "Gold marks show legal moves", check: "In check", finished: "Game over", captured: "No legal response", draw: "No legal moves available", turn: "Turn", moves: "Moves", status: "Status", playing: "Playing", checkShort: "Check", ended: "Ended", reset: "Restart", undo: "Undo", log: "Move history", noLog: "No moves yet", chinese: "Chinese", symbols: "Symbols", language: "Language", redWin: "Red wins", blackWin: "Black wins", drawTitle: "Draw", mode: "Mode", local: "Two players", ai: "vs AI", thinking: "AI is thinking..." },
} as const;

function symbolsForTurn(turn: PieceColor) {
  return turn === "red" ? "♔" : "♚";
}

function App() {
  const [pieces, setPieces] = useState<ChessPiece[]>(initialPieces);
  const [turn, setTurn] = useState<PieceColor>("red");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [winner, setWinner] = useState<PieceColor | null>(null);
  const [draw, setDraw] = useState(false);
  const [language, setLanguage] = useState<Language>("zh");
  const [pieceStyle, setPieceStyle] = useState<PieceStyle>("hanzi");
  const [mode, setMode] = useState<"local" | "ai">("local");
  const [aiThinking, setAiThinking] = useState(false);
  const [lastMove, setLastMove] = useState<{ from: Position; to: Position } | null>(null);
  const t = copy[language];
  const [history, setHistory] = useState<ChessPiece[][]>([]);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const selectedPiece = pieces.find((piece) => piece.id === selectedId) ?? null;
  const legalMoves = useMemo(() => selectedPiece ? getLegalMoves(selectedPiece, pieces) : [], [selectedPiece, pieces]);

  function handlePieceClick(piece: ChessPiece) {
    if (mode === "ai" && piece.color === "black") return;
    if (winner || draw || aiThinking || piece.color !== turn) return;
    setSelectedId(piece.id === selectedId ? null : piece.id);
  }

  function applyMove(piece: ChessPiece, position: Position) {
    const nextPieces = pieces
      .filter((piece) => !(piece.row === position.row && piece.col === position.col))
      .map((item) => item.id === piece.id ? { ...item, ...position } : item);
    setHistory((current) => [...current, pieces]);
    setMoveHistory((current) => [...current, `${turnName}：(${piece.row},${piece.col}) → (${position.row},${position.col})`]);
    setLastMove({ from: { row: piece.row, col: piece.col }, to: position });
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

  function handleMove(position: Position) {
    if (winner || draw || aiThinking || !selectedPiece || !legalMoves.some((move) => move.row === position.row && move.col === position.col)) return;
    applyMove(selectedPiece, position);
  }

  useEffect(() => {
    if (mode !== "ai" || turn !== "black" || winner || draw) return;
    setAiThinking(true);
    const timer = window.setTimeout(() => {
      const choice = chooseBestMove(pieces, "black", 2);
      if (choice) applyMove(choice.piece, choice.move);
      setAiThinking(false);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [mode, turn, pieces, winner, draw]);

  function undoMove() {
    const previous = history.at(-1);
    if (!previous || winner) return;
    setPieces(previous);
    setHistory((current) => current.slice(0, -1));
    setMoveHistory((current) => current.slice(0, -1));
    setTurn((current) => current === "red" ? "black" : "red");
    setSelectedId(null);
    setLastMove(null);
  }

  function resetGame() {
    setPieces(initialPieces);
    setTurn("red");
    setSelectedId(null);
    setWinner(null);
    setDraw(false);
    setAiThinking(false);
    setLastMove(null);
    setHistory([]);
    setMoveHistory([]);
  }

  const turnName = turn === "red" ? t.red : t.black;
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
          <ChessBoard pieces={pieces} selectedId={selectedId} legalMoves={legalMoves} onPieceClick={handlePieceClick} onMove={handleMove} language={language} pieceStyle={pieceStyle} lastMove={lastMove} />
          <div className="player-label player-label--red">
            <span className="player-dot" />
            红方
          </div>
        </div>

        <aside className="game-panel">
          <div className="settings-row">
            <span>{t.mode}</span>
            <button className={mode === "local" ? "is-active" : ""} type="button" onClick={() => setMode("local")}>{t.local}</button>
            <button className={mode === "ai" ? "is-active" : ""} type="button" onClick={() => setMode("ai")}>{t.ai}</button>
          </div>
          <div className="settings-row">
            <span>{t.language}</span>
            <button className={language === "zh" ? "is-active" : ""} type="button" onClick={() => setLanguage("zh")}>中文</button>
            <button className={language === "en" ? "is-active" : ""} type="button" onClick={() => setLanguage("en")}>EN</button>
          </div>
          <div className="settings-row">
            <span>{language === "zh" ? "棋子" : "Pieces"}</span>
            <button className={pieceStyle === "hanzi" ? "is-active" : ""} type="button" onClick={() => setPieceStyle("hanzi")}>{t.chinese}</button>
            <button className={pieceStyle === "symbols" ? "is-active" : ""} type="button" onClick={() => setPieceStyle("symbols")}>{t.symbols}</button>
          </div>
          <p className="panel-kicker">{t.current}</p>
          <h2>{winner ? (winner === "red" ? t.redWin : t.blackWin) : draw ? t.drawTitle : `${turnName} ${t.turn}`}</h2>
          <div className="turn-card">
            <span className={`turn-piece turn-piece--${turn}`}>{pieceStyle === "symbols" ? symbolsForTurn(turn) : turn === "red" ? (language === "zh" ? "帅" : "K") : (language === "zh" ? "将" : "K")}</span>
            <div>
              <strong>{winner || draw ? t.finished : aiThinking ? t.thinking : selectedPiece ? t.chooseTarget : isInCheck(turn, pieces) ? t.check : t.waiting}</strong>
              <p>{winner ? t.captured : draw ? t.draw : selectedPiece ? t.marker : `${t.choose} ${turnName}`}</p>
            </div>
          </div>
          <div className="divider" />
          <dl className="game-stats">
            <div><dt>{t.turn}</dt><dd>{String(Math.floor(moveCount / 2) + 1).padStart(2, "0")}</dd></div>
            <div><dt>{t.moves}</dt><dd>{moveCount}</dd></div>
            <div><dt>{t.status}</dt><dd>{winner || draw ? t.ended : isInCheck(turn, pieces) ? t.checkShort : t.playing}</dd></div>
          </dl>
          <button className="reset-button" type="button" onClick={resetGame}>{t.reset}</button>
          <button className="undo-button" type="button" onClick={undoMove} disabled={history.length === 0 || Boolean(winner) || draw}>{t.undo}</button>
          <div className="move-log" aria-label="走棋记录">
            <p>{t.log}</p>
            {moveHistory.length === 0 ? <span>{t.noLog}</span> : moveHistory.slice(-6).map((move, index) => <span key={`${move}-${index}`}>{move}</span>)}
          </div>
          <p className="coming-soon">已支持基础走法与将军限制</p>
        </aside>
      </section>
    </main>
  );
}

export default App;

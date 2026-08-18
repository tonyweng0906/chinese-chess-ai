import "./App.css";
import { ChessBoard } from "./components/ChessBoard";
import { useEffect, useMemo, useState, type ChangeEvent, type MouseEvent } from "react";
import { getAllLegalMoves, getLegalMoves, getPseudoLegalMoves, isInCheck, type Position } from "./game/rules";
import { initialPieces } from "./data/initialPieces";
import { chooseBestMove } from "./game/ai";
import type { ChessPiece, PieceColor, Language, PieceStyle, PieceTheme, PieceType } from "./types";

const copy = {
  zh: { black: "黑方", red: "红方", current: "当前对局", waiting: "等待落子", choose: "请选择一枚", chooseTarget: "请选择落点", marker: "棋盘上的金色标记是可走位置", check: "正在被将军", finished: "对局结束", captured: "对方已无合法应对", draw: "当前局面无合法着法", turn: "回合", moves: "已行棋", status: "状态", playing: "进行中", checkShort: "将军", ended: "已结束", reset: "重新开始", undo: "悔棋", log: "走棋记录", noLog: "暂无记录", chinese: "汉字棋子", symbols: "图形棋子", language: "语言", redWin: "红方获胜", blackWin: "黑方获胜", drawTitle: "和棋", mode: "模式", local: "双人", ai: "人机", setup: "残局编辑", thinking: "AI 思考中...", difficulty: "难度", easy: "简单", normal: "普通", hard: "困难", player: "玩家", save: "已自动保存", export: "导出棋谱", theme: "棋子主题", wood: "木质", jade: "玉石", flat: "扁平", upload: "上传棋子图片", redSide: "执红", blackSide: "执黑", resetSettings: "重置所有设置", selfCheck: "注意：危险落点会让自己被将军", editorHelp: "选择棋子后点击棋盘放置；点击已有棋子移除" },
  en: { black: "Black", red: "Red", current: "Game", waiting: "Your move", choose: "Select a", chooseTarget: "Choose a destination", marker: "Gold marks show legal moves", check: "In check", finished: "Game over", captured: "No legal response", draw: "No legal moves available", turn: "Turn", moves: "Moves", status: "Status", playing: "Playing", checkShort: "Check", ended: "Ended", reset: "Restart", undo: "Undo", log: "Move history", noLog: "No moves yet", chinese: "Chinese", symbols: "Symbols", language: "Language", redWin: "Red wins", blackWin: "Black wins", drawTitle: "Draw", mode: "Mode", local: "Two players", ai: "vs AI", setup: "Endgame editor", thinking: "AI is thinking...", difficulty: "Difficulty", easy: "Easy", normal: "Normal", hard: "Hard", player: "Player", save: "Auto-saved", export: "Export record", theme: "Piece theme", wood: "Wood", jade: "Jade", flat: "Flat", upload: "Upload piece image", redSide: "Red side", blackSide: "Black side", resetSettings: "Reset all settings", selfCheck: "Warning: this move would expose your general", editorHelp: "Select a piece then click the board to place it; click a piece to remove it" },
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
  const [mode, setMode] = useState<"local" | "ai" | "setup">("local");
  const [aiThinking, setAiThinking] = useState(false);
  const [difficulty, setDifficulty] = useState<"easy" | "normal" | "hard">("normal");
  const [playerColor, setPlayerColor] = useState<PieceColor>("red");
  const [pieceTheme, setPieceTheme] = useState<PieceTheme>("wood");
  const [customImage, setCustomImage] = useState<string | null>(null);
  const [lastMove, setLastMove] = useState<{ from: Position; to: Position } | null>(null);
  const t = copy[language];
  const [history, setHistory] = useState<ChessPiece[][]>([]);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const turnName = turn === "red" ? t.red : t.black;
  const aiColor = playerColor === "red" ? "black" : "red";
  const depth = difficulty === "easy" ? 1 : difficulty === "normal" ? 2 : 3;
  const flipped = mode === "ai" && playerColor === "black";
  const selectedPiece = pieces.find((piece) => piece.id === selectedId) ?? null;
  const legalMoves = useMemo(() => selectedPiece ? getLegalMoves(selectedPiece, pieces) : [], [selectedPiece, pieces]);
  const [invalidPieceId, setInvalidPieceId] = useState<string | null>(null);
  const [invalidNotice, setInvalidNotice] = useState(false);
  const [selfCheckWarning, setSelfCheckWarning] = useState(false);
  const [setupColor, setSetupColor] = useState<PieceColor>("red");
  const [setupType, setSetupType] = useState<PieceType>("general");
  const [invalidAttempts, setInvalidAttempts] = useState(0);
  const checkRestricted = !winner && !draw && isInCheck(turn, pieces);
  const hintPieceIds = useMemo(() => {
    if (invalidAttempts < 3) return new Set<string>();
    return new Set(pieces.filter((piece) => piece.color === turn && getLegalMoves(piece, pieces).length > 0).map((piece) => piece.id));
  }, [invalidAttempts, pieces, turn]);

  const setupNames: Record<PieceType, string> = language === "zh"
    ? { general: "将/帅", advisor: "士/仕", elephant: "象/相", horse: "马/馬", rook: "车/車", cannon: "炮", soldier: "卒/兵" }
    : { general: "General", advisor: "Advisor", elephant: "Elephant", horse: "Horse", rook: "Rook", cannon: "Cannon", soldier: "Soldier" };

  function registerInvalidAction() {
    if (!checkRestricted || winner || draw || aiThinking) return;
    setInvalidNotice(true);
    setInvalidAttempts((current) => current + 1);
  }

  function handlePieceClick(piece: ChessPiece) {
    if (mode === "setup") {
      setPieces((current) => current.filter((item) => item.id !== piece.id));
      return;
    }
    if (winner || draw || aiThinking) return;
    if (mode === "ai" && piece.color === aiColor) { registerInvalidAction(); return; }
    if (piece.color !== turn) { registerInvalidAction(); return; }
    if (isInCheck(turn, pieces) && getLegalMoves(piece, pieces).length === 0) {
      setInvalidPieceId(piece.id);
      setInvalidNotice(true);
      setInvalidAttempts((current) => current + 1);
      window.setTimeout(() => setInvalidPieceId(null), 520);
      return;
    }
    const hasDangerousMoves = getPseudoLegalMoves(piece, pieces).length > getLegalMoves(piece, pieces).length;
    setSelfCheckWarning(hasDangerousMoves);
    setInvalidNotice(false);
    setSelfCheckWarning(false);
    setInvalidPieceId(null);
    setInvalidAttempts(0);
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
    setInvalidPieceId(null);
    setInvalidNotice(false);
    setSelfCheckWarning(false);
    setInvalidAttempts(0);
  }

  function handleMove(position: Position) {
    if (mode === "setup" || winner || draw || aiThinking || !selectedPiece || !legalMoves.some((move) => move.row === position.row && move.col === position.col)) return;
    applyMove(selectedPiece, position);
  }

  function handleBoardClick(event: MouseEvent<HTMLDivElement>) {
    if (mode !== "setup") { registerInvalidAction(); return; }
    const rect = event.currentTarget.getBoundingClientRect();
    const col = Math.round((((event.clientX - rect.left) / rect.width) * 800 - 40) / 90);
    const row = Math.round((((event.clientY - rect.top) / rect.height) * 890 - 40) / 90);
    if (row < 0 || row > 9 || col < 0 || col > 8) return;
    if (pieces.some((piece) => piece.row === row && piece.col === col)) return;
    const limits: Record<PieceType, number> = { general: 1, advisor: 2, elephant: 2, horse: 2, rook: 2, cannon: 2, soldier: 5 };
    if (pieces.filter((piece) => piece.color === setupColor && piece.type === setupType).length >= limits[setupType]) return;
    setPieces((current) => [...current, { id: `setup-${Date.now()}-${Math.random()}`, type: setupType, color: setupColor, row, col }]);
  }

  useEffect(() => {
    if (mode !== "ai" || turn !== aiColor || winner || draw) return;
    setAiThinking(true);
    const timer = window.setTimeout(() => {
      const choice = chooseBestMove(pieces, aiColor, depth);
      if (choice) applyMove(choice.piece, choice.move);
      setAiThinking(false);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [mode, turn, pieces, winner, draw, aiColor, depth]);

  function undoMove() {
    const previous = history.at(-1);
    if (!previous || winner) return;
    setPieces(previous);
    setHistory((current) => current.slice(0, -1));
    setMoveHistory((current) => current.slice(0, -1));
    setTurn((current) => current === "red" ? "black" : "red");
    setSelectedId(null);
    setLastMove(null);
    setInvalidPieceId(null);
    setInvalidNotice(false);
    setInvalidAttempts(0);
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
    setSelfCheckWarning(false);
    setInvalidAttempts(0);
  }

  function resetAllSettings() {
    localStorage.removeItem("chinese-chess-ai-game");
    setLanguage("zh");
    setPieceStyle("hanzi");
    setMode("local");
    setDifficulty("normal");
    setPlayerColor("red");
    setPieceTheme("wood");
    setCustomImage(null);
    resetGame();
  }

  function startAiGame(color: PieceColor) {
    setMode("ai");
    setPlayerColor(color);
    setPieces(initialPieces);
    setTurn("red");
    setSelectedId(null);
    setWinner(null);
    setDraw(false);
    setHistory([]);
    setMoveHistory([]);
    setInvalidAttempts(0);
    setLastMove(null);
    setAiThinking(false);
    setSelfCheckWarning(false);
  }

  function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !["image/png", "image/svg+xml", "image/jpeg"].includes(file.type)) return;
    const reader = new FileReader();
    reader.onload = () => setCustomImage(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  }

  function exportRecord() {
    const body = moveHistory.map((move, index) => `${index + 1}. ${move}`).join("\n");
    const blob = new Blob([`AI Chinese Chess\n\n${body || "No moves"}\n`], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "chinese-chess-record.txt";
    link.click();
    URL.revokeObjectURL(url);
  }

  const moveCount = 32 - pieces.length;

  useEffect(() => {
    const saved = localStorage.getItem("chinese-chess-ai-game");
    if (!saved) return;
    try {
      const data = JSON.parse(saved);
      if (Array.isArray(data.pieces)) setPieces(data.pieces);
      if (data.turn === "red" || data.turn === "black") setTurn(data.turn);
      if (Array.isArray(data.moveHistory)) setMoveHistory(data.moveHistory);
      if (data.language === "zh" || data.language === "en") setLanguage(data.language);
      if (data.pieceStyle === "hanzi" || data.pieceStyle === "symbols") setPieceStyle(data.pieceStyle);
      if (data.mode === "local" || data.mode === "ai" || data.mode === "setup") setMode(data.mode);
      if (["easy", "normal", "hard"].includes(data.difficulty)) setDifficulty(data.difficulty);
      if (data.playerColor === "red" || data.playerColor === "black") setPlayerColor(data.playerColor);
      if (["wood", "jade", "flat"].includes(data.pieceTheme)) setPieceTheme(data.pieceTheme);
      if (typeof data.customImage === "string") setCustomImage(data.customImage);
    } catch { localStorage.removeItem("chinese-chess-ai-game"); }
  }, []);

  useEffect(() => {
    localStorage.setItem("chinese-chess-ai-game", JSON.stringify({ pieces, turn, moveHistory, language, pieceStyle, mode, difficulty, playerColor, pieceTheme, customImage }));
  }, [pieces, turn, moveHistory, language, pieceStyle, mode, difficulty, playerColor, pieceTheme, customImage]);

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
            {flipped ? t.red : t.black}
          </div>
          <ChessBoard pieces={pieces} selectedId={selectedId} legalMoves={legalMoves} onPieceClick={handlePieceClick} onMove={handleMove} language={language} pieceStyle={pieceStyle} lastMove={lastMove} pieceTheme={pieceTheme} customImage={customImage} flipped={flipped} invalidPieceId={invalidPieceId} hintPieceIds={hintPieceIds} onInvalidAction={registerInvalidAction} onBoardClick={handleBoardClick} />
          {(winner || draw) && (
            <div className={`result-banner ${winner ? "result-banner--win" : "result-banner--draw"}`} role="status">
              <span className="result-spark">{winner ? "✦" : "—"}</span>
              <strong>{winner ? (winner === "red" ? t.redWin : t.blackWin) : t.drawTitle}</strong>
              <span>{winner ? t.finished : t.draw}</span>
            </div>
          )}
          <div className="player-label player-label--red">
            <span className="player-dot" />
            {flipped ? t.black : t.red}
          </div>
        </div>

        <aside className="game-panel">
          <div className="settings-row">
            <span>{t.mode}</span>
            <button className={mode === "local" ? "is-active" : ""} type="button" onClick={() => setMode("local")}>{t.local}</button>
            <button className={mode === "ai" ? "is-active" : ""} type="button" onClick={() => startAiGame(playerColor)}>{t.ai}</button>
            <button className={mode === "setup" ? "is-active" : ""} type="button" onClick={() => setMode("setup")}>{t.setup}</button>
          </div>
          {mode === "ai" && <>
            <div className="settings-row">
              <span>{t.difficulty}</span>
              <button className={difficulty === "easy" ? "is-active" : ""} type="button" onClick={() => setDifficulty("easy")}>{t.easy}</button>
              <button className={difficulty === "normal" ? "is-active" : ""} type="button" onClick={() => setDifficulty("normal")}>{t.normal}</button>
              <button className={difficulty === "hard" ? "is-active" : ""} type="button" onClick={() => setDifficulty("hard")}>{t.hard}</button>
            </div>
            <div className="settings-row">
              <span>{t.player}</span>
              <button className={playerColor === "red" ? "is-active" : ""} type="button" onClick={() => startAiGame("red")}>{t.redSide}</button>
              <button className={playerColor === "black" ? "is-active" : ""} type="button" onClick={() => startAiGame("black")}>{t.blackSide}</button>
            </div>
          </>}
          {mode === "setup" && <div className="setup-panel">
            <p className="editor-help">{t.editorHelp}</p>
            <div className="settings-row">
              <span>{t.player}</span>
              <button className={setupColor === "red" ? "is-active" : ""} type="button" onClick={() => setSetupColor("red")}>{t.redSide}</button>
              <button className={setupColor === "black" ? "is-active" : ""} type="button" onClick={() => setSetupColor("black")}>{t.blackSide}</button>
            </div>
            <div className="setup-piece-grid">
              {(Object.keys(setupNames) as PieceType[]).map((type) => <button key={type} className={setupType === type ? "is-active" : ""} type="button" onClick={() => setSetupType(type)}>{setupNames[type]}</button>)}
            </div>
          </div>}
          <div className="settings-row">
            <span>{t.language}</span>
            <button className={language === "zh" ? "is-active" : ""} type="button" onClick={() => setLanguage("zh")}>中文</button>
            <button className={language === "en" ? "is-active" : ""} type="button" onClick={() => setLanguage("en")}>EN</button>
          </div>
          <div className="settings-row">
            <span>{t.theme}</span>
            <button className={pieceTheme === "wood" ? "is-active" : ""} type="button" onClick={() => setPieceTheme("wood")}>{t.wood}</button>
            <button className={pieceTheme === "jade" ? "is-active" : ""} type="button" onClick={() => setPieceTheme("jade")}>{t.jade}</button>
            <button className={pieceTheme === "flat" ? "is-active" : ""} type="button" onClick={() => setPieceTheme("flat")}>{t.flat}</button>
          </div>
          <label className="upload-button">
            {t.upload}
            <input type="file" accept="image/png,image/svg+xml,image/jpeg" onChange={handleImageUpload} />
          </label>
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
              <strong>{winner || draw ? t.finished : invalidAttempts >= 3 ? (language === "zh" ? "可解除将军的棋子已高亮" : "Escape pieces are highlighted") : invalidNotice ? (language === "zh" ? "这枚棋子无法解将" : "This piece cannot answer check") : selfCheckWarning ? t.selfCheck : aiThinking ? t.thinking : selectedPiece ? t.chooseTarget : isInCheck(turn, pieces) ? t.check : t.waiting}</strong>
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
          <button className="export-button" type="button" onClick={exportRecord}>{t.export}</button>
          <button className="settings-reset" type="button" onClick={resetAllSettings}>{t.resetSettings}</button>
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

import "./App.css";
import { ChessBoard } from "./components/ChessBoard";
import { useEffect, useMemo, useState, type DragEvent, type MouseEvent } from "react";
import { getAllLegalMoves, getLegalMoves, getPseudoLegalMoves, isInCheck, type Position } from "./game/rules";
import { initialPieces } from "./data/initialPieces";
import type { AiSearchResult } from "./game/ai";
import { PieceIcon } from "./components/PieceIcon";
import { Tutorial } from "./components/Tutorial";
import { GameReview } from "./components/GameReview";
import { playGameSound, type GameSound } from "./audio/gameSounds";
import { adjudicateRepetition, describeMoveForRules, getPositionKey, NO_CAPTURE_DRAW_LIMIT, type RuleMoveRecord } from "./game/adjudication";
import type { ChessPiece, PieceColor, Language, PieceStyle, PieceTheme, PieceType, RecordedMove } from "./types";

const copy = {
  zh: { black: "黑方", red: "红方", current: "当前对局", waiting: "等待落子", choose: "请选择一枚", chooseTarget: "请选择落点", marker: "棋盘上的金色标记是可走位置", check: "正在被将军", finished: "对局结束", captured: "对方已无合法应对", draw: "当前局面无合法着法", turn: "回合", moves: "已行棋", status: "状态", playing: "进行中", checkShort: "将军", ended: "已结束", reset: "重新开始", undo: "悔棋", log: "走棋记录", noLog: "暂无记录", chinese: "汉字棋子", symbols: "图形棋子", language: "语言", redWin: "红方获胜", blackWin: "黑方获胜", drawTitle: "和棋", mode: "模式", local: "双人", ai: "人机", setup: "残局编辑", thinking: "AI 思考中...", difficulty: "难度", easy: "简单", normal: "普通", hard: "困难", player: "玩家", save: "已自动保存", export: "导出棋谱", theme: "棋子主题", wood: "木质", jade: "玉石", flat: "扁平", upload: "上传棋子图片", redSide: "执红", blackSide: "执黑", resetSettings: "重置所有设置", selfCheck: "注意：危险落点会让自己被将军", editorHelp: "把下方棋子拖到棋盘；拖动已有棋子换位，点击可移除", clearAll: "清空全部棋子", finishSetup: "完成编辑并开始", needsGenerals: "双方都需要一枚将/帅", firstMove: "先行", redFirst: "红方先行", blackFirst: "黑方先行", sound: "棋局音效", soundOn: "开启", soundOff: "关闭", volume: "音量", soundHint: "落子、吃子、将军与将死使用不同声音" },
  en: { black: "Black", red: "Red", current: "Game", waiting: "Your move", choose: "Select a", chooseTarget: "Choose a destination", marker: "Gold marks show legal moves", check: "In check", finished: "Game over", captured: "No legal response", draw: "No legal moves available", turn: "Turn", moves: "Moves", status: "Status", playing: "Playing", checkShort: "Check", ended: "Ended", reset: "Restart", undo: "Undo", log: "Move history", noLog: "No moves yet", chinese: "Chinese", symbols: "Symbols", language: "Language", redWin: "Red wins", blackWin: "Black wins", drawTitle: "Draw", mode: "Mode", local: "Two players", ai: "vs AI", setup: "Endgame editor", thinking: "AI is thinking...", difficulty: "Difficulty", easy: "Easy", normal: "Normal", hard: "Hard", player: "Player", save: "Auto-saved", export: "Export record", theme: "Piece theme", wood: "Wood", jade: "Jade", flat: "Flat", upload: "Upload piece image", redSide: "Red side", blackSide: "Black side", resetSettings: "Reset all settings", selfCheck: "Warning: this move would expose your general", editorHelp: "Drag pieces below onto the board; drag placed pieces to move, click to remove", clearAll: "Clear all pieces", finishSetup: "Finish and play", needsGenerals: "Both sides need a general", firstMove: "First", redFirst: "Red first", blackFirst: "Black first", sound: "Game sound", soundOn: "On", soundOff: "Off", volume: "Volume", soundHint: "Distinct sounds for moves, captures, check, and checkmate" },
} as const;

const ruleCopy = {
  zh: {
    noCapture: "未吃子着数", repeatWarning: "当前局面已重复两次，再次重复将触发规则裁定", noCaptureWarning: "自然限着即将到达，需尽快完成吃子",
    reasons: {
      "general-captured": "将帅被吃，对局结束", checkmate: "将死：被将军方没有合法应对", stalemate: "困毙：无合法着法的一方判负",
      repetition: "同一局面出现三次，双方均无违规，判为和棋", "perpetual-check": "长将违规：连续将军方判负",
      "perpetual-chase": "长捉违规：连续追捉同一无根棋子的一方判负", "no-capture-limit": "连续50回合没有吃子，按自然限着判和",
    },
  },
  en: {
    noCapture: "Moves without capture", repeatWarning: "This position has appeared twice; another repetition triggers adjudication", noCaptureWarning: "The no-capture limit is near; a capture is required",
    reasons: {
      "general-captured": "The general was captured", checkmate: "Checkmate: the checked side has no legal reply", stalemate: "Stalemate: the side with no legal move loses",
      repetition: "The same position occurred three times with no sole offender", "perpetual-check": "Perpetual check: the checking side loses",
      "perpetual-chase": "Perpetual chase: the side repeatedly chasing the same loose piece loses", "no-capture-limit": "No capture for 50 full moves; the game is drawn",
    },
  },
} as const;

type EndReason = keyof typeof ruleCopy.zh.reasons;
const endReasons: EndReason[] = ["general-captured", "checkmate", "stalemate", "repetition", "perpetual-check", "perpetual-chase", "no-capture-limit"];

interface GameSnapshot {
  pieces: ChessPiece[];
  turn: PieceColor;
  moveHistory: string[];
  positionHistory: string[];
  ruleMoves: RuleMoveRecord[];
  noCapturePlyCount: number;
  lastMove: { from: Position; to: Position } | null;
  gameStartPieces: ChessPiece[];
  gameMoves: RecordedMove[];
}

const setupGlyphs: Record<PieceColor, Record<PieceType, string>> = {
  red: { general: "帅", advisor: "仕", elephant: "相", horse: "馬", rook: "車", cannon: "炮", soldier: "兵" },
  black: { general: "将", advisor: "士", elephant: "象", horse: "马", rook: "车", cannon: "炮", soldier: "卒" },
};

const englishBoardMarks: Record<PieceType, string> = { general: "K", advisor: "G", elephant: "B", horse: "N", rook: "R", cannon: "C", soldier: "P" };

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
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundVolume, setSoundVolume] = useState(0.58);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [lastMove, setLastMove] = useState<{ from: Position; to: Position } | null>(null);
  const t = copy[language];
  const rulesText = ruleCopy[language];
  const [history, setHistory] = useState<GameSnapshot[]>([]);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [gameStartPieces, setGameStartPieces] = useState<ChessPiece[]>(initialPieces);
  const [gameMoves, setGameMoves] = useState<RecordedMove[]>([]);
  const [positionHistory, setPositionHistory] = useState<string[]>(() => [getPositionKey(initialPieces, "red")]);
  const [ruleMoves, setRuleMoves] = useState<RuleMoveRecord[]>([]);
  const [noCapturePlyCount, setNoCapturePlyCount] = useState(0);
  const [endReason, setEndReason] = useState<EndReason | null>(null);
  const [saveReady, setSaveReady] = useState(false);
  const turnName = turn === "red" ? t.red : t.black;
  const aiColor = playerColor === "red" ? "black" : "red";
  const depth = difficulty === "easy" ? 2 : difficulty === "normal" ? 4 : 6;
  const aiTimeLimit = difficulty === "easy" ? 120 : difficulty === "normal" ? 400 : 1500;
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
  const currentPositionKey = positionHistory.at(-1);
  const currentPositionOccurrences = currentPositionKey ? positionHistory.filter((position) => position === currentPositionKey).length : 0;
  const ruleWarning = noCapturePlyCount >= 80 ? rulesText.noCaptureWarning : currentPositionOccurrences >= 2 ? rulesText.repeatWarning : null;
  const endReasonText = endReason ? rulesText.reasons[endReason] : null;

  const setupNames: Record<PieceType, string> = language === "zh"
    ? { general: "将/帅", advisor: "士/仕", elephant: "象/相", horse: "马/馬", rook: "车/車", cannon: "炮", soldier: "卒/兵" }
    : { general: "King", advisor: "Guard", elephant: "Bishop", horse: "Knight", rook: "Rook", cannon: "Cannon", soldier: "Pawn" };
  const setupReady = pieces.some((piece) => piece.type === "general" && piece.color === "red") && pieces.some((piece) => piece.type === "general" && piece.color === "black");

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
    const capturedPiece = pieces.find((item) => item.row === position.row && item.col === position.col);
    const nextPieces = pieces
      .filter((piece) => !(piece.row === position.row && piece.col === position.col))
      .map((item) => item.id === piece.id ? { ...item, ...position } : item);
    setHistory((current) => [...current, { pieces, turn, moveHistory, positionHistory, ruleMoves, noCapturePlyCount, lastMove, gameStartPieces, gameMoves }]);
    setMoveHistory((current) => [...current, `${turnName}：(${piece.row},${piece.col}) → (${position.row},${position.col})`]);
    setLastMove({ from: { row: piece.row, col: piece.col }, to: position });
    setPieces(nextPieces);
    const nextTurn = turn === "red" ? "black" : "red";
    const nextNoCapturePlyCount = capturedPiece ? 0 : noCapturePlyCount + 1;
    const nextRuleMoves = [...ruleMoves, describeMoveForRules(piece.id, turn, nextPieces)];
    const nextPositionHistory = [...positionHistory, getPositionKey(nextPieces, nextTurn)];
    setNoCapturePlyCount(nextNoCapturePlyCount);
    setRuleMoves(nextRuleMoves);
    setPositionHistory(nextPositionHistory);
    const opponentGeneralExists = nextPieces.some((piece) => piece.type === "general" && piece.color === nextTurn);
    const opponentInCheck = opponentGeneralExists && isInCheck(nextTurn, nextPieces);
    const opponentHasMoves = opponentGeneralExists && getAllLegalMoves(nextTurn, nextPieces).length > 0;
    const repetitionDecision = adjudicateRepetition(nextPositionHistory, nextRuleMoves);
    const recordedMove: RecordedMove = {
      id: `move-${Date.now()}-${gameMoves.length}`,
      mover: turn,
      pieceId: piece.id,
      pieceType: piece.type,
      from: { row: piece.row, col: piece.col },
      to: position,
      capturedPiece: capturedPiece ?? null,
      gaveCheck: opponentInCheck,
      boardAfter: nextPieces,
    };
    setGameMoves((current) => [...current, recordedMove]);
    let sound: GameSound = capturedPiece ? "capture" : "move";
    if (!opponentGeneralExists) {
      setWinner(turn);
      setEndReason("general-captured");
      sound = "win";
    } else if (!opponentHasMoves) {
      setWinner(turn);
      setEndReason(opponentInCheck ? "checkmate" : "stalemate");
      sound = "win";
    } else if (repetitionDecision) {
      if (repetitionDecision.result === "loss") {
        setWinner(repetitionDecision.offender === "red" ? "black" : "red");
        setEndReason(repetitionDecision.reason);
        sound = "win";
      } else {
        setDraw(true);
        setEndReason(repetitionDecision.reason);
        sound = "draw";
      }
    } else if (nextNoCapturePlyCount >= NO_CAPTURE_DRAW_LIMIT) {
      setDraw(true);
      setEndReason("no-capture-limit");
      sound = "draw";
    } else if (opponentInCheck) {
      sound = "check";
    }
    if (soundEnabled) playGameSound(sound, soundVolume);
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

  function setupPositionAllowed(type: PieceType, color: PieceColor, row: number, col: number) {
    if (type === "general" && (col < 3 || col > 5 || (color === "red" ? row < 7 : row > 2))) return false;
    if (type === "advisor") {
      const valid = color === "red"
        ? [[7, 3], [7, 5], [8, 4], [9, 3], [9, 5]]
        : [[0, 3], [0, 5], [1, 4], [2, 3], [2, 5]];
      if (!valid.some(([validRow, validCol]) => row === validRow && col === validCol)) return false;
    }
    if (type === "elephant") {
      const valid = color === "red"
        ? [[5, 2], [5, 6], [7, 0], [7, 4], [7, 8], [9, 2], [9, 6]]
        : [[0, 2], [0, 6], [2, 0], [2, 4], [2, 8], [4, 2], [4, 6]];
      if (!valid.some(([validRow, validCol]) => row === validRow && col === validCol)) return false;
    }
    if (type === "soldier") {
      if (color === "red" && (row > 6 || (row >= 5 && col % 2 !== 0))) return false;
      if (color === "black" && (row < 3 || (row <= 4 && col % 2 !== 0))) return false;
    }
    return true;
  }

  function placeSetupPiece(type: PieceType, color: PieceColor, row: number, col: number) {
    if (!setupPositionAllowed(type, color, row, col) || pieces.some((piece) => piece.row === row && piece.col === col)) return;
    const limits: Record<PieceType, number> = { general: 1, advisor: 2, elephant: 2, horse: 2, rook: 2, cannon: 2, soldier: 5 };
    if (pieces.filter((piece) => piece.color === color && piece.type === type).length >= limits[type]) return;
    setPieces((current) => [...current, { id: `setup-${Date.now()}-${Math.random()}`, type, color, row, col }]);
  }

  function handleBoardClick(event: MouseEvent<HTMLDivElement>) {
    if (mode !== "setup") { registerInvalidAction(); return; }
    const rect = event.currentTarget.getBoundingClientRect();
    const col = Math.round((((event.clientX - rect.left) / rect.width) * 800 - 40) / 90);
    const row = Math.round((((event.clientY - rect.top) / rect.height) * 890 - 40) / 90);
    if (row < 0 || row > 9 || col < 0 || col > 8) return;
    placeSetupPiece(setupType, setupColor, row, col);
  }

  function handleBoardDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (mode !== "setup") return;
    const rect = event.currentTarget.getBoundingClientRect();
    const col = Math.round((((event.clientX - rect.left) / rect.width) * 800 - 40) / 90);
    const row = Math.round((((event.clientY - rect.top) / rect.height) * 890 - 40) / 90);
    if (row < 0 || row > 9 || col < 0 || col > 8) return;
    try {
      const payload = JSON.parse(event.dataTransfer.getData("application/x-chess-piece"));
      if (payload.id) {
        const moving = pieces.find((piece) => piece.id === payload.id);
        if (!moving || !setupPositionAllowed(moving.type, moving.color, row, col)) return;
        if (pieces.some((piece) => piece.id !== moving.id && piece.row === row && piece.col === col)) return;
        setPieces((current) => current.map((piece) => piece.id === moving.id ? { ...piece, row, col } : piece));
      } else if (payload.type && payload.color) {
        placeSetupPiece(payload.type as PieceType, payload.color as PieceColor, row, col);
      }
    } catch { return; }
  }

  function clearSetupBoard() {
    const clearedPieces: ChessPiece[] = [
      { id: "setup-black-general", type: "general", color: "black", row: 0, col: 4 },
      { id: "setup-red-general", type: "general", color: "red", row: 9, col: 4 },
    ];
    setPieces(clearedPieces);
    setHistory([]);
    setMoveHistory([]);
    setGameStartPieces(clearedPieces);
    setGameMoves([]);
    setPositionHistory([getPositionKey(clearedPieces, turn)]);
    setRuleMoves([]);
    setNoCapturePlyCount(0);
    setEndReason(null);
    setSelectedId(null);
    setWinner(null);
    setDraw(false);
    setLastMove(null);
  }

  function startSetupMode() {
    setMode("setup");
    setPieces((current) => current.filter((piece) => setupPositionAllowed(piece.type, piece.color, piece.row, piece.col)));
    setWinner(null);
    setDraw(false);
    setSelectedId(null);
    setHistory([]);
    setMoveHistory([]);
    setGameMoves([]);
    setPositionHistory([]);
    setRuleMoves([]);
    setNoCapturePlyCount(0);
    setEndReason(null);
    setLastMove(null);
  }

  function finishSetup() {
    if (!setupReady) return;
    setMode("local");
    setSelectedId(null);
    setWinner(null);
    setDraw(false);
    setHistory([]);
    setMoveHistory([]);
    setGameStartPieces(pieces);
    setGameMoves([]);
    setPositionHistory([getPositionKey(pieces, turn)]);
    setRuleMoves([]);
    setNoCapturePlyCount(0);
    setEndReason(null);
    setLastMove(null);
  }

  useEffect(() => {
    if (mode !== "ai" || turn !== aiColor || winner || draw) return;
    setAiThinking(true);
    let worker: Worker | null = null;
    const timer = window.setTimeout(() => {
      worker = new Worker(new URL("./game/ai.worker.ts", import.meta.url), { type: "module" });
      worker.onmessage = (event: MessageEvent<AiSearchResult>) => {
        if (event.data.choice) applyMove(event.data.choice.piece, event.data.choice.move);
        setAiThinking(false);
        worker?.terminate();
      };
      worker.onerror = () => {
        const fallback = getAllLegalMoves(aiColor, pieces)[0];
        if (fallback) applyMove(fallback.piece, fallback.move);
        setAiThinking(false);
        worker?.terminate();
      };
      worker.postMessage({ pieces, color: aiColor, maxDepth: depth, timeLimit: aiTimeLimit });
    }, 350);
    return () => {
      window.clearTimeout(timer);
      worker?.terminate();
    };
  }, [mode, turn, pieces, winner, draw, aiColor, depth, aiTimeLimit]);

  function undoMove() {
    const previous = history.at(-1);
    if (!previous) return;
    setPieces(previous.pieces);
    setHistory((current) => current.slice(0, -1));
    setMoveHistory(previous.moveHistory);
    setPositionHistory(previous.positionHistory);
    setRuleMoves(previous.ruleMoves);
    setNoCapturePlyCount(previous.noCapturePlyCount);
    setGameStartPieces(previous.gameStartPieces);
    setGameMoves(previous.gameMoves);
    setTurn(previous.turn);
    setWinner(null);
    setDraw(false);
    setEndReason(null);
    setSelectedId(null);
    setLastMove(previous.lastMove);
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
    setGameStartPieces(initialPieces);
    setGameMoves([]);
    setPositionHistory([getPositionKey(initialPieces, "red")]);
    setRuleMoves([]);
    setNoCapturePlyCount(0);
    setEndReason(null);
    setSelfCheckWarning(false);
    setInvalidAttempts(0);
  }

  function toggleSound() {
    const nextEnabled = !soundEnabled;
    setSoundEnabled(nextEnabled);
    if (nextEnabled) playGameSound("move", soundVolume);
  }

  function resetAllSettings() {
    localStorage.removeItem("chinese-chess-ai-game");
    setLanguage("zh");
    setPieceStyle("hanzi");
    setMode("local");
    setDifficulty("normal");
    setPlayerColor("red");
    setPieceTheme("wood");
    setSoundEnabled(true);
    setSoundVolume(0.58);
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
    setGameStartPieces(initialPieces);
    setGameMoves([]);
    setPositionHistory([getPositionKey(initialPieces, "red")]);
    setRuleMoves([]);
    setNoCapturePlyCount(0);
    setEndReason(null);
    setInvalidAttempts(0);
    setLastMove(null);
    setAiThinking(false);
    setSelfCheckWarning(false);
  }

  function exportRecord() {
    const body = moveHistory.map((move, index) => `${index + 1}. ${move}`).join("\n");
    const conclusion = endReasonText ? `\n${language === "zh" ? "结束原因" : "Result"}：${endReasonText}\n` : "";
    const blob = new Blob([`AI Chinese Chess\n\n${body || "No moves"}\n${conclusion}`], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "chinese-chess-record.txt";
    link.click();
    URL.revokeObjectURL(url);
  }

  const moveCount = moveHistory.length;

  useEffect(() => {
    const saved = localStorage.getItem("chinese-chess-ai-game");
    if (!saved) { setSaveReady(true); return; }
    try {
      const data = JSON.parse(saved);
      const restoredPieces = Array.isArray(data.pieces) ? data.pieces.filter((piece: ChessPiece) => setupPositionAllowed(piece.type, piece.color, piece.row, piece.col)) : initialPieces;
      const restoredTurn: PieceColor = data.turn === "black" ? "black" : "red";
      setPieces(restoredPieces);
      setTurn(restoredTurn);
      if (Array.isArray(data.moveHistory)) setMoveHistory(data.moveHistory);
      setGameStartPieces(Array.isArray(data.gameStartPieces) ? data.gameStartPieces : restoredPieces);
      if (Array.isArray(data.gameMoves)) setGameMoves(data.gameMoves);
      setPositionHistory(Array.isArray(data.positionHistory) && data.positionHistory.length > 0 ? data.positionHistory : [getPositionKey(restoredPieces, restoredTurn)]);
      if (Array.isArray(data.ruleMoves)) setRuleMoves(data.ruleMoves);
      if (Number.isInteger(data.noCapturePlyCount) && data.noCapturePlyCount >= 0) setNoCapturePlyCount(data.noCapturePlyCount);
      if (data.winner === "red" || data.winner === "black") setWinner(data.winner);
      if (typeof data.draw === "boolean") setDraw(data.draw);
      if (endReasons.includes(data.endReason)) setEndReason(data.endReason);
      if (data.language === "zh" || data.language === "en") setLanguage(data.language);
      if (data.pieceStyle === "hanzi" || data.pieceStyle === "symbols") setPieceStyle(data.pieceStyle);
      if (data.mode === "local" || data.mode === "ai" || data.mode === "setup") setMode(data.mode);
      if (["easy", "normal", "hard"].includes(data.difficulty)) setDifficulty(data.difficulty);
      if (data.playerColor === "red" || data.playerColor === "black") setPlayerColor(data.playerColor);
      if (["wood", "jade", "flat"].includes(data.pieceTheme)) setPieceTheme(data.pieceTheme);
      if (typeof data.soundEnabled === "boolean") setSoundEnabled(data.soundEnabled);
      if (typeof data.soundVolume === "number" && data.soundVolume >= 0 && data.soundVolume <= 1) setSoundVolume(data.soundVolume);
    } catch { localStorage.removeItem("chinese-chess-ai-game"); }
    setSaveReady(true);
  }, []);

  useEffect(() => {
    if (!saveReady) return;
    localStorage.setItem("chinese-chess-ai-game", JSON.stringify({ pieces, turn, moveHistory, gameStartPieces, gameMoves, positionHistory, ruleMoves, noCapturePlyCount, winner, draw, endReason, language, pieceStyle, mode, difficulty, playerColor, pieceTheme, soundEnabled, soundVolume }));
  }, [saveReady, pieces, turn, moveHistory, gameStartPieces, gameMoves, positionHistory, ruleMoves, noCapturePlyCount, winner, draw, endReason, language, pieceStyle, mode, difficulty, playerColor, pieceTheme, soundEnabled, soundVolume]);

  return (
    <main className={`app ${tutorialOpen || reviewOpen ? "app--tutorial" : ""}`}>
      <header className="hero">
        <p className="eyebrow">AI CHINESE CHESS</p>
        <h1>弈境</h1>
        <p className="subtitle">方寸棋盘，推演千秋</p>
        {!tutorialOpen && !reviewOpen && <div className="hero-mobile-actions">
          <button className="tutorial-mobile-entry" type="button" onClick={() => setTutorialOpen(true)}>{language === "zh" ? "新手教程" : "Beginner guide"}</button>
          <button className={`sound-mobile-toggle ${soundEnabled ? "is-active" : ""}`} type="button" aria-label={`${t.sound}：${soundEnabled ? t.soundOn : t.soundOff}`} aria-pressed={soundEnabled} onClick={toggleSound}><span aria-hidden="true">♪</span>{soundEnabled ? t.soundOn : t.soundOff}</button>
        </div>}
      </header>

      {reviewOpen ? <GameReview startPieces={gameStartPieces} moves={gameMoves} language={language} pieceStyle={pieceStyle} pieceTheme={pieceTheme} flipped={flipped} analysisDepth={depth} onClose={() => setReviewOpen(false)} /> : tutorialOpen ? <Tutorial language={language} pieceStyle={pieceStyle} pieceTheme={pieceTheme} onPieceStyleChange={setPieceStyle} onPieceThemeChange={setPieceTheme} onClose={() => setTutorialOpen(false)} /> : <section className="game-layout">
        <div className="board-area">
          <div className="player-label player-label--black">
            <span className="player-dot" />
            {flipped ? t.red : t.black}
          </div>
          <ChessBoard pieces={pieces} selectedId={selectedId} legalMoves={legalMoves} onPieceClick={handlePieceClick} onMove={handleMove} language={language} pieceStyle={pieceStyle} lastMove={lastMove} pieceTheme={pieceTheme} flipped={flipped} invalidPieceId={invalidPieceId} hintPieceIds={hintPieceIds} onInvalidAction={registerInvalidAction} onBoardClick={handleBoardClick} onBoardDrop={handleBoardDrop} setupMode={mode === "setup"} />
          {mode !== "setup" && (winner || draw) && (
            <div className={`result-banner ${winner ? "result-banner--win" : "result-banner--draw"}`} role="status">
              <span className="result-spark">{winner ? "✦" : "—"}</span>
              <strong>{winner ? (winner === "red" ? t.redWin : t.blackWin) : t.drawTitle}</strong>
              <span>{endReasonText ?? (winner ? t.finished : t.draw)}</span>
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
            <button className={mode === "setup" ? "is-active" : ""} type="button" onClick={startSetupMode}>{t.setup}</button>
          </div>
          <button className="tutorial-open-button" type="button" onClick={() => setTutorialOpen(true)}>
            <span><b>{language === "zh" ? "新手教程" : "Beginner guide"}</b><small>{language === "zh" ? "从认识棋盘开始" : "Start with the board"}</small></span>
            <i>→</i>
          </button>
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
            {(["red", "black"] as PieceColor[]).map((color) => <section className="setup-color-section" key={color}>
              <h3>{color === "red" ? (language === "zh" ? "红方棋子" : "Red pieces") : (language === "zh" ? "黑方棋子" : "Black pieces")}</h3>
              <div className="setup-piece-tray">
                {(Object.keys(setupNames) as PieceType[]).map((type) => <div className="setup-piece-option" key={`${color}-${type}`}>
                  <button className={`setup-token setup-token--${color} ${pieceStyle === "symbols" ? "setup-token--symbols" : ""} ${setupColor === color && setupType === type ? "is-active" : ""}`} type="button" draggable onClick={() => { setSetupColor(color); setSetupType(type); }} onDragStart={(event) => event.dataTransfer.setData("application/x-chess-piece", JSON.stringify({ type, color }))} aria-label={`${color === "red" ? t.red : t.black} ${setupNames[type]}`}>
                    {pieceStyle === "symbols" ? <PieceIcon type={type} /> : language === "en" ? englishBoardMarks[type] : setupGlyphs[color][type]}
                  </button>
                  <span>{setupNames[type]}</span>
                </div>)}
              </div>
            </section>)}
            <div className="settings-row setup-first-move">
              <span>{t.firstMove}</span>
              <button className={turn === "red" ? "is-active" : ""} type="button" onClick={() => setTurn("red")}>{t.redFirst}</button>
              <button className={turn === "black" ? "is-active" : ""} type="button" onClick={() => setTurn("black")}>{t.blackFirst}</button>
            </div>
            <button className="clear-board-button" type="button" onClick={clearSetupBoard}>{t.clearAll}</button>
            <button className="finish-setup-button" type="button" onClick={finishSetup} disabled={!setupReady}>{t.finishSetup}</button>
            {!setupReady && <p className="setup-validation">{t.needsGenerals}</p>}
          </div>}
          {mode !== "setup" && <>
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
          <div className="settings-row">
            <span>{language === "zh" ? "棋子" : "Pieces"}</span>
            <button className={pieceStyle === "hanzi" ? "is-active" : ""} type="button" onClick={() => setPieceStyle("hanzi")}>{t.chinese}</button>
            <button className={pieceStyle === "symbols" ? "is-active" : ""} type="button" onClick={() => setPieceStyle("symbols")}>{t.symbols}</button>
          </div>
          <div className={`sound-control ${soundEnabled ? "sound-control--active" : ""}`}>
            <div className="sound-control__header">
              <span>{t.sound}</span>
              <button className={soundEnabled ? "is-active" : ""} type="button" aria-pressed={soundEnabled} onClick={toggleSound}>
                <i aria-hidden="true">♪</i>{soundEnabled ? t.soundOn : t.soundOff}
              </button>
            </div>
            <label className="sound-volume">
              <span>{t.volume}</span>
              <input type="range" min="0" max="100" step="1" value={Math.round(soundVolume * 100)} disabled={!soundEnabled} aria-label={t.volume} onChange={(event) => setSoundVolume(Number(event.target.value) / 100)} />
              <output>{Math.round(soundVolume * 100)}%</output>
            </label>
            <small>{t.soundHint}</small>
          </div>
          {language === "en" && pieceStyle === "hanzi" && <div className="piece-legend">
            {(Object.keys(setupNames) as PieceType[]).map((type) => <span key={type}><b>{englishBoardMarks[type]}</b> {setupNames[type]}</span>)}
          </div>}
          <p className="panel-kicker">{t.current}</p>
          <h2>{winner ? (winner === "red" ? t.redWin : t.blackWin) : draw ? t.drawTitle : `${turnName} ${t.turn}`}</h2>
          <div className="turn-card">
            <span className={`turn-piece turn-piece--${turn} ${pieceStyle === "symbols" ? "turn-piece--symbols" : ""}`}>{pieceStyle === "symbols" ? <PieceIcon type="general" /> : turn === "red" ? (language === "zh" ? "帅" : "K") : (language === "zh" ? "将" : "K")}</span>
            <div>
              <strong>{winner || draw ? t.finished : invalidAttempts >= 3 ? (language === "zh" ? "可解除将军的棋子已高亮" : "Escape pieces are highlighted") : invalidNotice ? (language === "zh" ? "这枚棋子无法解将" : "This piece cannot answer check") : selfCheckWarning ? t.selfCheck : isInCheck(turn, pieces) ? t.check : ruleWarning ?? (aiThinking ? t.thinking : selectedPiece ? t.chooseTarget : t.waiting)}</strong>
              <p>{winner || draw ? endReasonText ?? t.finished : selectedPiece ? t.marker : `${t.choose} ${turnName}`}</p>
            </div>
          </div>
          <div className="divider" />
          <dl className="game-stats">
            <div><dt>{t.turn}</dt><dd>{String(Math.floor(moveCount / 2) + 1).padStart(2, "0")}</dd></div>
            <div><dt>{t.moves}</dt><dd>{moveCount}</dd></div>
            <div><dt>{t.status}</dt><dd>{winner || draw ? t.ended : isInCheck(turn, pieces) ? t.checkShort : t.playing}</dd></div>
            <div><dt>{rulesText.noCapture}</dt><dd>{noCapturePlyCount} / {NO_CAPTURE_DRAW_LIMIT}</dd></div>
          </dl>
          <button className="reset-button" type="button" onClick={resetGame}>{t.reset}</button>
          <button className="undo-button" type="button" onClick={undoMove} disabled={history.length === 0}>{t.undo}</button>
          <button className="export-button" type="button" onClick={exportRecord}>{t.export}</button>
          <button className="review-open-button" type="button" onClick={() => setReviewOpen(true)} disabled={gameMoves.length === 0} title={gameMoves.length === 0 ? (language === "zh" ? "至少完成一步后即可复盘" : "Make at least one move to start a review") : undefined}>
            <span>{language === "zh" ? "AI 复盘讲解" : "AI game review"}</span><i>→</i>
          </button>
          <button className="settings-reset" type="button" onClick={resetAllSettings}>{t.resetSettings}</button>
          <div className="move-log" aria-label="走棋记录">
            <p>{t.log}</p>
            {moveHistory.length === 0 ? <span>{t.noLog}</span> : moveHistory.slice(-6).map((move, index) => <span key={`${move}-${index}`}>{move}</span>)}
          </div>
          <p className="coming-soon">已支持基础走法与将军限制</p>
          </>}
        </aside>
      </section>}
    </main>
  );
}

export default App;

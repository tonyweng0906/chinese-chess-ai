import "./App.css";
import { ChessBoard } from "./components/ChessBoard";
import { useEffect, useMemo, useRef, useState, type DragEvent, type MouseEvent } from "react";
import { getAllLegalMoves, getLegalMoves, getPseudoLegalMoves, isInCheck, type Position } from "./game/rules";
import { initialPieces } from "./data/initialPieces";
import type { AiCandidate, AiChoice, AiSearchResult } from "./game/ai";
import { PieceIcon } from "./components/PieceIcon";
import { Tutorial } from "./components/Tutorial";
import { GameReview } from "./components/GameReview";
import { TrainingArchiveLibrary } from "./components/TrainingArchiveLibrary";
import { playGameSound, type GameSound } from "./audio/gameSounds";
import { adjudicateRepetition, describeMoveForRules, getPositionKey, NO_CAPTURE_DRAW_LIMIT, type RuleMoveRecord } from "./game/adjudication";
import { getUndoSnapshotIndex } from "./game/undo";
import { compactPreviousGameBackup, hasGameProgress, minimalPreviousGameBackup, parsePreviousGameBackup, PREVIOUS_GAME_KEY, RESTORE_UNDO_KEY, type GameEndReason, type GameSnapshot, type PreviousGameBackup } from "./game/backup";
import { buildLearningGame, createLearningDataset, getLearningGameId, getLearningMoveHints, getLearningStats, LEARNING_STORAGE_KEY, parseLearningDataset, recordLearningGame, removeLearningGame } from "./game/learning";
import type { SelfPlayCompleteMessage, SelfPlayErrorMessage, SelfPlayPreviewMessage, SelfPlayProgressMessage } from "./game/selfPlay.worker";
import { buildTrainingArchive, createTrainingArchiveDataset, parseTrainingArchiveDataset, recordTrainingArchive, reconstructTrainingMoves, removeTrainingArchive, TRAINING_ARCHIVE_STORAGE_KEY } from "./game/trainingArchive";
import { createPlayedArchiveDataset, parsePlayedArchiveDataset, PLAYED_ARCHIVE_STORAGE_KEY, recordPlayedArchive, removePlayedArchive } from "./game/playedArchive";
import type { EndgameSolverProgress, EndgameSolverResult } from "./game/endgameSolver";
import type { ChessPiece, PieceColor, Language, PieceStyle, PieceTheme, PieceType, RecordedMove } from "./types";

const copyBase = {
  zh: { black: "黑方", red: "红方", current: "当前对局", waiting: "等待落子", choose: "请选择一枚", chooseTarget: "请选择落点", marker: "棋盘上的金色标记是可走位置", check: "正在被将军", finished: "对局结束", captured: "对方已无合法应对", draw: "当前局面无合法着法", turn: "回合", moves: "已行棋", status: "状态", playing: "进行中", checkShort: "将军", ended: "已结束", reset: "重新开始", restorePrevious: "恢复上一局", restoreConfirm: "确定恢复上一局吗？当前棋盘会被暂时覆盖，之后可用“撤销恢复”找回。", restoreUndo: "撤销恢复", restoreUndoShortcut: "撤销恢复：Ctrl+Shift+Z；悔棋：Ctrl+Z", undo: "悔棋", historyActions: "局面操作", log: "走棋记录", noLog: "暂无记录", chinese: "汉字棋子", symbols: "图形棋子", language: "语言", appearance: "外观与音效", tools: "工具与记录", redWin: "红方获胜", blackWin: "黑方获胜", drawTitle: "和棋", mode: "模式", local: "双人", ai: "人机", setup: "残局编辑", thinking: "AI 思考中...", difficulty: "难度", easy: "简单", normal: "普通", hard: "困难", player: "玩家", save: "已自动保存", export: "导出棋谱", theme: "棋子主题", wood: "木质", jade: "玉石", flat: "扁平", upload: "上传棋子图片", redSide: "执红", blackSide: "执黑", switchSide: "转换边", endgamePractice: "残局练习", resetSettings: "重置所有设置", selfCheck: "注意：危险落点会让自己被将军", editorHelp: "把下方棋子拖到棋盘；拖动已有棋子换位，点击可移除", clearAll: "清空全部棋子", finishSetup: "完成编辑并开始", needsGenerals: "双方都需要一枚将/帅", firstMove: "先行", redFirst: "红方先行", blackFirst: "黑方先行", sound: "棋局音效", soundOn: "开启", soundOff: "关闭", volume: "音量", soundHint: "落子、吃子、将军与将死使用不同声音", learning: "经验学习", learningOn: "学习中", learningOff: "已暂停", learnedGames: "已学习对局", learnedMoves: "AI 样本着法", clearLearning: "清除学习数据", learningHint: "同一局面至少 3 个样本后才小幅影响 AI；吃子、将军和应将不受干扰。", clearLearningConfirm: "确定清除所有 AI 学习数据吗？", winRate: "实时胜率", analyzingWinRate: "正在分析局面...", winRateHint: "基于本地引擎的快速估算，不代表绝对结果" },
  en: { black: "Black", red: "Red", current: "Game", waiting: "Your move", choose: "Select a", chooseTarget: "Choose a destination", marker: "Gold marks show legal moves", check: "In check", finished: "Game over", captured: "No legal response", draw: "No legal moves available", turn: "Turn", moves: "Moves", status: "Status", playing: "Playing", checkShort: "Check", ended: "Ended", reset: "Restart", restorePrevious: "Restore previous game", restoreConfirm: "Restore the previous game? Your current board will be replaced temporarily, and you can undo the restore afterward.", restoreUndo: "Undo restore", restoreUndoShortcut: "Undo restore: Ctrl+Shift+Z · Undo move: Ctrl+Z", undo: "Undo", historyActions: "Position actions", log: "Move history", noLog: "No moves yet", chinese: "Chinese", symbols: "Symbols", language: "Language", appearance: "Appearance & sound", tools: "Tools & records", redWin: "Red wins", blackWin: "Black wins", drawTitle: "Draw", mode: "Mode", local: "Two players", ai: "vs AI", setup: "Endgame editor", thinking: "AI is thinking...", difficulty: "Difficulty", easy: "Easy", normal: "Normal", hard: "Hard", player: "Player", save: "Auto-saved", export: "Export record", theme: "Piece theme", wood: "Wood", jade: "Jade", flat: "Flat", upload: "Upload piece image", redSide: "Red side", blackSide: "Black side", switchSide: "Switch side", endgamePractice: "Endgame practice", resetSettings: "Reset all settings", selfCheck: "Warning: this move would expose your general", editorHelp: "Drag pieces below onto the board; drag placed pieces to move, click to remove", clearAll: "Clear all pieces", finishSetup: "Finish and play", needsGenerals: "Both sides need a general", firstMove: "First", redFirst: "Red first", blackFirst: "Black first", sound: "Game sound", soundOn: "On", soundOff: "Off", volume: "Volume", soundHint: "Distinct sounds for moves, captures, check, and checkmate", learning: "Experience learning", learningOn: "Learning", learningOff: "Paused", learnedGames: "Learned games", learnedMoves: "AI move samples", clearLearning: "Clear learning data", learningHint: "A position needs at least 3 samples before it gently affects AI; captures, checks, and check responses stay protected.", clearLearningConfirm: "Clear all AI learning data?", winRate: "Live win rate", analyzingWinRate: "Analyzing position...", winRateHint: "A quick local-engine estimate, not a guaranteed result" },
} as const;

const copy = {
  ...copyBase,
  ko: {
    ...copyBase.en,
    black: "흑", red: "홍", current: "현재 대국", waiting: "착수를 기다리는 중", choose: "말을 선택하세요", chooseTarget: "도착 지점을 선택하세요",
    marker: "금색 표시는 합법적인 이동 위치입니다", check: "장군 상태", finished: "대국 종료", captured: "상대에게 합법적인 대응이 없습니다", draw: "합법적인 수가 없습니다",
    turn: "차례", moves: "수", status: "상태", playing: "진행 중", checkShort: "장군", ended: "종료", reset: "새로 시작", restorePrevious: "이전 대국 복원", undo: "무르기", historyActions: "대국 조작", log: "기보", noLog: "아직 기록이 없습니다",
    chinese: "한자 기물", symbols: "기호 기물", language: "언어", appearance: "화면 및 소리", tools: "도구 및 기록", redWin: "홍 승리", blackWin: "흑 승리", drawTitle: "무승부",
    mode: "모드", local: "2인 대국", ai: "AI 대국", setup: "종료 상태 편집", thinking: "AI가 생각 중...", difficulty: "난이도", easy: "쉬움", normal: "보통", hard: "어려움", player: "플레이어", save: "자동 저장됨", export: "기보 내보내기", restoreConfirm: "이전 대국을 복원할까요? 현재 보드는 잠시 덮어쓰며, 이후 복원을 취소할 수 있습니다.", restoreUndo: "복원 취소", restoreUndoShortcut: "복원 취소: Ctrl+Shift+Z · 무르기: Ctrl+Z", switchSide: "진영 전환", endgamePractice: "종료 국면 연습",
    theme: "기물 테마", wood: "나무", jade: "옥", flat: "플랫", redSide: "홍 진영", blackSide: "흑 진영", resetSettings: "모든 설정 초기화", selfCheck: "주의: 이 수는 자신의 장군을 노출합니다",
    clearAll: "모든 기물 비우기", finishSetup: "편집 완료 후 시작", needsGenerals: "양쪽 모두 장군이 필요합니다", firstMove: "선공", redFirst: "홍 선공", blackFirst: "흑 선공", sound: "대국 소리", soundOn: "켜짐", soundOff: "꺼짐", volume: "볼륨", editorHelp: "아래 기물을 보드로 드래그하세요. 놓인 기물은 드래그해 이동하거나 클릭해 제거할 수 있습니다.",
    soundHint: "착수, 포획, 장군, 외통수마다 다른 소리를 냅니다.", learning: "경험 학습", learningOn: "학습 중", learningOff: "일시정지", learnedGames: "학습 대국", learnedMoves: "AI 샘플 수", clearLearning: "학습 데이터 삭제", learningHint: "같은 국면에서 최소 3개의 샘플이 쌓여야 AI에 조금씩 반영됩니다.", clearLearningConfirm: "모든 AI 학습 데이터를 삭제할까요?", winRate: "실시간 승률", analyzingWinRate: "국면 분석 중...", winRateHint: "로컬 엔진의 빠른 추정치이며 절대적인 결과는 아닙니다.",
  },
} as const;

const actionCopy = {
  zh: { offerDraw: "求和", resign: "认输", offerDrawConfirm: "确定向对方提出和棋吗？确认后本局将结束。", resignConfirm: "确定认输吗？本局将判负。", agreedDraw: "双方同意和棋", resignation: "认输结束", hint: "AI提示", hintThinking: "AI计算中...", hintReady: "已标出推荐着法", hintMove: "推荐着法", hintCandidates: "候选着法", hintWinRate: "红方 / 黑方胜率", hintReason: "推荐理由", hintEvaluation: "局面评价", hintCapture: "可以直接吃子", hintCheck: "形成将军，争取主动", hintRespond: "当前被将军，优先应将", hintImprove: "改善棋子位置并保持主动", hintDecisive: "明显优势", hintAdvantage: "略有优势", hintEqual: "局面均衡", hintDisadvantage: "略处下风", hintDanger: "局面危险", hintNoMove: "当前没有可推荐的着法" },
  en: { offerDraw: "Offer draw", resign: "Resign", offerDrawConfirm: "Offer a draw and end this game?", resignConfirm: "Resign this game? It will count as a loss.", agreedDraw: "Draw by agreement", resignation: "Resignation", hint: "AI hint", hintThinking: "AI is calculating...", hintReady: "Recommended move is highlighted", hintMove: "Recommended move", hintCandidates: "Candidate moves", hintWinRate: "Red / Black win rate", hintReason: "Why this move", hintEvaluation: "Position", hintCapture: "Wins material immediately", hintCheck: "Gives check and takes the initiative", hintRespond: "Answers the current check", hintImprove: "Improves piece activity and keeps the initiative", hintDecisive: "Decisive advantage", hintAdvantage: "Slight advantage", hintEqual: "Balanced", hintDisadvantage: "Slight disadvantage", hintDanger: "Dangerous position", hintNoMove: "No legal move is available" },
  ko: { offerDraw: "무승부 제안", resign: "기권", offerDrawConfirm: "무승부로 대국을 끝낼까요?", resignConfirm: "기권할까요? 이 대국은 패배로 기록됩니다.", agreedDraw: "합의 무승부", resignation: "기권 종료", hint: "AI 추천", hintThinking: "AI 계산 중...", hintReady: "추천 수가 강조되었습니다", hintMove: "추천 수", hintCandidates: "후보 수", hintWinRate: "홍 / 흑 승률", hintReason: "추천 이유", hintEvaluation: "국면 평가", hintCapture: "기물을 바로 잡습니다", hintCheck: "장군으로 주도권을 잡습니다", hintRespond: "현재 장군에 대응합니다", hintImprove: "기물의 활동성과 주도권을 높입니다", hintDecisive: "결정적 우세", hintAdvantage: "약간 우세", hintEqual: "균형", hintDisadvantage: "약간 열세", hintDanger: "위험한 국면", hintNoMove: "추천할 합법적인 수가 없습니다" },
} as const;

const solverCopy = {
  zh: {
    title: "AI 残局破解", intro: "严格穷举当前先行方的胜法；只有验证对手全部合法应对后才会宣告破解。",
    depth: "计算层数", solve: "开始严格求解", stop: "停止计算", thinking: "正在穷举所有变化…",
    solved: "已证明强制胜利", notProven: "当前深度内尚未证明胜法", timeout: "达到时间上限，尚未完成证明",
    exact: "“已证明”表示最顽强防守下仍然必胜；“尚未证明”不代表一定无法取胜。",
    nodes: "已检查局面", reached: "完成深度", line: "最顽强防守路线", plies: "步",
    invalid: "局面不合法：双方不能同时处于被将军状态。", side: "求解方",
  },
  en: {
    title: "Exact endgame solver", intro: "Exhaustively proves a win for the side to move and only claims success after every legal defense is verified.",
    depth: "Search plies", solve: "Start exact solve", stop: "Stop", thinking: "Checking every variation…",
    solved: "Forced win proven", notProven: "No win proven within this depth", timeout: "Time limit reached before a proof",
    exact: "Proven means every defense still loses. Not proven does not mean the position is unwinnable.",
    nodes: "Positions checked", reached: "Completed depth", line: "Best-defense line", plies: "plies",
    invalid: "Invalid position: both kings cannot be in check at once.", side: "Solving for",
  },
  ko: {
    title: "AI 종반 해법", intro: "현재 선공 측의 승리를 완전 탐색하며 모든 합법적 방어를 검증한 경우에만 해법으로 표시합니다.",
    depth: "탐색 수", solve: "정밀 해법 시작", stop: "중지", thinking: "모든 변화를 탐색 중…",
    solved: "강제 승리 증명 완료", notProven: "현재 깊이에서는 승리를 증명하지 못했습니다", timeout: "시간 제한 안에 증명을 완료하지 못했습니다",
    exact: "증명 완료는 모든 방어에도 승리한다는 뜻입니다. 미증명은 승리 불가능을 뜻하지 않습니다.",
    nodes: "검사한 국면", reached: "완료 깊이", line: "최선 방어 진행", plies: "수",
    invalid: "잘못된 국면입니다. 양쪽 장군이 동시에 장군 상태일 수 없습니다.", side: "해법 진영",
  },
} as const;

const trainingCopyBase = {
  zh: {
    title: "AI 自我训练", idle: "准备就绪", running: "训练中", paused: "已暂停", complete: "本轮完成", error: "训练出错",
    short: "3 局", long: "10 局", start: "开始训练", stop: "暂停训练", games: "完成局数", samples: "有效样本", total: "累计",
    result: "红胜 / 黑胜 / 和", watching: "训练观战", game: "第", gameUnit: "局", ply: "手", toMove: "行棋",
    archive: "训练回放", archiveHint: "每局结束后自动存档",
    hint: "后台自我对弈并由当前引擎筛选步骤；正常对局需要 AI 思考时会自动暂停。",
  },
  en: {
    title: "AI self-training", idle: "Ready", running: "Training", paused: "Paused", complete: "Batch complete", error: "Training error",
    short: "3 games", long: "10 games", start: "Start training", stop: "Pause training", games: "Games", samples: "Accepted", total: "Total",
    result: "Red / Black / Draw", watching: "Training live", game: "Game", gameUnit: "", ply: "ply", toMove: "to move",
    archive: "Training replays", archiveHint: "Auto-saved after every game",
    hint: "Runs filtered self-play in the background and pauses automatically when the match AI needs to think.",
  },
} as const;

const trainingCopy = {
  ...trainingCopyBase,
  ko: {
    ...trainingCopyBase.en,
    title: "AI 자기 대국 훈련", idle: "준비됨", running: "훈련 중", paused: "일시정지", complete: "훈련 완료", error: "훈련 오류",
    short: "3국", long: "10국", start: "훈련 시작", stop: "훈련 일시정지", games: "완료 대국", samples: "유효 샘플", total: "누적", result: "홍 / 흑 / 무승부", watching: "훈련 관전", game: "제", gameUnit: "국", ply: "수", toMove: "둘 차례",
    archive: "훈련 리플레이", archiveHint: "매 대국 종료 후 자동 저장", hint: "백그라운드에서 자기 대국을 실행하고 AI가 선택한 수를 학습합니다.",
  },
} as const;

type SelfPlayStatus = "idle" | "running" | "paused" | "complete" | "error";
type SelfPlayMessage = SelfPlayProgressMessage | SelfPlayCompleteMessage | SelfPlayErrorMessage | SelfPlayPreviewMessage;

const ruleCopyBase = {
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
const ruleCopy = {
  ...ruleCopyBase,
  ko: {
    ...ruleCopyBase.en,
    noCapture: "잡지 않은 수", repeatWarning: "현재 국면이 두 번 반복되었습니다. 한 번 더 반복되면 판정됩니다", noCaptureWarning: "무포획 제한에 가까워졌습니다. 빠른 포획이 필요합니다",
    reasons: {
      "general-captured": "장군이 잡혀 대국 종료", checkmate: "외통수: 장군 상태에서 합법적인 대응이 없습니다", stalemate: "궁박: 합법적인 수가 없는 쪽이 패배", repetition: "같은 국면이 세 번 반복되어 무승부", "perpetual-check": "연속 장군 위반으로 장군을 건 쪽이 패배", "perpetual-chase": "연속 추격 위반으로 추격한 쪽이 패배", "no-capture-limit": "50수 동안 포획이 없어 무승부",
    },
  },
} as const;

type EndReason = GameEndReason;
const endReasons: EndReason[] = ["general-captured", "checkmate", "stalemate", "repetition", "perpetual-check", "perpetual-chase", "no-capture-limit", "agreed-draw", "resignation"];

const setupGlyphs: Record<PieceColor, Record<PieceType, string>> = {
  red: { general: "帅", advisor: "仕", elephant: "相", horse: "馬", rook: "車", cannon: "炮", soldier: "兵" },
  black: { general: "将", advisor: "士", elephant: "象", horse: "马", rook: "车", cannon: "炮", soldier: "卒" },
};
const koreanSetupGlyphs: Record<PieceColor, Record<PieceType, string>> = {
  red: { general: "장", advisor: "사", elephant: "상", horse: "마", rook: "차", cannon: "포", soldier: "병" },
  black: { general: "장", advisor: "사", elephant: "상", horse: "마", rook: "차", cannon: "포", soldier: "졸" },
};

const englishBoardMarks: Record<PieceType, string> = { general: "K", advisor: "G", elephant: "B", horse: "N", rook: "R", cannon: "C", soldier: "P" };
const hintPieceNames: Record<Language, Record<PieceType, string>> = {
  zh: { general: "将/帅", advisor: "士/仕", elephant: "象/相", horse: "马", rook: "车", cannon: "炮", soldier: "兵/卒" },
  en: { general: "King", advisor: "Guard", elephant: "Bishop", horse: "Knight", rook: "Rook", cannon: "Cannon", soldier: "Pawn" },
  ko: { general: "장", advisor: "사", elephant: "상", horse: "마", rook: "차", cannon: "포", soldier: "병/졸" },
};

function oppositeColor(color: PieceColor): PieceColor {
  return color === "red" ? "black" : "red";
}

function scoreToWinRate(score: number) {
  if (score >= 900_000) return 100;
  if (score <= -900_000) return 0;
  const normalized = Math.max(-900, Math.min(900, score));
  return Math.round((1 / (1 + Math.exp(-normalized / 240))) * 100);
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
  const [endgamePractice, setEndgamePractice] = useState(false);
  const [endgameViewBlack, setEndgameViewBlack] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);
  const aiWorkerRef = useRef<Worker | null>(null);
  const aiTimerRef = useRef<number | null>(null);
  const [hintMove, setHintMove] = useState<AiChoice | null>(null);
  const [hintScore, setHintScore] = useState<number | null>(null);
  const [hintCandidates, setHintCandidates] = useState<AiCandidate[]>([]);
  const [hintThinking, setHintThinking] = useState(false);
  const hintWorkerRef = useRef<Worker | null>(null);
  const [solverDepth, setSolverDepth] = useState<8 | 12 | 16>(12);
  const [solverThinking, setSolverThinking] = useState(false);
  const [solverProgress, setSolverProgress] = useState<EndgameSolverProgress | null>(null);
  const [solverResult, setSolverResult] = useState<EndgameSolverResult | null>(null);
  const [solverError, setSolverError] = useState("");
  const solverWorkerRef = useRef<Worker | null>(null);
  const [winRate, setWinRate] = useState<{ red: number; black: number; depth: number } | null>(null);
  const [winRateThinking, setWinRateThinking] = useState(false);
  const analysisWorkerRef = useRef<Worker | null>(null);
  const analysisTimerRef = useRef<number | null>(null);
  const [difficulty, setDifficulty] = useState<"easy" | "normal" | "hard">("normal");
  const [playerColor, setPlayerColor] = useState<PieceColor>("red");
  const [pieceTheme, setPieceTheme] = useState<PieceTheme>("wood");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundVolume, setSoundVolume] = useState(0.58);
  const [learningEnabled, setLearningEnabled] = useState(true);
  const [learningDataset, setLearningDataset] = useState(() => parseLearningDataset(localStorage.getItem(LEARNING_STORAGE_KEY)));
  const selfPlayWorkerRef = useRef<Worker | null>(null);
  const [selfPlayStatus, setSelfPlayStatus] = useState<SelfPlayStatus>("idle");
  const [selfPlayTarget, setSelfPlayTarget] = useState<3 | 10>(3);
  const [selfPlayProgress, setSelfPlayProgress] = useState({ completedGames: 0, targetGames: 3, redWins: 0, blackWins: 0, draws: 0, acceptedDecisions: 0, lastGamePlies: 0 });
  const [selfPlayError, setSelfPlayError] = useState("");
  const [selfPlayPreview, setSelfPlayPreview] = useState<SelfPlayPreviewMessage | null>(null);
  const [trainingArchives, setTrainingArchives] = useState(() => parseTrainingArchiveDataset(localStorage.getItem(TRAINING_ARCHIVE_STORAGE_KEY)));
  const [trainingArchiveOpen, setTrainingArchiveOpen] = useState(false);
  const [selectedTrainingArchiveId, setSelectedTrainingArchiveId] = useState<string | null>(null);
  const [playedArchives, setPlayedArchives] = useState(() => parsePlayedArchiveDataset(localStorage.getItem(PLAYED_ARCHIVE_STORAGE_KEY)));
  const [playedArchiveOpen, setPlayedArchiveOpen] = useState(false);
  const [selectedPlayedArchiveId, setSelectedPlayedArchiveId] = useState<string | null>(null);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [lastMove, setLastMove] = useState<{ from: Position; to: Position } | null>(null);
  const t = copy[language];
  const actionText = actionCopy[language];
  const solverText = solverCopy[language];
  const trainingText = trainingCopy[language];
  const selfPlayStatusText = selfPlayStatus === "running" ? trainingText.running
    : selfPlayStatus === "paused" ? trainingText.paused
      : selfPlayStatus === "complete" ? trainingText.complete
        : selfPlayStatus === "error" ? trainingText.error
          : trainingText.idle;
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
  const [hasPreviousGame, setHasPreviousGame] = useState(() => parsePreviousGameBackup(localStorage.getItem(PREVIOUS_GAME_KEY)) !== null);
  const [restoreUndoBackup, setRestoreUndoBackup] = useState<PreviousGameBackup | null>(() => parsePreviousGameBackup(localStorage.getItem(RESTORE_UNDO_KEY)));
  const turnName = turn === "red" ? t.red : t.black;
  const aiColor = playerColor === "red" ? "black" : "red";
  const depth = difficulty === "easy" ? 2 : difficulty === "normal" ? 4 : 6;
  const aiTimeLimit = difficulty === "easy" ? 120 : difficulty === "normal" ? 400 : 1500;
  const flipped = (mode === "ai" && playerColor === "black") || (endgamePractice && endgameViewBlack);
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
  const endReasonText = endReason === "agreed-draw"
    ? actionText.agreedDraw
    : endReason === "resignation"
      ? actionText.resignation
      : endReason ? rulesText.reasons[endReason] : null;
  const undoSnapshotIndex = getUndoSnapshotIndex(history, mode, playerColor);
  const learningStats = useMemo(() => getLearningStats(learningDataset), [learningDataset]);
  const learningHints = useMemo(
    () => learningEnabled ? getLearningMoveHints(learningDataset, getPositionKey(pieces, aiColor)) : [],
    [learningEnabled, learningDataset, pieces, aiColor],
  );
  const hintDetails = useMemo(() => {
    if (!hintMove) return null;
    const captured = pieces.find((piece) => piece.row === hintMove.move.row && piece.col === hintMove.move.col) ?? null;
    const nextPieces = pieces
      .filter((piece) => !(piece.row === hintMove.move.row && piece.col === hintMove.move.col))
      .map((piece) => piece.id === hintMove.piece.id ? { ...piece, ...hintMove.move } : piece);
    const givesCheck = isInCheck(oppositeColor(turn), nextPieces);
    const isResponse = isInCheck(turn, pieces);
    const reason = captured ? actionText.hintCapture : givesCheck ? actionText.hintCheck : isResponse ? actionText.hintRespond : actionText.hintImprove;
    const evaluation = hintScore === null
      ? actionText.hintEqual
      : hintScore >= 50_000
        ? actionText.hintDecisive
        : hintScore >= 120
          ? actionText.hintAdvantage
          : hintScore <= -120
            ? actionText.hintDanger
            : hintScore < 0 ? actionText.hintDisadvantage : actionText.hintEqual;
    const moveText = `${hintPieceNames[language][hintMove.piece.type]} (${hintMove.piece.row},${hintMove.piece.col}) → (${hintMove.move.row},${hintMove.move.col})`;
    return { moveText, reason, evaluation };
  }, [actionText, hintMove, hintScore, language, pieces, turn]);
  const hintCandidateRows = useMemo(() => hintCandidates.slice(0, 3).map(({ choice, score }) => {
    const redWinRate = scoreToWinRate(turn === "red" ? score : -score);
    return {
      moveText: `${hintPieceNames[language][choice.piece.type]} (${choice.piece.row},${choice.piece.col}) → (${choice.move.row},${choice.move.col})`,
      redWinRate,
      blackWinRate: 100 - redWinRate,
    };
  }), [hintCandidates, language, turn]);
  const solverLineRows = useMemo(() => (solverResult?.line ?? []).map((move, index) => ({
    number: index + 1,
    color: move.color === "red" ? t.red : t.black,
    text: `${hintPieceNames[language][move.pieceType]} (${move.from.row},${move.from.col}) → (${move.to.row},${move.to.col})${move.captured ? ` × ${hintPieceNames[language][move.captured]}` : ""}${move.givesCheck ? ` ${t.checkShort}` : ""}`,
  })), [language, solverResult, t.black, t.checkShort, t.red]);
  const trainingBoard = selfPlayStatus === "running" ? selfPlayPreview : null;
  const selectedTrainingArchive = trainingArchives.archives.find((archive) => archive.id === selectedTrainingArchiveId) ?? null;
  const selectedPlayedArchive = playedArchives.archives.find((archive) => archive.id === selectedPlayedArchiveId) ?? null;
  const selectedTrainingMoves = useMemo(
    () => selectedTrainingArchive ? reconstructTrainingMoves(selectedTrainingArchive) : [],
    [selectedTrainingArchive],
  );
  const selectedPlayedMoves = useMemo(
    () => selectedPlayedArchive ? reconstructTrainingMoves(selectedPlayedArchive) : [],
    [selectedPlayedArchive],
  );

  const setupNames: Record<PieceType, string> = language === "zh"
    ? { general: "将/帅", advisor: "士/仕", elephant: "象/相", horse: "马/馬", rook: "车/車", cannon: "炮", soldier: "卒/兵" }
    : language === "ko"
      ? { general: "장", advisor: "사", elephant: "상", horse: "마", rook: "차", cannon: "포", soldier: "병/졸" }
      : { general: "King", advisor: "Guard", elephant: "Bishop", horse: "Knight", rook: "Rook", cannon: "Cannon", soldier: "Pawn" };
  const setupReady = pieces.some((piece) => piece.type === "general" && piece.color === "red") && pieces.some((piece) => piece.type === "general" && piece.color === "black");

  function registerInvalidAction() {
    if (!checkRestricted || winner || draw || aiThinking) return;
    setInvalidNotice(true);
    setInvalidAttempts((current) => current + 1);
  }

  function handlePieceClick(piece: ChessPiece) {
    if (mode === "setup") {
      cancelEndgameSolver(true);
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
    cancelHintCalculation();
    setHintMove(null);
    setHintScore(null);
    setHintCandidates([]);
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
    cancelEndgameSolver(true);
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
        cancelEndgameSolver(true);
        setPieces((current) => current.map((piece) => piece.id === moving.id ? { ...piece, row, col } : piece));
      } else if (payload.type && payload.color) {
        placeSetupPiece(payload.type as PieceType, payload.color as PieceColor, row, col);
      }
    } catch { return; }
  }

  function clearSetupBoard() {
    cancelEndgameSolver(true);
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
    saveCurrentGameAsPrevious();
    cancelAiCalculation();
    cancelHintCalculation();
    cancelEndgameSolver(true);
    setHintMove(null);
    setHintScore(null);
    localStorage.removeItem(RESTORE_UNDO_KEY);
    setRestoreUndoBackup(null);
    setMode("setup");
    setEndgamePractice(false);
    setEndgameViewBlack(false);
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
    cancelHintCalculation();
    cancelEndgameSolver(true);
    setHintMove(null);
    setHintScore(null);
    setMode("local");
    setEndgamePractice(false);
    setEndgameViewBlack(false);
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
      aiTimerRef.current = null;
      worker = new Worker(new URL("./game/ai.worker.ts", import.meta.url), { type: "module" });
      aiWorkerRef.current = worker;
      worker.onmessage = (event: MessageEvent<AiSearchResult>) => {
        if (aiWorkerRef.current !== worker) return;
        aiWorkerRef.current = null;
        worker?.terminate();
        if (event.data.choice) applyMove(event.data.choice.piece, event.data.choice.move);
        setAiThinking(false);
      };
      worker.onerror = () => {
        if (aiWorkerRef.current !== worker) return;
        aiWorkerRef.current = null;
        worker?.terminate();
        const fallback = getAllLegalMoves(aiColor, pieces)[0];
        if (fallback) applyMove(fallback.piece, fallback.move);
        setAiThinking(false);
      };
      worker.postMessage({ pieces, color: aiColor, maxDepth: depth, timeLimit: aiTimeLimit, positionHistory, ruleMoves, moves: gameMoves, learningHints });
    }, 350);
    aiTimerRef.current = timer;
    return () => {
      window.clearTimeout(timer);
      worker?.terminate();
      if (aiTimerRef.current === timer) aiTimerRef.current = null;
      if (aiWorkerRef.current === worker) aiWorkerRef.current = null;
    };
  }, [mode, turn, pieces, winner, draw, aiColor, depth, aiTimeLimit, positionHistory, ruleMoves, gameMoves, learningHints]);

  useEffect(() => {
    if (analysisTimerRef.current !== null) window.clearTimeout(analysisTimerRef.current);
    analysisTimerRef.current = null;
    analysisWorkerRef.current?.terminate();
    analysisWorkerRef.current = null;
    setWinRateThinking(false);
    if (mode === "setup") {
      setWinRate(null);
      return;
    }
    if (winner) {
      setWinRate({ red: winner === "red" ? 100 : 0, black: winner === "black" ? 100 : 0, depth: 0 });
      return;
    }
    if (draw) {
      setWinRate({ red: 50, black: 50, depth: 0 });
      return;
    }
    setWinRateThinking(true);
    const timer = window.setTimeout(() => {
      analysisTimerRef.current = null;
      const worker = new Worker(new URL("./game/ai.worker.ts", import.meta.url), { type: "module" });
      analysisWorkerRef.current = worker;
      worker.onmessage = (event: MessageEvent<AiSearchResult>) => {
        if (analysisWorkerRef.current !== worker) return;
        analysisWorkerRef.current = null;
        worker.terminate();
        const redScore = turn === "red" ? event.data.score : -event.data.score;
        const red = scoreToWinRate(redScore);
        setWinRate({ red, black: 100 - red, depth: event.data.stats.completedDepth });
        setWinRateThinking(false);
      };
      worker.onerror = () => {
        if (analysisWorkerRef.current !== worker) return;
        analysisWorkerRef.current = null;
        worker.terminate();
        setWinRateThinking(false);
      };
      worker.postMessage({
        pieces,
        color: turn,
        maxDepth: Math.min(depth, 3),
        timeLimit: Math.min(aiTimeLimit, 420),
        positionHistory,
        ruleMoves,
        moves: gameMoves,
        learningHints,
      });
    }, 180);
    analysisTimerRef.current = timer;
    return () => {
      window.clearTimeout(timer);
      if (analysisTimerRef.current === timer) analysisTimerRef.current = null;
      if (analysisWorkerRef.current) {
        analysisWorkerRef.current.terminate();
        analysisWorkerRef.current = null;
      }
    };
  }, [mode, pieces, turn, winner, draw, depth, aiTimeLimit, positionHistory, ruleMoves, gameMoves, learningHints]);

  useEffect(() => {
    try {
      localStorage.setItem(LEARNING_STORAGE_KEY, JSON.stringify(learningDataset));
    } catch {
      // Keep the current session usable even if browser storage is unavailable.
    }
  }, [learningDataset]);

  useEffect(() => {
    try {
      localStorage.setItem(TRAINING_ARCHIVE_STORAGE_KEY, JSON.stringify(trainingArchives));
    } catch {
      // Archives are optional; training remains available when storage is full.
    }
  }, [trainingArchives]);

  useEffect(() => {
    try {
      localStorage.setItem(PLAYED_ARCHIVE_STORAGE_KEY, JSON.stringify(playedArchives));
    } catch {
      // Match archives are optional; the current game remains usable if storage is full.
    }
  }, [playedArchives]);

  useEffect(() => () => {
    selfPlayWorkerRef.current?.terminate();
    selfPlayWorkerRef.current = null;
  }, []);

  useEffect(() => () => {
    hintWorkerRef.current?.terminate();
    hintWorkerRef.current = null;
  }, []);

  useEffect(() => () => {
    solverWorkerRef.current?.terminate();
    solverWorkerRef.current = null;
  }, []);

  useEffect(() => {
    if ((!learningEnabled || aiThinking || mode !== "ai") && selfPlayWorkerRef.current) {
      selfPlayWorkerRef.current.terminate();
      selfPlayWorkerRef.current = null;
      setSelfPlayStatus("paused");
      setSelfPlayPreview(null);
    }
  }, [learningEnabled, aiThinking, mode]);

  useEffect(() => {
    if (mode !== "ai") return;
    const gameId = getLearningGameId(gameMoves);
    if (!gameId) return;
    if (!winner && !draw) {
      setLearningDataset((current) => removeLearningGame(current, gameId));
      return;
    }
    if (!learningEnabled) return;
    const outcome = draw ? "draw" : winner === aiColor ? "win" : "loss";
    const learnedGame = buildLearningGame(gameStartPieces, gameMoves, aiColor, outcome);
    if (learnedGame) setLearningDataset((current) => recordLearningGame(current, learnedGame));
  }, [mode, winner, draw, gameMoves, gameStartPieces, aiColor, learningEnabled]);

  useEffect(() => {
    if (mode !== "ai" || (!winner && !draw)) return;
    savePlayedArchive();
  }, [mode, winner, draw, gameMoves, endReason]);

  function savePlayedArchive(abandoned = false) {
    if (mode !== "ai" || gameMoves.length === 0 || (abandoned && (winner || draw))) return;
    const gameId = getLearningGameId(gameMoves);
    if (!gameId) return;
    const archive = buildTrainingArchive(
      `played-${gameId}${abandoned ? "-abandoned" : ""}`,
      gameMoves,
      abandoned ? null : winner,
      abandoned ? false : draw,
      Date.now(),
      abandoned ? undefined : endReason ?? undefined,
      abandoned,
    );
    setPlayedArchives((current) => recordPlayedArchive(current, archive));
  }

  function offerDraw() {
    if (mode === "setup" || winner || draw || aiThinking) return;
    if (!window.confirm(actionText.offerDrawConfirm)) return;
    cancelHintCalculation();
    setHintMove(null);
    setHintScore(null);
    setWinner(null);
    setDraw(true);
    setEndReason("agreed-draw");
    setSelectedId(null);
    setInvalidPieceId(null);
    setInvalidNotice(false);
    setInvalidAttempts(0);
    if (soundEnabled) playGameSound("draw", soundVolume);
  }

  function resignGame() {
    if (mode === "setup" || winner || draw || aiThinking) return;
    if (!window.confirm(actionText.resignConfirm)) return;
    cancelHintCalculation();
    setHintMove(null);
    setHintScore(null);
    const resigningColor = mode === "ai" ? playerColor : turn;
    setWinner(resigningColor === "red" ? "black" : "red");
    setDraw(false);
    setEndReason("resignation");
    setSelectedId(null);
    setInvalidPieceId(null);
    setInvalidNotice(false);
    setInvalidAttempts(0);
    if (soundEnabled) playGameSound("win", soundVolume);
  }

  function undoMove() {
    const previous = history[undoSnapshotIndex];
    if (!previous) return;
    cancelAiCalculation();
    cancelHintCalculation();
    setHintMove(null);
    setHintScore(null);
    setPieces(previous.pieces);
    setHistory((current) => current.slice(0, undoSnapshotIndex));
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

  function cancelAiCalculation() {
    if (aiTimerRef.current !== null) window.clearTimeout(aiTimerRef.current);
    aiTimerRef.current = null;
    aiWorkerRef.current?.terminate();
    aiWorkerRef.current = null;
    setAiThinking(false);
  }

  function cancelHintCalculation() {
    hintWorkerRef.current?.terminate();
    hintWorkerRef.current = null;
    setHintThinking(false);
  }

  function cancelEndgameSolver(clearResult = false) {
    solverWorkerRef.current?.terminate();
    solverWorkerRef.current = null;
    setSolverThinking(false);
    if (clearResult) {
      setSolverProgress(null);
      setSolverResult(null);
      setSolverError("");
      setHintMove(null);
    }
  }

  function requestEndgameSolve() {
    if (mode !== "setup" || !setupReady || solverThinking) return;
    cancelEndgameSolver(true);
    if (isInCheck("red", pieces) && isInCheck("black", pieces)) {
      setSolverError(solverText.invalid);
      return;
    }
    setSolverThinking(true);
    const worker = new Worker(new URL("./game/endgameSolver.worker.ts", import.meta.url), { type: "module" });
    solverWorkerRef.current = worker;
    worker.onmessage = (event: MessageEvent<EndgameSolverProgress | EndgameSolverResult>) => {
      if (solverWorkerRef.current !== worker) return;
      if (event.data.type === "progress") {
        setSolverProgress(event.data);
        return;
      }
      solverWorkerRef.current = null;
      worker.terminate();
      setSolverThinking(false);
      setSolverResult(event.data);
      setSolverProgress({ type: "progress", depth: event.data.completedDepth, nodes: event.data.nodes, elapsedMs: event.data.elapsedMs });
      const firstMove = event.data.line[0];
      const source = firstMove ? pieces.find((piece) => piece.id === firstMove.pieceId) : null;
      setHintMove(source && firstMove ? { piece: source, move: firstMove.to } : null);
    };
    worker.onerror = () => {
      if (solverWorkerRef.current !== worker) return;
      solverWorkerRef.current = null;
      worker.terminate();
      setSolverThinking(false);
      setSolverError(language === "zh" ? "求解器运行失败，请减少棋子或降低计算层数后重试。" : language === "ko" ? "해법 계산에 실패했습니다. 기물 또는 탐색 깊이를 줄여 다시 시도하세요." : "The solver failed. Reduce the pieces or search depth and try again.");
    };
    const timeLimit = solverDepth === 8 ? 6_000 : solverDepth === 12 ? 18_000 : 35_000;
    worker.postMessage({ pieces, attacker: turn, maxDepth: solverDepth, timeLimit });
  }

  function requestAiHint() {
    if (mode === "setup" || winner || draw || aiThinking || hintThinking) return;
    cancelHintCalculation();
    setHintMove(null);
    setHintThinking(true);
    const worker = new Worker(new URL("./game/ai.worker.ts", import.meta.url), { type: "module" });
    hintWorkerRef.current = worker;
    worker.onmessage = (event: MessageEvent<AiSearchResult>) => {
      if (hintWorkerRef.current !== worker) return;
      hintWorkerRef.current = null;
      worker.terminate();
      setHintMove(event.data.choice);
      setHintScore(event.data.choice ? event.data.score : null);
      setHintCandidates(event.data.candidates ?? (event.data.choice ? [{ choice: event.data.choice, score: event.data.score }] : []));
      setHintThinking(false);
    };
    worker.onerror = () => {
      if (hintWorkerRef.current !== worker) return;
      hintWorkerRef.current = null;
      worker.terminate();
      setHintMove(null);
      setHintScore(null);
      setHintCandidates([]);
      setHintThinking(false);
    };
    worker.postMessage({
      pieces,
      color: turn,
      maxDepth: depth,
      timeLimit: aiTimeLimit,
      positionHistory,
      ruleMoves,
      moves: gameMoves,
      learningHints: mode === "ai" ? learningHints : [],
    });
  }

  function stopSelfPlayTraining(nextStatus: SelfPlayStatus = "paused") {
    const worker = selfPlayWorkerRef.current;
    worker?.terminate();
    selfPlayWorkerRef.current = null;
    setSelfPlayStatus(nextStatus);
    setSelfPlayPreview(null);
  }

  function startSelfPlayTraining() {
    if (!learningEnabled || aiThinking || selfPlayWorkerRef.current) return;
    const worker = new Worker(new URL("./game/selfPlay.worker.ts", import.meta.url), { type: "module" });
    selfPlayWorkerRef.current = worker;
    setSelfPlayStatus("running");
    setSelfPlayError("");
    setSelfPlayPreview(null);
    setSelfPlayProgress({ completedGames: 0, targetGames: selfPlayTarget, redWins: 0, blackWins: 0, draws: 0, acceptedDecisions: 0, lastGamePlies: 0 });
    worker.onmessage = (event: MessageEvent<SelfPlayMessage>) => {
      if (selfPlayWorkerRef.current !== worker) return;
      if (event.data.type === "preview") {
        setSelfPlayPreview(event.data);
        return;
      }
      if (event.data.type === "error") {
        worker.terminate();
        selfPlayWorkerRef.current = null;
        setSelfPlayError(event.data.message);
        setSelfPlayStatus("error");
        setSelfPlayPreview(null);
        return;
      }
      setSelfPlayProgress({
        completedGames: event.data.completedGames,
        targetGames: event.data.targetGames,
        redWins: event.data.redWins,
        blackWins: event.data.blackWins,
        draws: event.data.draws,
        acceptedDecisions: event.data.acceptedDecisions,
        lastGamePlies: event.data.lastGamePlies,
      });
      if (event.data.type === "progress") {
        const progress = event.data;
        setLearningDataset((current) => progress.games.reduce(
          (dataset, game) => recordLearningGame(dataset, game),
          current,
        ));
        setTrainingArchives((current) => recordTrainingArchive(current, progress.archive));
        return;
      }
      worker.terminate();
      selfPlayWorkerRef.current = null;
      setSelfPlayStatus("complete");
      setSelfPlayPreview(null);
    };
    worker.onerror = () => {
      if (selfPlayWorkerRef.current !== worker) return;
      worker.terminate();
      selfPlayWorkerRef.current = null;
      setSelfPlayError(language === "zh" ? "训练线程无法继续运行" : language === "ko" ? "훈련 작업을 계속할 수 없습니다" : "The training worker stopped unexpectedly");
      setSelfPlayStatus("error");
      setSelfPlayPreview(null);
    };
    worker.postMessage({
      type: "start",
      sessionId: `selfplay-${Date.now()}`,
      targetGames: selfPlayTarget,
      dataset: learningDataset,
      seed: Date.now() >>> 0,
    });
  }

  function openTrainingArchives() {
    if (selfPlayWorkerRef.current) stopSelfPlayTraining();
    else setSelfPlayPreview(null);
    setTutorialOpen(false);
    setReviewOpen(false);
    setSelectedTrainingArchiveId(null);
    setTrainingArchiveOpen(true);
  }

  function openPlayedArchives() {
    if (selfPlayWorkerRef.current) stopSelfPlayTraining();
    else setSelfPlayPreview(null);
    setTutorialOpen(false);
    setReviewOpen(false);
    setTrainingArchiveOpen(false);
    setSelectedTrainingArchiveId(null);
    setSelectedPlayedArchiveId(null);
    setPlayedArchiveOpen(true);
  }

  function continueFromTrainingPosition(nextPieces: ChessPiece[], nextTurn: PieceColor) {
    saveCurrentGameAsPrevious();
    cancelAiCalculation();
    cancelHintCalculation();
    setHintMove(null);
    setHintScore(null);
    setSelectedTrainingArchiveId(null);
    setTrainingArchiveOpen(false);
    setMode("local");
    setEndgamePractice(true);
    setEndgameViewBlack(nextTurn === "black");
    setPieces(nextPieces.map((piece) => ({ ...piece })));
    setTurn(nextTurn);
    setSelectedId(null);
    setWinner(null);
    setDraw(false);
    setHistory([]);
    setMoveHistory([]);
    setGameStartPieces(nextPieces.map((piece) => ({ ...piece })));
    setGameMoves([]);
    setPositionHistory([getPositionKey(nextPieces, nextTurn)]);
    setRuleMoves([]);
    setNoCapturePlyCount(0);
    setEndReason(null);
    setLastMove(null);
    setInvalidPieceId(null);
    setInvalidNotice(false);
    setInvalidAttempts(0);
    setSelfCheckWarning(false);
  }

  function switchEndgameSide() {
    if (!endgamePractice || mode !== "local") return;
    const nextTurn = oppositeColor(turn);
    cancelHintCalculation();
    setHintMove(null);
    setHintScore(null);
    setTurn(nextTurn);
    setEndgameViewBlack((current) => !current);
    setSelectedId(null);
    setWinner(null);
    setDraw(false);
    setHistory([]);
    setMoveHistory([]);
    setGameStartPieces(pieces.map((piece) => ({ ...piece })));
    setGameMoves([]);
    setPositionHistory([getPositionKey(pieces, nextTurn)]);
    setRuleMoves([]);
    setNoCapturePlyCount(0);
    setEndReason(null);
    setLastMove(null);
    setInvalidPieceId(null);
    setInvalidNotice(false);
    setInvalidAttempts(0);
    setSelfCheckWarning(false);
  }

  function saveCurrentGameAsPrevious() {
    const hasProgress = hasGameProgress(pieces, turn, Math.max(gameMoves.length, moveHistory.length), initialPieces);
    if (!hasProgress || mode === "setup") return;
    const backup = currentGameBackup();
    if (persistBackup(PREVIOUS_GAME_KEY, backup)) {
      setHasPreviousGame(true);
      return;
    }
    setHasPreviousGame(parsePreviousGameBackup(localStorage.getItem(PREVIOUS_GAME_KEY)) !== null);
  }

  function currentGameBackup(): PreviousGameBackup {
    return {
      pieces,
      turn,
      moveHistory,
      positionHistory,
      ruleMoves,
      noCapturePlyCount,
      lastMove,
      gameStartPieces,
      gameMoves,
      history,
      winner,
      draw,
      endReason,
      mode: mode === "setup" ? "local" : mode,
      playerColor,
      difficulty,
    };
  }

  function persistBackup(key: string, backup: PreviousGameBackup) {
    const candidates = [compactPreviousGameBackup(backup), minimalPreviousGameBackup(backup)];
    for (const candidate of candidates) {
      try {
        localStorage.setItem(key, JSON.stringify(candidate));
        return true;
      } catch {
        continue;
      }
    }
    return false;
  }

  function applyPreviousGameBackup(backup: PreviousGameBackup) {
    cancelAiCalculation();
    cancelHintCalculation();
    setHintMove(null);
    setHintScore(null);
    setPieces(backup.pieces);
    setTurn(backup.turn);
    setMoveHistory(backup.moveHistory);
    setPositionHistory(backup.positionHistory);
    setRuleMoves(backup.ruleMoves);
    setNoCapturePlyCount(backup.noCapturePlyCount);
    setLastMove(backup.lastMove);
    setGameStartPieces(backup.gameStartPieces);
    setGameMoves(backup.gameMoves);
    setHistory(backup.history);
    setWinner(backup.winner);
    setDraw(backup.draw);
    setEndReason(backup.endReason);
    setMode(backup.mode);
    setEndgamePractice(false);
    setEndgameViewBlack(false);
    setPlayerColor(backup.playerColor);
    setDifficulty(backup.difficulty);
    setSelectedId(null);
    setInvalidPieceId(null);
    setInvalidNotice(false);
    setSelfCheckWarning(false);
    setInvalidAttempts(0);
  }

  function restorePreviousGame() {
    if (!window.confirm(t.restoreConfirm)) return;
    const backup = parsePreviousGameBackup(localStorage.getItem(PREVIOUS_GAME_KEY));
    if (!backup) {
      localStorage.removeItem(PREVIOUS_GAME_KEY);
      setHasPreviousGame(false);
      return;
    }
    const current = currentGameBackup();
    persistBackup(RESTORE_UNDO_KEY, current);
    setRestoreUndoBackup(current);
    applyPreviousGameBackup(backup);
    localStorage.removeItem(PREVIOUS_GAME_KEY);
    setHasPreviousGame(false);
  }

  function undoRestorePreviousGame() {
    const backup = restoreUndoBackup ?? parsePreviousGameBackup(localStorage.getItem(RESTORE_UNDO_KEY));
    if (!backup) {
      localStorage.removeItem(RESTORE_UNDO_KEY);
      setRestoreUndoBackup(null);
      return;
    }
    applyPreviousGameBackup(backup);
    localStorage.removeItem(RESTORE_UNDO_KEY);
    setRestoreUndoBackup(null);
  }

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.tagName === "SELECT") return;
      if (tutorialOpen || reviewOpen || trainingArchiveOpen || playedArchiveOpen || mode === "setup") return;
      const key = event.key.toLowerCase();
      const commandKey = event.ctrlKey || event.metaKey;
      if (commandKey && event.shiftKey && key === "z") {
        if (!restoreUndoBackup) return;
        event.preventDefault();
        undoRestorePreviousGame();
      } else if (commandKey && !event.shiftKey && key === "z") {
        if (undoSnapshotIndex < 0) return;
        event.preventDefault();
        undoMove();
      }
    }
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [mode, playedArchiveOpen, reviewOpen, restoreUndoBackup, trainingArchiveOpen, tutorialOpen, undoSnapshotIndex]);

  function resetGame(savePrevious = true) {
    if (savePrevious) {
      savePlayedArchive(true);
      saveCurrentGameAsPrevious();
    }
    localStorage.removeItem(RESTORE_UNDO_KEY);
    setRestoreUndoBackup(null);
    cancelAiCalculation();
    cancelHintCalculation();
    setHintMove(null);
    setHintScore(null);
    setPieces(initialPieces);
    setTurn("red");
    setEndgamePractice(false);
    setEndgameViewBlack(false);
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
    stopSelfPlayTraining("idle");
    localStorage.removeItem("chinese-chess-ai-game");
    localStorage.removeItem(PREVIOUS_GAME_KEY);
    localStorage.removeItem(RESTORE_UNDO_KEY);
    setHasPreviousGame(false);
    setRestoreUndoBackup(null);
    setLanguage("zh");
    setPieceStyle("hanzi");
    setMode("local");
    setDifficulty("normal");
    setPlayerColor("red");
    setPieceTheme("wood");
    setSoundEnabled(true);
    setSoundVolume(0.58);
    setLearningEnabled(true);
    resetGame(false);
  }

  function clearLearningData() {
    if (!window.confirm(t.clearLearningConfirm)) return;
    stopSelfPlayTraining("idle");
    setLearningDataset(createLearningDataset());
    setSelfPlayProgress({ completedGames: 0, targetGames: selfPlayTarget, redWins: 0, blackWins: 0, draws: 0, acceptedDecisions: 0, lastGamePlies: 0 });
    setSelfPlayError("");
  }

  function startAiGame(color: PieceColor) {
    saveCurrentGameAsPrevious();
    cancelAiCalculation();
    cancelHintCalculation();
    setHintMove(null);
    setHintScore(null);
    setMode("ai");
    setEndgamePractice(false);
    setEndgameViewBlack(false);
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
    const conclusion = endReasonText ? `\n${language === "zh" ? "结束原因" : language === "ko" ? "종료 이유" : "Result"}：${endReasonText}\n` : "";
    const blob = new Blob([`AI Chinese Chess\n\n${body || "No moves"}\n${conclusion}`], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "chinese-chess-record.txt";
    link.click();
    URL.revokeObjectURL(url);
  }

  const moveCount = moveHistory.length;
  const fullScreenPanelOpen = tutorialOpen || reviewOpen || trainingArchiveOpen || playedArchiveOpen || Boolean(selectedTrainingArchive) || Boolean(selectedPlayedArchive);

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
      if (data.language === "zh" || data.language === "en" || data.language === "ko") setLanguage(data.language);
      if (data.pieceStyle === "hanzi" || data.pieceStyle === "symbols") setPieceStyle(data.pieceStyle);
      if (data.mode === "local" || data.mode === "ai" || data.mode === "setup") setMode(data.mode);
      if (["easy", "normal", "hard"].includes(data.difficulty)) setDifficulty(data.difficulty);
      if (data.playerColor === "red" || data.playerColor === "black") setPlayerColor(data.playerColor);
      if (["wood", "jade", "flat"].includes(data.pieceTheme)) setPieceTheme(data.pieceTheme);
      if (typeof data.soundEnabled === "boolean") setSoundEnabled(data.soundEnabled);
      if (typeof data.soundVolume === "number" && data.soundVolume >= 0 && data.soundVolume <= 1) setSoundVolume(data.soundVolume);
      if (typeof data.learningEnabled === "boolean") setLearningEnabled(data.learningEnabled);
    } catch { localStorage.removeItem("chinese-chess-ai-game"); }
    setSaveReady(true);
  }, []);

  useEffect(() => {
    if (!saveReady) return;
    localStorage.setItem("chinese-chess-ai-game", JSON.stringify({ pieces, turn, moveHistory, gameStartPieces, gameMoves, positionHistory, ruleMoves, noCapturePlyCount, winner, draw, endReason, language, pieceStyle, mode, difficulty, playerColor, pieceTheme, soundEnabled, soundVolume, learningEnabled }));
  }, [saveReady, pieces, turn, moveHistory, gameStartPieces, gameMoves, positionHistory, ruleMoves, noCapturePlyCount, winner, draw, endReason, language, pieceStyle, mode, difficulty, playerColor, pieceTheme, soundEnabled, soundVolume, learningEnabled]);

  return (
    <main className={`app ${fullScreenPanelOpen ? "app--tutorial" : ""}`}>
      <header className="hero">
        <p className="eyebrow">AI CHINESE CHESS</p>
        <h1>弈境</h1>
        <p className="subtitle">方寸棋盘，推演千秋</p>
        <label className="language-switcher">
          <span>{t.language}</span>
          <select value={language} onChange={(event) => setLanguage(event.target.value as Language)} aria-label={t.language}>
            <option value="zh">中文</option>
            <option value="en">English</option>
            <option value="ko">한국어</option>
          </select>
        </label>
        {!fullScreenPanelOpen && <div className="hero-mobile-actions">
          <button className="tutorial-mobile-entry" type="button" onClick={() => setTutorialOpen(true)}>{language === "zh" ? "新手教程" : language === "ko" ? "초보자 안내" : "Beginner guide"}</button>
          <button className={`sound-mobile-toggle ${soundEnabled ? "is-active" : ""}`} type="button" aria-label={`${t.sound}：${soundEnabled ? t.soundOn : t.soundOff}`} aria-pressed={soundEnabled} onClick={toggleSound}><span aria-hidden="true">♪</span>{soundEnabled ? t.soundOn : t.soundOff}</button>
          {mode !== "setup" && <button className="hint-mobile-toggle" type="button" onClick={requestAiHint} disabled={Boolean(winner || draw || aiThinking || hintThinking)}>{hintThinking ? actionText.hintThinking : actionText.hint}</button>}
          {endgamePractice && <button className="endgame-side-mobile-toggle" type="button" onClick={switchEndgameSide}>{t.switchSide}</button>}
          {hintCandidateRows.length > 0 && <span className="hint-mobile-note">{hintCandidateRows.map((candidate, index) => `${index + 1}. ${candidate.moveText} ${candidate.redWinRate}%/${candidate.blackWinRate}%`).join(" · ")}</span>}
          {mode !== "setup" && <span className="win-rate-mobile">{t.winRate}：{winRateThinking ? "…" : winRate ? `${winRate.red}% / ${winRate.black}%` : "—"}</span>}
        </div>}
      </header>

      {selectedPlayedArchive ? <GameReview startPieces={initialPieces} moves={selectedPlayedMoves} language={language} pieceStyle={pieceStyle} pieceTheme={pieceTheme} flipped={false} analysisDepth={depth} archiveMode archiveVariant="played" soundEnabled={soundEnabled} soundVolume={soundVolume} onClose={() => setSelectedPlayedArchiveId(null)} />
        : playedArchiveOpen ? <TrainingArchiveLibrary archives={playedArchives.archives} language={language} variant="played" onSelect={setSelectedPlayedArchiveId} onDelete={(archiveId) => setPlayedArchives((current) => removePlayedArchive(current, archiveId))} onClear={() => setPlayedArchives(createPlayedArchiveDataset())} onClose={() => setPlayedArchiveOpen(false)} />
          : selectedTrainingArchive ? <GameReview startPieces={initialPieces} moves={selectedTrainingMoves} language={language} pieceStyle={pieceStyle} pieceTheme={pieceTheme} flipped={false} analysisDepth={depth} archiveMode soundEnabled={soundEnabled} soundVolume={soundVolume} onClose={() => setSelectedTrainingArchiveId(null)} onContinueFromPosition={continueFromTrainingPosition} />
        : trainingArchiveOpen ? <TrainingArchiveLibrary archives={trainingArchives.archives} language={language} variant="training" onSelect={setSelectedTrainingArchiveId} onDelete={(archiveId) => setTrainingArchives((current) => removeTrainingArchive(current, archiveId))} onClear={() => setTrainingArchives(createTrainingArchiveDataset())} onClose={() => setTrainingArchiveOpen(false)} />
          : reviewOpen ? <GameReview startPieces={gameStartPieces} moves={gameMoves} language={language} pieceStyle={pieceStyle} pieceTheme={pieceTheme} flipped={flipped} analysisDepth={depth} soundEnabled={soundEnabled} soundVolume={soundVolume} onClose={() => setReviewOpen(false)} />
            : tutorialOpen ? <Tutorial language={language} pieceStyle={pieceStyle} pieceTheme={pieceTheme} onPieceStyleChange={setPieceStyle} onPieceThemeChange={setPieceTheme} onClose={() => setTutorialOpen(false)} /> : <section className="game-layout">
        <div className={`board-area ${trainingBoard ? "board-area--training" : ""}`}>
          <div className="player-label player-label--black">
            <span className="player-dot" />
            {flipped ? t.red : t.black}
          </div>
          {trainingBoard && <div className="training-board-status" role="status">
            <i aria-hidden="true" />
            <strong>{trainingText.watching}</strong>
            <span>{trainingText.game} {trainingBoard.gameNumber}/{trainingBoard.targetGames} {trainingText.gameUnit} · {trainingBoard.ply} {trainingText.ply} · {trainingBoard.turn === "red" ? t.red : t.black} {trainingText.toMove}</span>
          </div>}
          <ChessBoard pieces={trainingBoard?.pieces ?? pieces} selectedId={trainingBoard ? null : selectedId} legalMoves={trainingBoard ? [] : legalMoves} onPieceClick={handlePieceClick} onMove={handleMove} language={language} pieceStyle={pieceStyle} lastMove={trainingBoard?.lastMove ?? lastMove} hintMove={trainingBoard ? null : hintMove} pieceTheme={pieceTheme} flipped={flipped} invalidPieceId={trainingBoard ? null : invalidPieceId} hintPieceIds={trainingBoard ? new Set<string>() : hintPieceIds} onInvalidAction={registerInvalidAction} onBoardClick={handleBoardClick} onBoardDrop={handleBoardDrop} setupMode={mode === "setup" && !trainingBoard} disabled={Boolean(trainingBoard)} />
          {!trainingBoard && mode !== "setup" && (winner || draw) && (
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
          <div className="game-panel-column game-panel-column--left">
          <div className="settings-row">
            <span>{t.mode}</span>
            <button className={mode === "local" ? "is-active" : ""} type="button" onClick={() => { cancelAiCalculation(); cancelHintCalculation(); setHintMove(null); setHintScore(null); setEndgamePractice(false); setEndgameViewBlack(false); setMode("local"); }}>{t.local}</button>
            <button className={mode === "ai" ? "is-active" : ""} type="button" onClick={() => startAiGame(playerColor)}>{t.ai}</button>
            <button className={mode === "setup" ? "is-active" : ""} type="button" onClick={startSetupMode}>{t.setup}</button>
            {endgamePractice && <button className="endgame-side-button" type="button" onClick={switchEndgameSide}>{t.switchSide}</button>}
          </div>
          <button className="tutorial-open-button" type="button" onClick={() => setTutorialOpen(true)}>
            <span><b>{language === "zh" ? "新手教程" : language === "ko" ? "초보자 안내" : "Beginner guide"}</b><small>{language === "zh" ? "从认识棋盘开始" : language === "ko" ? "보드부터 시작하기" : "Start with the board"}</small></span>
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
            <details className="panel-disclosure panel-disclosure--learning">
              <summary><span>{t.learning}</span><b>{learningEnabled ? t.learningOn : t.learningOff}</b></summary>
              <div className={`learning-control ${learningEnabled ? "learning-control--active" : ""}`}>
              <div className="learning-control__header">
                <span><i aria-hidden="true">◈</i>{t.learning}</span>
                <button className={learningEnabled ? "is-active" : ""} type="button" aria-pressed={learningEnabled} onClick={() => setLearningEnabled((current) => !current)}>{learningEnabled ? t.learningOn : t.learningOff}</button>
              </div>
              <div className="learning-stats">
                <span>{t.learnedGames}<b>{learningStats.games}</b></span>
                <span>{t.learnedMoves}<b>{learningStats.decisions}</b></span>
                <span>{language === "zh" ? "可信经验" : language === "ko" ? "신뢰 경험" : "Trusted"}<b>{learningStats.trustedMoves}</b></span>
              </div>
              <small>{t.learningHint}</small>
              <section className={`self-play-training self-play-training--${selfPlayStatus}`}>
                <div className="self-play-training__header">
                  <strong>{trainingText.title}</strong>
                  <span aria-live="polite">{selfPlayStatusText} · {trainingText.total} {learningStats.selfPlayGames}</span>
                </div>
                <div className="self-play-training__targets">
                  <button className={selfPlayTarget === 3 ? "is-active" : ""} type="button" disabled={selfPlayStatus === "running"} onClick={() => setSelfPlayTarget(3)}>{trainingText.short}</button>
                  <button className={selfPlayTarget === 10 ? "is-active" : ""} type="button" disabled={selfPlayStatus === "running"} onClick={() => setSelfPlayTarget(10)}>{trainingText.long}</button>
                </div>
                <div className="self-play-training__progress">
                  <div style={{ width: `${selfPlayProgress.targetGames > 0 ? Math.min(100, selfPlayProgress.completedGames / selfPlayProgress.targetGames * 100) : 0}%` }} />
                </div>
                <div className="self-play-training__stats">
                  <span>{trainingText.games}<b>{selfPlayProgress.completedGames}/{selfPlayProgress.targetGames}</b></span>
                  <span>{trainingText.samples}<b>{selfPlayProgress.acceptedDecisions}</b></span>
                  <span>{trainingText.result}<b>{selfPlayProgress.redWins}/{selfPlayProgress.blackWins}/{selfPlayProgress.draws}</b></span>
                </div>
                {selfPlayStatus === "running"
                  ? <button className="self-play-training__action is-stop" type="button" onClick={() => stopSelfPlayTraining()}>{trainingText.stop}</button>
                  : <button className="self-play-training__action" type="button" disabled={!learningEnabled || aiThinking} onClick={startSelfPlayTraining}>{trainingText.start}</button>}
                <button className="self-play-training__archive" type="button" onClick={openTrainingArchives}>
                  <span><b>{trainingText.archive}</b><small>{trainingText.archiveHint}</small></span>
                  <i>{trainingArchives.archives.length}</i>
                </button>
                <small>{trainingText.hint}</small>
                {selfPlayError && <p className="self-play-training__error">{selfPlayError}</p>}
              </section>
              <button className="learning-clear" type="button" onClick={clearLearningData} disabled={learningStats.games === 0}>{t.clearLearning}</button>
              </div>
            </details>
          </>}
          {mode === "setup" && <div className="setup-panel">
            <p className="editor-help">{t.editorHelp}</p>
            {(["red", "black"] as PieceColor[]).map((color) => <section className="setup-color-section" key={color}>
              <h3>{color === "red" ? (language === "zh" ? "红方棋子" : language === "ko" ? "홍 기물" : "Red pieces") : (language === "zh" ? "黑方棋子" : language === "ko" ? "흑 기물" : "Black pieces")}</h3>
              <div className="setup-piece-tray">
                {(Object.keys(setupNames) as PieceType[]).map((type) => <div className="setup-piece-option" key={`${color}-${type}`}>
                  <button className={`setup-token setup-token--${color} ${pieceStyle === "symbols" ? "setup-token--symbols" : ""} ${setupColor === color && setupType === type ? "is-active" : ""}`} type="button" draggable onClick={() => { setSetupColor(color); setSetupType(type); }} onDragStart={(event) => event.dataTransfer.setData("application/x-chess-piece", JSON.stringify({ type, color }))} aria-label={`${color === "red" ? t.red : t.black} ${setupNames[type]}`}>
                    {pieceStyle === "symbols" ? <PieceIcon type={type} /> : language === "en" ? englishBoardMarks[type] : language === "ko" ? koreanSetupGlyphs[color][type] : setupGlyphs[color][type]}
                  </button>
                  <span>{setupNames[type]}</span>
                </div>)}
              </div>
            </section>)}
            <div className="settings-row setup-first-move">
              <span>{t.firstMove}</span>
              <button className={turn === "red" ? "is-active" : ""} type="button" onClick={() => { cancelEndgameSolver(true); setTurn("red"); }}>{t.redFirst}</button>
              <button className={turn === "black" ? "is-active" : ""} type="button" onClick={() => { cancelEndgameSolver(true); setTurn("black"); }}>{t.blackFirst}</button>
            </div>
            <section className={`endgame-solver endgame-solver--${solverResult?.status ?? (solverThinking ? "thinking" : "idle")}`}>
              <div className="endgame-solver__heading">
                <span>⌁</span>
                <div><strong>{solverText.title}</strong><small>{solverText.side}：{turn === "red" ? t.red : t.black}</small></div>
              </div>
              <p>{solverText.intro}</p>
              <div className="endgame-solver__depth">
                <span>{solverText.depth}</span>
                {([8, 12, 16] as const).map((value) => <button className={solverDepth === value ? "is-active" : ""} type="button" disabled={solverThinking} key={value} onClick={() => { cancelEndgameSolver(true); setSolverDepth(value); }}>{value}</button>)}
              </div>
              {solverThinking
                ? <button className="endgame-solver__action is-stop" type="button" onClick={() => cancelEndgameSolver(false)}>{solverText.stop}</button>
                : <button className="endgame-solver__action" type="button" onClick={requestEndgameSolve} disabled={!setupReady}>{solverText.solve}</button>}
              {solverThinking && <div className="endgame-solver__thinking" role="status"><i /><span>{solverText.thinking}</span></div>}
              {solverProgress && <div className="endgame-solver__stats">
                <span>{solverText.nodes}<b>{solverProgress.nodes.toLocaleString()}</b></span>
                <span>{solverText.reached}<b>{solverProgress.depth} / {solverDepth}</b></span>
                <span>{Math.max(0.1, solverProgress.elapsedMs / 1000).toFixed(1)}s</span>
              </div>}
              {solverResult && <div className={`endgame-solver__result is-${solverResult.status}`} role="status">
                <strong>{solverResult.status === "solved" ? solverText.solved : solverResult.status === "timeout" ? solverText.timeout : solverText.notProven}</strong>
                {solverResult.status === "solved" && <span>{solverResult.line.length} {solverText.plies}</span>}
                <small>{solverText.exact}</small>
              </div>}
              {solverLineRows.length > 0 && <div className="endgame-solver__line">
                <strong>{solverText.line}</strong>
                {solverLineRows.map((row) => <span key={`${row.number}-${row.text}`}><b>{row.number}</b><em>{row.color}</em>{row.text}</span>)}
              </div>}
              {solverError && <p className="endgame-solver__error" role="alert">{solverError}</p>}
            </section>
            <button className="clear-board-button" type="button" onClick={clearSetupBoard}>{t.clearAll}</button>
            <button className="finish-setup-button" type="button" onClick={finishSetup} disabled={!setupReady}>{t.finishSetup}</button>
            {!setupReady && <p className="setup-validation">{t.needsGenerals}</p>}
          </div>}
          {mode !== "setup" && <details className="panel-disclosure panel-disclosure--tools">
            <summary><span>{t.tools}</span><b>{language === "zh" ? "展开" : language === "ko" ? "열기" : "Open"}</b></summary>
            <div className="panel-disclosure__body">
          <button className="export-button" type="button" onClick={exportRecord}>{t.export}</button>
          <button className="review-open-button" type="button" onClick={() => setReviewOpen(true)} disabled={gameMoves.length === 0} title={gameMoves.length === 0 ? (language === "zh" ? "至少完成一步后即可复盘" : language === "ko" ? "한 수 이상 둔 후 복기할 수 있습니다" : "Make at least one move to start a review") : undefined}>
            <span>{language === "zh" ? "AI 复盘讲解" : language === "ko" ? "AI 복기 해설" : "AI game review"}</span><i>→</i>
          </button>
          <button className="review-open-button" type="button" onClick={openPlayedArchives} disabled={playedArchives.archives.length === 0} title={playedArchives.archives.length === 0 ? (language === "zh" ? "完成一盘人机对战后即可查看" : language === "ko" ? "AI 대국을 한 판 완료하면 확인할 수 있습니다" : "Finish an AI match to view saved games") : undefined}>
            <span>{language === "zh" ? "最近五盘人机对战" : language === "ko" ? "최근 AI 대국 5국" : "Recent AI matches"}</span><i>{playedArchives.archives.length}/5 →</i>
          </button>
          <button className="settings-reset" type="button" onClick={resetAllSettings}>{t.resetSettings}</button>
          <div className="move-log" aria-label="走棋记录">
            <p>{t.log}</p>
            {moveHistory.length === 0 ? <span>{t.noLog}</span> : moveHistory.slice(-6).map((move, index) => <span key={`${move}-${index}`}>{move}</span>)}
          </div>
            </div>
          </details>}
          </div>
          <div className="game-panel-column game-panel-column--right">
          {mode !== "setup" && <>
          <details className="panel-disclosure">
            <summary><span>{t.appearance}</span><b>{language === "zh" ? "展开" : language === "ko" ? "열기" : "Open"}</b></summary>
            <div className="panel-disclosure__body">
          <div className="settings-row">
            <span>{t.theme}</span>
            <button className={pieceTheme === "wood" ? "is-active" : ""} type="button" onClick={() => setPieceTheme("wood")}>{t.wood}</button>
            <button className={pieceTheme === "jade" ? "is-active" : ""} type="button" onClick={() => setPieceTheme("jade")}>{t.jade}</button>
            <button className={pieceTheme === "flat" ? "is-active" : ""} type="button" onClick={() => setPieceTheme("flat")}>{t.flat}</button>
          </div>
          <div className="settings-row">
            <span>{language === "zh" ? "棋子" : language === "ko" ? "기물" : "Pieces"}</span>
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
            </div>
          </details>
          <p className="panel-kicker">{t.current}</p>
          <h2>{winner ? (winner === "red" ? t.redWin : t.blackWin) : draw ? t.drawTitle : `${turnName} ${t.turn}`}</h2>
           <div className="turn-card">
            <span className={`turn-piece turn-piece--${turn} ${pieceStyle === "symbols" ? "turn-piece--symbols" : ""}`}>{pieceStyle === "symbols" ? <PieceIcon type="general" /> : turn === "red" ? (language === "zh" ? "帅" : language === "ko" ? "장" : "K") : (language === "zh" ? "将" : language === "ko" ? "장" : "K")}</span>
            <div>
              <strong>{winner || draw ? t.finished : invalidAttempts >= 3 ? (language === "zh" ? "可解除将军的棋子已高亮" : language === "ko" ? "장군을 풀 수 있는 기물이 강조되었습니다" : "Escape pieces are highlighted") : invalidNotice ? (language === "zh" ? "这枚棋子无法解将" : language === "ko" ? "이 기물로는 장군을 풀 수 없습니다" : "This piece cannot answer check") : selfCheckWarning ? t.selfCheck : isInCheck(turn, pieces) ? t.check : ruleWarning ?? (aiThinking ? t.thinking : selectedPiece ? t.chooseTarget : t.waiting)}</strong>
              <p>{winner || draw ? endReasonText ?? t.finished : selectedPiece ? t.marker : `${t.choose} ${turnName}`}</p>
             </div>
           </div>
           <section className="win-rate-card" aria-live="polite">
             <div className="win-rate-card__header">
               <span>{t.winRate}</span>
               <strong>{winRateThinking ? t.analyzingWinRate : winRate ? `${winRate.red}% / ${winRate.black}%` : "—"}</strong>
             </div>
             <div className="win-rate-bar" aria-hidden="true"><i style={{ width: `${winRate?.red ?? 50}%` }} /></div>
             <div className="win-rate-card__labels"><span>{t.red} {winRate?.red ?? "—"}%</span><span>{t.black} {winRate?.black ?? "—"}%</span></div>
             <small>{t.winRateHint}{winRate && winRate.depth > 0 ? ` · ${language === "zh" ? "深度" : language === "ko" ? "깊이" : "depth"} ${winRate.depth}` : ""}</small>
           </section>
           <div className="divider" />
          <dl className="game-stats">
            <div><dt>{t.turn}</dt><dd>{String(Math.floor(moveCount / 2) + 1).padStart(2, "0")}</dd></div>
            <div><dt>{t.moves}</dt><dd>{moveCount}</dd></div>
            <div><dt>{t.status}</dt><dd>{winner || draw ? t.ended : isInCheck(turn, pieces) ? t.checkShort : t.playing}</dd></div>
            <div><dt>{rulesText.noCapture}</dt><dd>{noCapturePlyCount} / {NO_CAPTURE_DRAW_LIMIT}</dd></div>
          </dl>
          <button className="reset-button" type="button" onClick={() => resetGame()}>{t.reset}</button>
          <div className="game-action-group">
            <span>{t.historyActions}</span>
            <button className="restore-game-button" type="button" onClick={restorePreviousGame} disabled={!hasPreviousGame} title={t.restoreConfirm}>{t.restorePrevious}</button>
            <button className="restore-undo-button" type="button" onClick={undoRestorePreviousGame} disabled={!restoreUndoBackup} title={t.restoreUndoShortcut}>{t.restoreUndo}</button>
            <button className="undo-button" type="button" onClick={undoMove} disabled={undoSnapshotIndex < 0}>{t.undo}</button>
            <small className="restore-shortcut-hint">{t.restoreUndoShortcut}</small>
          </div>
          <button className="hint-button" type="button" onClick={requestAiHint} disabled={Boolean(winner || draw || aiThinking || hintThinking)}>
            {hintThinking ? actionText.hintThinking : actionText.hint}
          </button>
          {hintDetails && <div className="hint-details" role="status">
            <span>{actionText.hintMove}</span>
            <strong>{hintDetails.moveText}</strong>
            <p><b>{actionText.hintReason}</b>{hintDetails.reason}</p>
            <p><b>{actionText.hintEvaluation}</b>{hintDetails.evaluation}</p>
            {hintCandidateRows.length > 0 && <div className="hint-candidates">
              <div className="hint-candidates__header"><span>{actionText.hintCandidates}</span><small>{actionText.hintWinRate}</small></div>
              {hintCandidateRows.map((candidate, index) => <div className={`hint-candidate ${index === 0 ? "is-top" : ""}`} key={`${candidate.moveText}-${index}`}>
                <b>#{index + 1}</b><strong>{candidate.moveText}</strong><em>{candidate.redWinRate}% / {candidate.blackWinRate}%</em>
              </div>)}
            </div>}
          </div>}
          <div className="game-concession-group">
            <button className="offer-draw-button" type="button" onClick={offerDraw} disabled={Boolean(winner || draw || aiThinking)}>{actionText.offerDraw}</button>
            <button className="resign-button" type="button" onClick={resignGame} disabled={Boolean(winner || draw || aiThinking)}>{actionText.resign}</button>
          </div>
          <p className="coming-soon">已支持基础走法与将军限制</p>
          </>}
          </div>
        </aside>
      </section>}
    </main>
  );
}

export default App;

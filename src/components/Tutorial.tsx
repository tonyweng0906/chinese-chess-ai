import { useEffect, useMemo, useState } from "react";
import { getAllLegalMoves, getLegalMoves, isInCheck, type Position } from "../game/rules";
import type { ChessPiece, Language, PieceStyle, PieceTheme, PieceType } from "../types";
import { ChessBoard } from "./ChessBoard";
import { PieceIcon } from "./PieceIcon";

interface TutorialProps {
  language: Language;
  pieceStyle: PieceStyle;
  pieceTheme: PieceTheme;
  onClose: () => void;
}

const tutorialCopy = {
  zh: {
    eyebrow: "新手教程", title: "从第一步开始，认识中国象棋", intro: "用四节简短课程认识棋盘、棋子和胜负规则。无需基础，跟着提示一步一步练习。", backGame: "返回棋局", progress: "学习进度", completed: "已完成", start: "开始学习", continue: "继续学习", review: "重新复习", startHere: "从这里开始", unlocked: "已解锁", locked: "完成上一课后解锁", done: "已完成", overview: "课程总览", finish: "完成本课",
    lessons: [
      ["认识棋盘", "了解九宫、楚河汉界和双方阵营"],
      ["认识棋子", "逐一练习七类棋子的基本走法"],
      ["吃子与将军", "亲手完成一次吃子并将军"],
      ["赢下第一局", "在实战棋盘上完成一步将死"],
    ],
    lessonLabels: ["第一课", "第二课", "第三课", "第四课"],
    boardIntro: "中国象棋的棋子落在交叉点上。先记住下面三个区域，就能看懂棋盘。",
    boardFacts: [
      ["九路十行", "棋盘由 9 条竖线和 10 条横线组成，共有 90 个落子点。"],
      ["楚河汉界", "中间的河界把红黑双方的阵地分开，并会影响兵、卒和象的走法。"],
      ["双方九宫", "棋盘两端的米字格是九宫，将、帅和士、仕只能在各自九宫内活动。"],
    ],
    boardTop: "黑方阵地", river: "楚河　汉界", boardBottom: "红方阵地",
    piecesIntro: "依次点击金色落点，练习七类棋子的代表走法。这里使用简化棋盘帮助记忆。", tapTarget: "点击一个金色落点", practiced: "很好，这一步走对了", nextPiece: "下一个棋子", finishPieces: "完成棋子练习",
    pieceNames: { general: "帅", advisor: "仕", elephant: "相", horse: "马", rook: "车", cannon: "炮", soldier: "兵" },
    pieceTips: { general: "帅每次只能走一格，并且不能离开九宫。", advisor: "仕沿斜线走一格，只能守在九宫内。", elephant: "相走“田”字，不能过河，象眼被堵时不能走。", horse: "马走“日”字；马腿被挡住时不能跳过去。", rook: "车沿横线或竖线直走，路上不能越过棋子。", cannon: "炮不吃子时像车一样走；吃子时必须隔着一个炮架。", soldier: "兵只能向前；过河以后还可以左右走，但不能后退。" },
    captureIntro: "选择红车，再点击唯一的金色落点。红车会吃掉黑卒，并沿直线攻击黑将。", captureGoal: "目标：吃掉黑卒并形成将军", captureSuccess: "完成！黑卒被吃掉，黑将正处于将军。", selectRook: "先选择红车",
    mateIntro: "这是一个一步将死局面。红兵封住两侧，红马保护进攻位置。找到红车的制胜落点。", mateGoal: "目标：一步将死并赢下对局", mateSuccess: "将死！黑方没有任何合法应对，你赢下了第一局。",
  },
  en: {
    eyebrow: "BEGINNER GUIDE", title: "Learn Xiangqi from your very first move", intro: "Four short lessons introduce the board, pieces, and winning rules. No experience needed—learn one step at a time.", backGame: "Back to game", progress: "Learning progress", completed: "completed", start: "Start learning", continue: "Continue", review: "Review course", startHere: "Start here", unlocked: "Unlocked", locked: "Complete the previous lesson", done: "Completed", overview: "Course overview", finish: "Complete lesson",
    lessons: [
      ["Meet the board", "Learn the palaces, river, and two sides"],
      ["Meet the pieces", "Practice the movement of all seven pieces"],
      ["Capture and check", "Make a capture that checks the enemy king"],
      ["Win your first game", "Deliver checkmate on a real board"],
    ],
    lessonLabels: ["LESSON ONE", "LESSON TWO", "LESSON THREE", "LESSON FOUR"],
    boardIntro: "Xiangqi pieces sit on intersections. Learn these three areas first and the board becomes easy to read.",
    boardFacts: [
      ["Nine files, ten ranks", "The board has 9 vertical and 10 horizontal lines, creating 90 intersections for pieces."],
      ["The river", "The river divides the two territories and changes how pawns and elephants can move."],
      ["Two palaces", "The crossed-line areas are palaces. Kings and guards must remain inside their own palace."],
    ],
    boardTop: "Black territory", river: "RIVER", boardBottom: "Red territory",
    piecesIntro: "Tap a gold destination for each of the seven pieces. This simplified board makes their movement patterns easy to remember.", tapTarget: "Tap a gold destination", practiced: "Nice—this move is correct", nextPiece: "Next piece", finishPieces: "Finish piece practice",
    pieceNames: { general: "King", advisor: "Guard", elephant: "Bishop", horse: "Knight", rook: "Rook", cannon: "Cannon", soldier: "Pawn" },
    pieceTips: { general: "The king moves one point at a time and must remain inside the palace.", advisor: "The guard moves one point diagonally and stays inside the palace.", elephant: "The bishop moves exactly two points diagonally, cannot cross the river, and can be blocked at its midpoint.", horse: "The knight moves in an L shape and can be blocked at the first orthogonal step.", rook: "The rook moves any distance horizontally or vertically without jumping pieces.", cannon: "The cannon moves like a rook, but must jump exactly one screen when capturing.", soldier: "The pawn moves forward; after crossing the river it may also move sideways, but never backward." },
    captureIntro: "Select the red rook, then tap the only gold destination. It captures the black pawn and attacks the black king along the file.", captureGoal: "Goal: capture the pawn and give check", captureSuccess: "Done! The pawn is captured and the black king is in check.", selectRook: "Select the red rook first",
    mateIntro: "This is mate in one. The red pawns cover both sides and the knight protects the attacking square. Find the rook's winning move.", mateGoal: "Goal: deliver checkmate in one move", mateSuccess: "Checkmate! Black has no legal reply—you won your first game.",
  },
} as const;

type TutorialText = (typeof tutorialCopy)[Language];
const pieceOrder: PieceType[] = ["general", "advisor", "elephant", "horse", "rook", "cannon", "soldier"];
const origin: Position = { row: 5, col: 4 };
const movementTargets: Record<PieceType, Position[]> = {
  general: [{ row: 4, col: 4 }, { row: 6, col: 4 }, { row: 5, col: 3 }, { row: 5, col: 5 }],
  advisor: [{ row: 4, col: 3 }, { row: 4, col: 5 }, { row: 6, col: 3 }, { row: 6, col: 5 }],
  elephant: [{ row: 3, col: 2 }, { row: 3, col: 6 }, { row: 7, col: 2 }, { row: 7, col: 6 }],
  horse: [{ row: 3, col: 3 }, { row: 3, col: 5 }, { row: 4, col: 2 }, { row: 4, col: 6 }, { row: 6, col: 2 }, { row: 6, col: 6 }, { row: 7, col: 3 }, { row: 7, col: 5 }],
  rook: [{ row: 1, col: 4 }, { row: 9, col: 4 }, { row: 5, col: 0 }, { row: 5, col: 8 }],
  cannon: [{ row: 2, col: 4 }, { row: 8, col: 4 }, { row: 5, col: 1 }, { row: 5, col: 7 }],
  soldier: [{ row: 4, col: 4 }, { row: 5, col: 3 }, { row: 5, col: 5 }],
};

function LessonTopbar({ label, t, onOverview, onClose }: { label: string; t: TutorialText; onOverview: () => void; onClose: () => void }) {
  return <div className="tutorial-topbar"><button type="button" onClick={onOverview}>← {t.overview}</button><span>{label}</span><button type="button" onClick={onClose}>{t.backGame}</button></div>;
}

function LessonHeading({ number, title, intro, label }: { number: number; title: string; intro: string; label: string }) {
  return <div className="lesson-heading"><span className="lesson-number">0{number}</span><div><p>{label}</p><h2>{title}</h2><span>{intro}</span></div></div>;
}

function BoardLesson({ t, onComplete }: { t: TutorialText; onComplete: () => void }) {
  return <>
    <LessonHeading number={1} title={t.lessons[0][0]} intro={t.boardIntro} label={t.lessonLabels[0]} />
    <div className="lesson-content">
      <div className="tutorial-board-demo" aria-label={t.lessons[0][0]}><span className="demo-side demo-side--top">{t.boardTop}</span><div className="demo-palace demo-palace--top" /><div className="demo-river">{t.river}</div><div className="demo-palace demo-palace--bottom" /><span className="demo-side demo-side--bottom">{t.boardBottom}</span></div>
      <div className="lesson-facts">{t.boardFacts.map(([title, description], index) => <article key={title}><span>0{index + 1}</span><div><h3>{title}</h3><p>{description}</p></div></article>)}<button className="lesson-complete-button" type="button" onClick={onComplete}>{t.finish}</button></div>
    </div>
  </>;
}

function PieceLesson({ t, onComplete }: { t: TutorialText; onComplete: () => void }) {
  const [pieceIndex, setPieceIndex] = useState(0);
  const [position, setPosition] = useState<Position>(origin);
  const [practiced, setPracticed] = useState(false);
  const type = pieceOrder[pieceIndex];
  const targets = movementTargets[type];
  function chooseTarget(target: Position) { if (!targets.some((item) => item.row === target.row && item.col === target.col)) return; setPosition(target); setPracticed(true); }
  function next() { if (pieceIndex === pieceOrder.length - 1) { onComplete(); return; } setPieceIndex((current) => current + 1); setPosition(origin); setPracticed(false); }
  return <>
    <LessonHeading number={2} title={t.lessons[1][0]} intro={t.piecesIntro} label={t.lessonLabels[1]} />
    <div className="piece-lesson-layout">
      <div className="move-practice-board" aria-label={t.pieceNames[type]}>
        {Array.from({ length: 10 }, (_, row) => Array.from({ length: 9 }, (_, col) => {
          const isPiece = position.row === row && position.col === col;
          const isTarget = !practiced && targets.some((target) => target.row === row && target.col === col);
          return <button className={isTarget ? "is-target" : ""} type="button" key={`${row}-${col}`} onClick={() => chooseTarget({ row, col })} aria-label={isTarget ? t.tapTarget : undefined}>{isPiece && <span className="practice-piece"><PieceIcon type={type} /></span>}</button>;
        }))}
      </div>
      <div className="piece-lesson-copy">
        <span className="piece-lesson-count">{String(pieceIndex + 1).padStart(2, "0")} / 07</span>
        <div className="piece-lesson-icon"><PieceIcon type={type} /></div>
        <h3>{t.pieceNames[type]}</h3><p>{t.pieceTips[type]}</p>
        <strong className={practiced ? "is-done" : ""}>{practiced ? `✓ ${t.practiced}` : t.tapTarget}</strong>
        <button type="button" onClick={next} disabled={!practiced}>{pieceIndex === pieceOrder.length - 1 ? t.finishPieces : t.nextPiece} →</button>
      </div>
    </div>
  </>;
}

const capturePieces: ChessPiece[] = [
  { id: "tutorial-black-general", type: "general", color: "black", row: 0, col: 4 },
  { id: "tutorial-black-soldier", type: "soldier", color: "black", row: 3, col: 4 },
  { id: "tutorial-red-rook", type: "rook", color: "red", row: 5, col: 4 },
  { id: "tutorial-red-general", type: "general", color: "red", row: 9, col: 4 },
];

const matePieces: ChessPiece[] = [
  { id: "tutorial-black-general", type: "general", color: "black", row: 0, col: 4 },
  { id: "tutorial-black-soldier", type: "soldier", color: "black", row: 1, col: 4 },
  { id: "tutorial-red-soldier-left", type: "soldier", color: "red", row: 1, col: 3 },
  { id: "tutorial-red-soldier-right", type: "soldier", color: "red", row: 1, col: 5 },
  { id: "tutorial-red-rook", type: "rook", color: "red", row: 2, col: 4 },
  { id: "tutorial-red-horse", type: "horse", color: "red", row: 3, col: 3 },
  { id: "tutorial-red-general", type: "general", color: "red", row: 9, col: 4 },
];

function PuzzleLesson({ kind, t, language, pieceStyle, pieceTheme, onComplete }: { kind: "capture" | "mate"; t: TutorialText; language: Language; pieceStyle: PieceStyle; pieceTheme: PieceTheme; onComplete: () => void }) {
  const startPieces = kind === "capture" ? capturePieces : matePieces;
  const target = kind === "capture" ? { row: 3, col: 4 } : { row: 1, col: 4 };
  const lessonIndex = kind === "capture" ? 2 : 3;
  const [pieces, setPieces] = useState<ChessPiece[]>(startPieces);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lastMove, setLastMove] = useState<{ from: Position; to: Position } | null>(null);
  const [solved, setSolved] = useState(false);
  const selectedPiece = pieces.find((piece) => piece.id === selectedId) ?? null;
  const guidedMoves = useMemo(() => selectedPiece && getLegalMoves(selectedPiece, pieces).some((move) => move.row === target.row && move.col === target.col) ? [target] : [], [selectedPiece, pieces, target.row, target.col]);
  function selectPiece(piece: ChessPiece) { if (!solved && piece.id === "tutorial-red-rook") setSelectedId(piece.id); }
  function move(position: Position) {
    if (!selectedPiece || position.row !== target.row || position.col !== target.col) return;
    const next = pieces.filter((piece) => !(piece.row === position.row && piece.col === position.col)).map((piece) => piece.id === selectedPiece.id ? { ...piece, ...position } : piece);
    const success = kind === "capture" ? isInCheck("black", next) : isInCheck("black", next) && getAllLegalMoves("black", next).length === 0;
    if (!success) return;
    setPieces(next); setLastMove({ from: { row: selectedPiece.row, col: selectedPiece.col }, to: position }); setSelectedId(null); setSolved(true);
  }
  return <>
    <LessonHeading number={lessonIndex + 1} title={t.lessons[lessonIndex][0]} intro={kind === "capture" ? t.captureIntro : t.mateIntro} label={t.lessonLabels[lessonIndex]} />
    <div className="puzzle-lesson-layout">
      <div className="tutorial-puzzle-board"><ChessBoard pieces={pieces} selectedId={selectedId} legalMoves={guidedMoves} onPieceClick={selectPiece} onMove={move} language={language} pieceStyle={pieceStyle} lastMove={lastMove} pieceTheme={pieceTheme} flipped={false} invalidPieceId={null} hintPieceIds={new Set()} onInvalidAction={() => undefined} onBoardClick={() => undefined} onBoardDrop={() => undefined} setupMode={false} /></div>
      <div className="puzzle-instructions"><span>{kind === "capture" ? t.captureGoal : t.mateGoal}</span><h3>{solved ? (kind === "capture" ? t.captureSuccess : t.mateSuccess) : t.selectRook}</h3><p>{kind === "capture" ? t.captureIntro : t.mateIntro}</p>{solved && <button className="lesson-complete-button" type="button" onClick={onComplete}>{t.finish} →</button>}</div>
    </div>
  </>;
}

export function Tutorial({ language, pieceStyle, pieceTheme, onClose }: TutorialProps) {
  const [activeLesson, setActiveLesson] = useState<number | null>(null);
  const [completedLessons, setCompletedLessons] = useState<number[]>(() => {
    try { const saved = JSON.parse(localStorage.getItem("xiangqi-tutorial-progress") ?? "[]"); return Array.isArray(saved) ? saved.filter((item) => Number.isInteger(item) && item >= 0 && item < 4) : []; } catch { return []; }
  });
  const t = tutorialCopy[language];
  useEffect(() => { localStorage.setItem("xiangqi-tutorial-progress", JSON.stringify(completedLessons)); }, [completedLessons]);
  const firstIncomplete = [0, 1, 2, 3].find((index) => !completedLessons.includes(index)) ?? 0;
  function completeLesson(index: number) { setCompletedLessons((current) => current.includes(index) ? current : [...current, index].sort()); setActiveLesson(null); }

  if (activeLesson !== null) {
    return <section className="tutorial-shell tutorial-lesson" aria-label={t.lessons[activeLesson][0]}>
      <LessonTopbar label={t.lessonLabels[activeLesson]} t={t} onOverview={() => setActiveLesson(null)} onClose={onClose} />
      {activeLesson === 0 && <BoardLesson t={t} onComplete={() => completeLesson(0)} />}
      {activeLesson === 1 && <PieceLesson t={t} onComplete={() => completeLesson(1)} />}
      {activeLesson === 2 && <PuzzleLesson kind="capture" t={t} language={language} pieceStyle={pieceStyle} pieceTheme={pieceTheme} onComplete={() => completeLesson(2)} />}
      {activeLesson === 3 && <PuzzleLesson kind="mate" t={t} language={language} pieceStyle={pieceStyle} pieceTheme={pieceTheme} onComplete={() => completeLesson(3)} />}
    </section>;
  }

  return <section className="tutorial-shell" aria-label={t.eyebrow}>
    <div className="tutorial-topbar"><span>{t.eyebrow}</span><button type="button" onClick={onClose}>← {t.backGame}</button></div>
    <div className="tutorial-intro"><div><p>{t.eyebrow}</p><h2>{t.title}</h2><span>{t.intro}</span><button type="button" onClick={() => setActiveLesson(firstIncomplete)}>{completedLessons.length === 4 ? t.review : completedLessons.length ? t.continue : t.start} <b>→</b></button></div><div className="tutorial-emblem" aria-hidden="true"><span>帥</span><i /><span>將</span></div></div>
    <div className="tutorial-progress"><div><span>{t.progress}</span><strong>{completedLessons.length} / 4 {t.completed}</strong></div><div className="tutorial-progress-track"><i style={{ width: `${completedLessons.length * 25}%` }} /></div></div>
    <div className="tutorial-path">{t.lessons.map(([title, description], index) => {
      const complete = completedLessons.includes(index); const unlocked = index === 0 || completedLessons.includes(index - 1);
      return <article className={`${complete ? "is-complete" : unlocked ? "is-current" : "is-locked"}`} key={title}><div className="tutorial-step-number">{complete ? "✓" : String(index + 1).padStart(2, "0")}</div><div className="tutorial-step-copy"><span>{complete ? t.done : unlocked ? (index === 0 ? t.startHere : t.unlocked) : t.locked}</span><h3>{title}</h3><p>{description}</p></div>{unlocked && <button type="button" onClick={() => setActiveLesson(index)} aria-label={title}>→</button>}</article>;
    })}</div>
  </section>;
}

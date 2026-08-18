import { useEffect, useMemo, useState } from "react";
import { getAllLegalMoves, getLegalMoves, isInCheck, type Position } from "../game/rules";
import type { ChessPiece, Language, PieceStyle, PieceTheme, PieceType } from "../types";
import { ChessBoard } from "./ChessBoard";
import { PieceIcon } from "./PieceIcon";

interface TutorialProps {
  language: Language;
  pieceStyle: PieceStyle;
  pieceTheme: PieceTheme;
  onPieceStyleChange: (style: PieceStyle) => void;
  onPieceThemeChange: (theme: PieceTheme) => void;
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
    piecesIntro: "自由选择想了解的棋子，再分别查看移动与吃子示例。所有规则都在正规棋盘上演示。", tapTarget: "点击一个金色落点", practiced: "很好，这一步走对了", nextPiece: "下一个棋子", finishPieces: "完成棋子练习",
    pieceNames: { general: "帅", advisor: "仕", elephant: "相", horse: "马", rook: "车", cannon: "炮", soldier: "兵" },
    pieceTips: { general: "帅每次只能走一格，并且不能离开九宫。", advisor: "仕沿斜线走一格，只能守在九宫内。", elephant: "相走“田”字，不能过河，象眼被堵时不能走。", horse: "马走“日”字；马腿被挡住时不能跳过去。", rook: "车沿横线或竖线直走，路上不能越过棋子。", cannon: "炮不吃子时像车一样走；吃子时必须隔着一个炮架。", soldier: "兵只能向前；过河以后还可以左右走，但不能后退。" },
    pieceGoals: { general: "在高亮九宫内走一格", advisor: "沿九宫斜线走一步", elephant: "避开被堵住的象眼", horse: "避开被挡住的马腿", rook: "在阻挡棋子之前停下", cannon: "隔着炮架吃掉黑卒", soldier: "体验过河后的三个方向" },
    pieceNotes: { general: "棋盘上的浅色区域就是九宫。帅不能走出这九个点。", advisor: "仕只能沿九宫里的斜线移动，不能直走。", elephant: "灰色阻挡物占住了象眼，因此带 × 的落点不能到达。", horse: "马先直走一格再斜走；第一步被堵住时，对应的两个日字落点都会失效。", rook: "车不能跳过任何棋子。灰色阻挡物后方都不可到达。", cannon: "注意三者必须在同一直线上：炮 → 恰好一个炮架 → 敌棋。炮会跳过炮架完成吃子。", soldier: "这里的兵已经过河，所以除了向前，也可以向左或向右一步。" },
    ruleFocus: "本节重点", legendMove: "可走落点", legendBlocked: "阻挡/禁区", legendEnemy: "可以吃的敌棋", screen: "炮架", captureTarget: "点击黑卒，隔炮架完成吃子", captureDone: "漂亮！炮跳过炮架吃掉了黑卒", cannonSteps: ["炮与目标在同一直线", "中间恰好隔着一个炮架", "点击敌棋，炮跳过炮架完成吃子"],
    moveExample: "示例 1 · 基本移动", captureExample: "示例 2 · 实际吃子", tapMoveExample: "点击棋盘上的金色落点", tapCaptureExample: "点击带红色标记的敌方棋子", moveComplete: "移动示例完成", captureComplete: "吃子示例完成", nextCapture: "进入吃子示例", exampleProgress: "本棋子进度",
    displaySettings: "教程棋子设置", pieceForm: "棋子形态", hanziStyle: "汉字", symbolStyle: "图形", pieceThemeLabel: "棋子主题", themeNames: { wood: "木质", jade: "玉石", flat: "扁平" }, choosePiece: "选择想学习的棋子", choosePieceHint: "可以按任意顺序查看，随时切换棋子。", movementTab: "移动示例", captureTab: "吃子示例", viewed: "已练习",
    moveExamples: { general: "帅在九宫内向前移动一格。观察棋盘上的米字格边界。", advisor: "仕从九宫角点沿斜线走到中心，不能横走或直走。", elephant: "相从底线走一个完整的“田”字，落点仍在己方河界内。", horse: "马从底线走“日”字；这一步的马腿没有被挡住。", rook: "车沿同一竖线直走多格，中间没有任何棋子。", cannon: "没有吃子时，炮和车一样沿直线移动，不能越过棋子。", soldier: "未过河的兵只能向前走一格，不能左右移动。" },
    captureExamples: { general: "帅吃掉九宫内相邻的黑卒，但不能走出九宫。", advisor: "仕沿九宫斜线前进一步，吃掉中心的黑卒。", elephant: "相沿“田”字斜走两格，象眼畅通，因此可以吃掉目标。", horse: "马走“日”字吃掉黑卒；马腿位置必须保持空置。", rook: "车沿竖线直进，吃掉路径尽头的黑卒。", cannon: "红炮与黑卒之间恰好隔着一枚炮架，因此可以跳过炮架吃子。", soldier: "兵已经过河，可以向右横走一步并吃掉黑卒。" },
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
    piecesIntro: "Choose any piece you want to learn, then explore its movement and capture examples on a full Xiangqi board.", tapTarget: "Tap a gold destination", practiced: "Nice—this move is correct", nextPiece: "Next piece", finishPieces: "Finish piece practice",
    pieceNames: { general: "King", advisor: "Guard", elephant: "Bishop", horse: "Knight", rook: "Rook", cannon: "Cannon", soldier: "Pawn" },
    pieceTips: { general: "The king moves one point at a time and must remain inside the palace.", advisor: "The guard moves one point diagonally and stays inside the palace.", elephant: "The bishop moves exactly two points diagonally, cannot cross the river, and can be blocked at its midpoint.", horse: "The knight moves in an L shape and can be blocked at the first orthogonal step.", rook: "The rook moves any distance horizontally or vertically without jumping pieces.", cannon: "The cannon moves like a rook, but must jump exactly one screen when capturing.", soldier: "The pawn moves forward; after crossing the river it may also move sideways, but never backward." },
    pieceGoals: { general: "Move one point inside the highlighted palace", advisor: "Move one step diagonally in the palace", elephant: "Avoid the blocked elephant eye", horse: "Avoid the blocked horse leg", rook: "Stop before a blocking piece", cannon: "Capture the black pawn over one screen", soldier: "Try all three directions after crossing" },
    pieceNotes: { general: "The softly highlighted area is the palace. The king may not leave these nine points.", advisor: "The guard follows the diagonal palace lines and never moves orthogonally.", elephant: "The gray blocker occupies the elephant eye, so the destination marked × cannot be reached.", horse: "A knight first steps orthogonally, then diagonally. A blocked first step removes two L-shaped destinations.", rook: "The rook cannot jump any piece. Every point beyond a gray blocker is unavailable.", cannon: "All three must share one line: cannon → exactly one screen → enemy. The cannon jumps the screen to capture.", soldier: "This pawn has crossed the river, so it may move forward, left, or right by one point." },
    ruleFocus: "RULE FOCUS", legendMove: "Legal move", legendBlocked: "Blocker / forbidden", legendEnemy: "Capturable enemy", screen: "SCREEN", captureTarget: "Tap the black pawn to capture over the screen", captureDone: "Great! The cannon jumped the screen and captured the pawn", cannonSteps: ["Align cannon and target on one line", "Leave exactly one screen between them", "Tap the enemy—the cannon jumps the screen to capture"],
    moveExample: "EXAMPLE 1 · MOVEMENT", captureExample: "EXAMPLE 2 · CAPTURE", tapMoveExample: "Tap the gold destination on the board", tapCaptureExample: "Tap the enemy marked in red", moveComplete: "Movement example complete", captureComplete: "Capture example complete", nextCapture: "Continue to capture", exampleProgress: "PIECE PROGRESS",
    displaySettings: "TUTORIAL PIECE SETTINGS", pieceForm: "Piece form", hanziStyle: "Characters", symbolStyle: "Symbols", pieceThemeLabel: "Piece theme", themeNames: { wood: "Wood", jade: "Jade", flat: "Flat" }, choosePiece: "Choose a piece to learn", choosePieceHint: "View the pieces in any order and switch whenever you like.", movementTab: "Movement", captureTab: "Capture", viewed: "Practiced",
    moveExamples: { general: "Move the king one point forward inside the palace. Notice the crossed palace boundary.", advisor: "Move the guard diagonally from a palace corner to its center; it cannot move straight.", elephant: "Move the bishop a full two-point diagonal while remaining on its own side of the river.", horse: "Move the knight in an L shape; its first orthogonal step is clear.", rook: "Move the rook several points along an open file with no piece in its path.", cannon: "Without capturing, the cannon moves along an open line exactly like a rook.", soldier: "Before crossing the river, a pawn may only move one point forward." },
    captureExamples: { general: "Capture the adjacent black pawn while keeping the king inside the palace.", advisor: "Move diagonally through the palace and capture the pawn at its center.", elephant: "Move two points diagonally and capture the target because the elephant eye is clear.", horse: "Use an L-shaped move to capture the pawn; the horse-leg point must remain empty.", rook: "Advance along the file and capture the pawn at the end of the clear path.", cannon: "Exactly one screen stands between the red cannon and black pawn, allowing the cannon to jump and capture.", soldier: "This pawn has crossed the river, so it may step sideways and capture the black pawn." },
    captureIntro: "Select the red rook, then tap the only gold destination. It captures the black pawn and attacks the black king along the file.", captureGoal: "Goal: capture the pawn and give check", captureSuccess: "Done! The pawn is captured and the black king is in check.", selectRook: "Select the red rook first",
    mateIntro: "This is mate in one. The red pawns cover both sides and the knight protects the attacking square. Find the rook's winning move.", mateGoal: "Goal: deliver checkmate in one move", mateSuccess: "Checkmate! Black has no legal reply—you won your first game.",
  },
} as const;

type TutorialText = (typeof tutorialCopy)[Language];
const pieceOrder: PieceType[] = ["general", "advisor", "elephant", "horse", "rook", "cannon", "soldier"];
const tutorialGlyphs: Record<PieceType, string> = { general: "帅", advisor: "仕", elephant: "相", horse: "馬", rook: "車", cannon: "炮", soldier: "兵" };
const tutorialEnglishMarks: Record<PieceType, string> = { general: "K", advisor: "G", elephant: "B", horse: "N", rook: "R", cannon: "C", soldier: "P" };
interface PieceScenario { pieces: ChessPiece[]; actorId: string; target: Position; }
const blackGeneral = (): ChessPiece => ({ id: "lesson-black-general", type: "general", color: "black", row: 0, col: 3 });
const redGeneral = (row = 9, col = 5): ChessPiece => ({ id: "lesson-red-general", type: "general", color: "red", row, col });
const actor = (type: PieceType, row: number, col: number): ChessPiece => ({ id: "lesson-actor", type, color: "red", row, col });
const enemy = (row: number, col: number): ChessPiece => ({ id: "lesson-target", type: "soldier", color: "black", row, col });

const pieceScenarios: Record<PieceType, [PieceScenario, PieceScenario]> = {
  general: [
    { pieces: [blackGeneral(), redGeneral(9, 4)], actorId: "lesson-red-general", target: { row: 8, col: 4 } },
    { pieces: [blackGeneral(), redGeneral(8, 4), enemy(7, 4)], actorId: "lesson-red-general", target: { row: 7, col: 4 } },
  ],
  advisor: [
    { pieces: [blackGeneral(), redGeneral(), actor("advisor", 9, 3)], actorId: "lesson-actor", target: { row: 8, col: 4 } },
    { pieces: [blackGeneral(), redGeneral(), actor("advisor", 7, 3), enemy(8, 4)], actorId: "lesson-actor", target: { row: 8, col: 4 } },
  ],
  elephant: [
    { pieces: [blackGeneral(), redGeneral(), actor("elephant", 9, 2)], actorId: "lesson-actor", target: { row: 7, col: 4 } },
    { pieces: [blackGeneral(), redGeneral(), actor("elephant", 9, 2), enemy(7, 4)], actorId: "lesson-actor", target: { row: 7, col: 4 } },
  ],
  horse: [
    { pieces: [blackGeneral(), redGeneral(), actor("horse", 9, 1)], actorId: "lesson-actor", target: { row: 7, col: 2 } },
    { pieces: [blackGeneral(), redGeneral(), actor("horse", 9, 1), enemy(7, 2)], actorId: "lesson-actor", target: { row: 7, col: 2 } },
  ],
  rook: [
    { pieces: [blackGeneral(), redGeneral(), actor("rook", 9, 0)], actorId: "lesson-actor", target: { row: 5, col: 0 } },
    { pieces: [blackGeneral(), redGeneral(), actor("rook", 9, 0), enemy(5, 0)], actorId: "lesson-actor", target: { row: 5, col: 0 } },
  ],
  cannon: [
    { pieces: [blackGeneral(), redGeneral(), actor("cannon", 7, 1)], actorId: "lesson-actor", target: { row: 7, col: 4 } },
    { pieces: [blackGeneral(), redGeneral(), actor("cannon", 7, 1), { id: "lesson-screen", type: "horse", color: "red", row: 7, col: 4 }, enemy(7, 7)], actorId: "lesson-actor", target: { row: 7, col: 7 } },
  ],
  soldier: [
    { pieces: [blackGeneral(), redGeneral(), actor("soldier", 6, 4)], actorId: "lesson-actor", target: { row: 5, col: 4 } },
    { pieces: [blackGeneral(), redGeneral(), actor("soldier", 4, 4), enemy(4, 5)], actorId: "lesson-actor", target: { row: 4, col: 5 } },
  ],
};

function LessonTopbar({ label, t, onOverview, onClose }: { label: string; t: TutorialText; onOverview: () => void; onClose: () => void }) {
  return <div className="tutorial-topbar"><button type="button" onClick={onOverview}>← {t.overview}</button><span>{label}</span><button type="button" onClick={onClose}>{t.backGame}</button></div>;
}

function TutorialDisplayControls({ t, pieceStyle, pieceTheme, onPieceStyleChange, onPieceThemeChange }: { t: TutorialText; pieceStyle: PieceStyle; pieceTheme: PieceTheme; onPieceStyleChange: (style: PieceStyle) => void; onPieceThemeChange: (theme: PieceTheme) => void }) {
  return <div className="tutorial-display-controls" aria-label={t.displaySettings}>
    <strong>{t.displaySettings}</strong>
    <div><span>{t.pieceForm}</span><button className={pieceStyle === "hanzi" ? "is-active" : ""} type="button" onClick={() => onPieceStyleChange("hanzi")}>{t.hanziStyle}</button><button className={pieceStyle === "symbols" ? "is-active" : ""} type="button" onClick={() => onPieceStyleChange("symbols")}>{t.symbolStyle}</button></div>
    <div><span>{t.pieceThemeLabel}</span>{(["wood", "jade", "flat"] as PieceTheme[]).map((theme) => <button className={pieceTheme === theme ? "is-active" : ""} type="button" key={theme} onClick={() => onPieceThemeChange(theme)}>{t.themeNames[theme]}</button>)}</div>
  </div>;
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

function PieceLesson({ t, language, pieceStyle, pieceTheme, onComplete }: { t: TutorialText; language: Language; pieceStyle: PieceStyle; pieceTheme: PieceTheme; onComplete: () => void }) {
  const [type, setType] = useState<PieceType>("general");
  const [exampleIndex, setExampleIndex] = useState<0 | 1>(0);
  const initialScenario = pieceScenarios.general[0];
  const [pieces, setPieces] = useState<ChessPiece[]>(initialScenario.pieces);
  const [selectedId, setSelectedId] = useState<string | null>(initialScenario.actorId);
  const [practiced, setPracticed] = useState(false);
  const [completedExamples, setCompletedExamples] = useState<Set<string>>(() => new Set());
  const [lastMove, setLastMove] = useState<{ from: Position; to: Position } | null>(null);
  const pieceIndex = pieceOrder.indexOf(type);
  const scenario = pieceScenarios[type][exampleIndex];
  const selectedPiece = pieces.find((piece) => piece.id === selectedId) ?? null;
  const guidedMoves = useMemo(() => selectedPiece && !practiced && getLegalMoves(selectedPiece, pieces).some((move) => move.row === scenario.target.row && move.col === scenario.target.col) ? [scenario.target] : [], [selectedPiece, pieces, practiced, scenario.target.row, scenario.target.col]);
  const lessonGlyph = language === "zh" ? tutorialGlyphs[type] : tutorialEnglishMarks[type];
  function loadScenario(nextType: PieceType, nextExampleIndex: 0 | 1) { const nextScenario = pieceScenarios[nextType][nextExampleIndex]; setType(nextType); setExampleIndex(nextExampleIndex); setPieces(nextScenario.pieces); setSelectedId(nextScenario.actorId); setPracticed(false); setLastMove(null); }
  function move(position: Position) {
    if (!selectedPiece || position.row !== scenario.target.row || position.col !== scenario.target.col) return;
    if (!getLegalMoves(selectedPiece, pieces).some((legal) => legal.row === position.row && legal.col === position.col)) return;
    const next = pieces.filter((piece) => !(piece.row === position.row && piece.col === position.col)).map((piece) => piece.id === selectedPiece.id ? { ...piece, ...position } : piece);
    setPieces(next); setLastMove({ from: { row: selectedPiece.row, col: selectedPiece.col }, to: position }); setSelectedId(null); setPracticed(true); setCompletedExamples((current) => new Set(current).add(`${type}-${exampleIndex}`));
  }
  return <>
    <LessonHeading number={2} title={t.lessons[1][0]} intro={t.piecesIntro} label={t.lessonLabels[1]} />
    <section className="piece-library" aria-label={t.choosePiece}>
      <div className="piece-library-heading"><div><strong>{t.choosePiece}</strong><span>{t.choosePieceHint}</span></div><small>{completedExamples.size} / 14 {t.viewed}</small></div>
      <div className="piece-library-list">{pieceOrder.map((pieceType) => {
        const complete = completedExamples.has(`${pieceType}-0`) && completedExamples.has(`${pieceType}-1`);
        const glyph = language === "zh" ? tutorialGlyphs[pieceType] : tutorialEnglishMarks[pieceType];
        return <button className={`${type === pieceType ? "is-active" : ""} ${complete ? "is-complete" : ""}`} type="button" key={pieceType} onClick={() => loadScenario(pieceType, 0)} aria-pressed={type === pieceType}>
          <span className={`piece-library-token piece-library-token--${pieceTheme} ${pieceStyle === "symbols" ? "is-symbol" : ""}`}>{pieceStyle === "symbols" ? <PieceIcon type={pieceType} /> : glyph}</span>
          <b>{t.pieceNames[pieceType]}</b>{complete && <i>✓</i>}
        </button>;
      })}</div>
    </section>
    <div className="piece-lesson-layout">
      <div className="piece-example-board"><ChessBoard pieces={pieces} selectedId={selectedId} legalMoves={guidedMoves} onPieceClick={(piece) => { if (!practiced && piece.id === scenario.actorId) setSelectedId(piece.id); }} onMove={move} language={language} pieceStyle={pieceStyle} lastMove={lastMove} pieceTheme={pieceTheme} flipped={false} invalidPieceId={null} hintPieceIds={new Set()} onInvalidAction={() => undefined} onBoardClick={() => undefined} onBoardDrop={() => undefined} setupMode={false} /></div>
      <div className="piece-lesson-copy">
        <span className="piece-lesson-count">{String(pieceIndex + 1).padStart(2, "0")} / 07</span>
        <div className={`piece-lesson-icon piece-lesson-icon--${pieceTheme} ${pieceStyle === "symbols" ? "is-symbol" : ""}`}>{pieceStyle === "symbols" ? <PieceIcon type={type} /> : <span>{lessonGlyph}</span>}</div>
        <h3>{t.pieceNames[type]}</h3>
        <div className="piece-example-tabs" aria-label={t.exampleProgress}>
          <button className={exampleIndex === 0 ? "is-active" : ""} type="button" onClick={() => loadScenario(type, 0)}>{completedExamples.has(`${type}-0`) && <span>✓</span>}{t.movementTab}</button>
          <button className={exampleIndex === 1 ? "is-active" : ""} type="button" onClick={() => loadScenario(type, 1)}>{completedExamples.has(`${type}-1`) && <span>✓</span>}{t.captureTab}</button>
        </div>
        <span className="piece-practice-goal">{exampleIndex === 0 ? t.moveExample : t.captureExample}</span><p>{exampleIndex === 0 ? t.moveExamples[type] : t.captureExamples[type]}</p>
        <div className="piece-rule-focus"><b>{t.ruleFocus}</b><p>{t.pieceNotes[type]}</p></div>
        {type === "cannon" && exampleIndex === 1 && <ol className="cannon-rule-steps">{t.cannonSteps.map((step, index) => <li key={step}><span>{index + 1}</span>{step}</li>)}</ol>}
        <strong className={practiced ? "is-done" : ""}>{practiced ? `✓ ${exampleIndex === 0 ? t.moveComplete : type === "cannon" ? t.captureDone : t.captureComplete}` : exampleIndex === 0 ? t.tapMoveExample : t.tapCaptureExample}</strong>
        <button type="button" onClick={onComplete}>{t.finish} →</button>
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

export function Tutorial({ language, pieceStyle, pieceTheme, onPieceStyleChange, onPieceThemeChange, onClose }: TutorialProps) {
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
      <TutorialDisplayControls t={t} pieceStyle={pieceStyle} pieceTheme={pieceTheme} onPieceStyleChange={onPieceStyleChange} onPieceThemeChange={onPieceThemeChange} />
      {activeLesson === 0 && <BoardLesson t={t} onComplete={() => completeLesson(0)} />}
      {activeLesson === 1 && <PieceLesson t={t} language={language} pieceStyle={pieceStyle} pieceTheme={pieceTheme} onComplete={() => completeLesson(1)} />}
      {activeLesson === 2 && <PuzzleLesson kind="capture" t={t} language={language} pieceStyle={pieceStyle} pieceTheme={pieceTheme} onComplete={() => completeLesson(2)} />}
      {activeLesson === 3 && <PuzzleLesson kind="mate" t={t} language={language} pieceStyle={pieceStyle} pieceTheme={pieceTheme} onComplete={() => completeLesson(3)} />}
    </section>;
  }

  return <section className="tutorial-shell" aria-label={t.eyebrow}>
    <div className="tutorial-topbar"><span>{t.eyebrow}</span><button type="button" onClick={onClose}>← {t.backGame}</button></div>
    <TutorialDisplayControls t={t} pieceStyle={pieceStyle} pieceTheme={pieceTheme} onPieceStyleChange={onPieceStyleChange} onPieceThemeChange={onPieceThemeChange} />
    <div className="tutorial-intro"><div><p>{t.eyebrow}</p><h2>{t.title}</h2><span>{t.intro}</span><button type="button" onClick={() => setActiveLesson(firstIncomplete)}>{completedLessons.length === 4 ? t.review : completedLessons.length ? t.continue : t.start} <b>→</b></button></div><div className="tutorial-emblem" aria-hidden="true"><span>帥</span><i /><span>將</span></div></div>
    <div className="tutorial-progress"><div><span>{t.progress}</span><strong>{completedLessons.length} / 4 {t.completed}</strong></div><div className="tutorial-progress-track"><i style={{ width: `${completedLessons.length * 25}%` }} /></div></div>
    <div className="tutorial-path">{t.lessons.map(([title, description], index) => {
      const complete = completedLessons.includes(index); const unlocked = index === 0 || completedLessons.includes(index - 1);
      return <article className={`${complete ? "is-complete" : unlocked ? "is-current" : "is-locked"}`} key={title}><div className="tutorial-step-number">{complete ? "✓" : String(index + 1).padStart(2, "0")}</div><div className="tutorial-step-copy"><span>{complete ? t.done : unlocked ? (index === 0 ? t.startHere : t.unlocked) : t.locked}</span><h3>{title}</h3><p>{description}</p></div>{unlocked && <button type="button" onClick={() => setActiveLesson(index)} aria-label={title}>→</button>}</article>;
    })}</div>
  </section>;
}

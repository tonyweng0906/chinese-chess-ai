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
    eyebrow: "新手教程", title: "从第一步开始，认识中国象棋", intro: "用四节简短课程认识棋盘、棋子和胜负规则。无需基础，跟着提示一步一步练习。", backGame: "返回棋局", progress: "学习进度", completed: "已完成", start: "开始学习", continue: "继续学习", review: "重新复习", startHere: "从这里开始", unlocked: "已解锁", locked: "完成上一课后解锁", done: "已完成", overview: "课程总览", finish: "完成本课", nextChapter: "下一章节：", finishCourse: "完成课程",
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
    piecesIntro: "自由选择想了解的棋子，通过可行走法与规则辨析案例掌握移动、吃子和特殊限制。", tapTarget: "点击一个金色落点", practiced: "很好，这一步走对了", nextPiece: "下一个棋子", finishPieces: "完成棋子练习",
    pieceNames: { general: "帅", advisor: "仕", elephant: "相", horse: "马", rook: "车", cannon: "炮", soldier: "兵" },
    pieceTips: { general: "帅每次只能走一格，并且不能离开九宫。", advisor: "仕沿斜线走一格，只能守在九宫内。", elephant: "相走“田”字，不能过河，象眼被堵时不能走。", horse: "马走“日”字；马腿被挡住时不能跳过去。", rook: "车沿横线或竖线直走，路上不能越过棋子。", cannon: "炮不吃子时像车一样走；吃子时必须隔着一个炮架。", soldier: "兵只能向前；过河以后还可以左右走，但不能后退。" },
    pieceGoals: { general: "在高亮九宫内走一格", advisor: "沿九宫斜线走一步", elephant: "避开被堵住的象眼", horse: "避开被挡住的马腿", rook: "在阻挡棋子之前停下", cannon: "隔着炮架吃掉黑卒", soldier: "体验过河后的三个方向" },
    pieceNotes: { general: "棋盘上的浅色区域就是九宫。帅不能走出这九个点。", advisor: "仕只能沿九宫里的斜线移动，不能直走。", elephant: "灰色阻挡物占住了象眼，因此带 × 的落点不能到达。", horse: "马先直走一格再斜走；第一步被堵住时，对应的两个日字落点都会失效。", rook: "车不能跳过任何棋子。灰色阻挡物后方都不可到达。", cannon: "注意三者必须在同一直线上：炮 → 恰好一个炮架 → 敌棋。炮会跳过炮架完成吃子。", soldier: "这里的兵已经过河，所以除了向前，也可以向左或向右一步。" },
    ruleFocus: "本节重点", legendMove: "可走落点", legendBlocked: "阻挡/禁区", legendEnemy: "可以吃的敌棋", screen: "炮架", captureTarget: "点击黑卒，隔炮架完成吃子", captureDone: "漂亮！炮跳过炮架吃掉了黑卒", cannonSteps: ["炮与目标在同一直线", "中间恰好隔着一个炮架", "点击敌棋，炮跳过炮架完成吃子"],
    moveExample: "示例 1 · 基本移动", captureExample: "示例 2 · 实际吃子", tapMoveExample: "点击棋盘上的金色落点", tapCaptureExample: "点击带红色标记的敌方棋子", moveComplete: "移动示例完成", captureComplete: "吃子示例完成", nextCapture: "进入吃子示例", exampleProgress: "本棋子进度",
    displaySettings: "教程棋子设置", pieceForm: "棋子形态", hanziStyle: "汉字", symbolStyle: "图形", pieceThemeLabel: "棋子主题", themeNames: { wood: "木质", jade: "玉石", flat: "扁平" }, choosePiece: "选择想学习的棋子", choosePieceHint: "每枚棋子包含 3—4 个案例，可以按任意顺序查看。", movementTab: "移动示例", captureTab: "吃子示例", viewed: "已练习", freePractice: "自由练习已开启：继续点击任意金色落点", movesMade: "连续行棋", moveUnit: "步", restartExample: "重新摆放",
    moveExamples: { general: "帅在九宫内向前移动一格。观察棋盘上的米字格边界。", advisor: "仕从九宫角点沿斜线走到中心，不能横走或直走。", elephant: "相从底线走一个完整的“田”字，落点仍在己方河界内。", horse: "马从底线走“日”字；这一步的马腿没有被挡住。", rook: "车沿同一竖线直走多格，中间没有任何棋子。", cannon: "没有吃子时，炮和车一样沿直线移动，不能越过棋子。", soldier: "未过河的兵只能向前走一格，不能左右移动。" },
    captureExamples: { general: "帅吃掉九宫内相邻的黑卒，但不能走出九宫。", advisor: "仕沿九宫斜线前进一步，吃掉中心的黑卒。", elephant: "相沿“田”字斜走两格，象眼畅通，因此可以吃掉目标。", horse: "马走“日”字吃掉黑卒；马腿位置必须保持空置。", rook: "车沿竖线直进，吃掉路径尽头的黑卒。", cannon: "红炮与黑卒之间恰好隔着一枚炮架，因此可以跳过炮架吃子。", soldier: "兵已经过河，可以向右横走一步并吃掉黑卒。" },
    captureIntro: "选择红车，再点击唯一的金色落点。红车会吃掉黑卒，并沿直线攻击黑将。", captureGoal: "目标：吃掉黑卒并形成将军", captureSuccess: "完成！黑卒被吃掉，黑将正处于将军。", selectRook: "先选择红车",
    mateIntro: "这是一个一步将死局面。红兵封住两侧，红马保护进攻位置。找到红车的制胜落点。", mateGoal: "目标：一步将死并赢下对局", mateSuccess: "将死！黑方没有任何合法应对，你赢下了第一局。",
  },
  en: {
    eyebrow: "BEGINNER GUIDE", title: "Learn Xiangqi from your very first move", intro: "Four short lessons introduce the board, pieces, and winning rules. No experience needed—learn one step at a time.", backGame: "Back to game", progress: "Learning progress", completed: "completed", start: "Start learning", continue: "Continue", review: "Review course", startHere: "Start here", unlocked: "Unlocked", locked: "Complete the previous lesson", done: "Completed", overview: "Course overview", finish: "Complete lesson", nextChapter: "Next chapter: ", finishCourse: "Finish course",
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
    piecesIntro: "Choose any piece and learn through legal moves, captures, and interactive rule checks on a full board.", tapTarget: "Tap a gold destination", practiced: "Nice—this move is correct", nextPiece: "Next piece", finishPieces: "Finish piece practice",
    pieceNames: { general: "King", advisor: "Guard", elephant: "Bishop", horse: "Knight", rook: "Rook", cannon: "Cannon", soldier: "Pawn" },
    pieceTips: { general: "The king moves one point at a time and must remain inside the palace.", advisor: "The guard moves one point diagonally and stays inside the palace.", elephant: "The bishop moves exactly two points diagonally, cannot cross the river, and can be blocked at its midpoint.", horse: "The knight moves in an L shape and can be blocked at the first orthogonal step.", rook: "The rook moves any distance horizontally or vertically without jumping pieces.", cannon: "The cannon moves like a rook, but must jump exactly one screen when capturing.", soldier: "The pawn moves forward; after crossing the river it may also move sideways, but never backward." },
    pieceGoals: { general: "Move one point inside the highlighted palace", advisor: "Move one step diagonally in the palace", elephant: "Avoid the blocked elephant eye", horse: "Avoid the blocked horse leg", rook: "Stop before a blocking piece", cannon: "Capture the black pawn over one screen", soldier: "Try all three directions after crossing" },
    pieceNotes: { general: "The softly highlighted area is the palace. The king may not leave these nine points.", advisor: "The guard follows the diagonal palace lines and never moves orthogonally.", elephant: "The gray blocker occupies the elephant eye, so the destination marked × cannot be reached.", horse: "A knight first steps orthogonally, then diagonally. A blocked first step removes two L-shaped destinations.", rook: "The rook cannot jump any piece. Every point beyond a gray blocker is unavailable.", cannon: "All three must share one line: cannon → exactly one screen → enemy. The cannon jumps the screen to capture.", soldier: "This pawn has crossed the river, so it may move forward, left, or right by one point." },
    ruleFocus: "RULE FOCUS", legendMove: "Legal move", legendBlocked: "Blocker / forbidden", legendEnemy: "Capturable enemy", screen: "SCREEN", captureTarget: "Tap the black pawn to capture over the screen", captureDone: "Great! The cannon jumped the screen and captured the pawn", cannonSteps: ["Align cannon and target on one line", "Leave exactly one screen between them", "Tap the enemy—the cannon jumps the screen to capture"],
    moveExample: "EXAMPLE 1 · MOVEMENT", captureExample: "EXAMPLE 2 · CAPTURE", tapMoveExample: "Tap the gold destination on the board", tapCaptureExample: "Tap the enemy marked in red", moveComplete: "Movement example complete", captureComplete: "Capture example complete", nextCapture: "Continue to capture", exampleProgress: "PIECE PROGRESS",
    displaySettings: "TUTORIAL PIECE SETTINGS", pieceForm: "Piece form", hanziStyle: "Characters", symbolStyle: "Symbols", pieceThemeLabel: "Piece theme", themeNames: { wood: "Wood", jade: "Jade", flat: "Flat" }, choosePiece: "Choose a piece to learn", choosePieceHint: "Each piece has 3–4 examples; view them in any order.", movementTab: "Movement", captureTab: "Capture", viewed: "Practiced", freePractice: "Free practice is active: choose any gold destination", movesMade: "Moves made", moveUnit: "moves", restartExample: "Reset position",
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
interface PieceScenario { id: string; valid: boolean; freeMove?: boolean; pieces: ChessPiece[]; actorId: string; target: Position; }
interface ScenarioText { tab: string; description: string; focus: string; instruction: string; success: string; }
const blackGeneral = (): ChessPiece => ({ id: "lesson-black-general", type: "general", color: "black", row: 0, col: 3 });
const redGeneral = (row = 9, col = 5): ChessPiece => ({ id: "lesson-red-general", type: "general", color: "red", row, col });
const actor = (type: PieceType, row: number, col: number): ChessPiece => ({ id: "lesson-actor", type, color: "red", row, col });
const enemy = (row: number, col: number): ChessPiece => ({ id: "lesson-target", type: "soldier", color: "black", row, col });
const blocker = (id: string, row: number, col: number, type: PieceType = "soldier"): ChessPiece => ({ id, type, color: "red", row, col });

const pieceScenarios: Record<PieceType, PieceScenario[]> = {
  general: [
    { id: "general-step", valid: true, freeMove: true, pieces: [blackGeneral(), redGeneral(9, 4)], actorId: "lesson-red-general", target: { row: 8, col: 4 } },
    { id: "general-capture", valid: true, pieces: [blackGeneral(), redGeneral(8, 4), enemy(7, 4)], actorId: "lesson-red-general", target: { row: 7, col: 4 } },
    { id: "general-facing", valid: false, pieces: [{ ...blackGeneral(), col: 4 }, redGeneral(9, 3)], actorId: "lesson-red-general", target: { row: 9, col: 4 } },
  ],
  advisor: [
    { id: "advisor-step", valid: true, freeMove: true, pieces: [blackGeneral(), redGeneral(), actor("advisor", 9, 3)], actorId: "lesson-actor", target: { row: 8, col: 4 } },
    { id: "advisor-capture", valid: true, pieces: [blackGeneral(), redGeneral(), actor("advisor", 7, 3), enemy(8, 4)], actorId: "lesson-actor", target: { row: 8, col: 4 } },
    { id: "advisor-palace", valid: false, pieces: [blackGeneral(), redGeneral(), actor("advisor", 7, 3)], actorId: "lesson-actor", target: { row: 6, col: 2 } },
  ],
  elephant: [
    { id: "elephant-step", valid: true, freeMove: true, pieces: [blackGeneral(), redGeneral(), actor("elephant", 9, 2)], actorId: "lesson-actor", target: { row: 7, col: 4 } },
    { id: "elephant-capture", valid: true, pieces: [blackGeneral(), redGeneral(), actor("elephant", 9, 2), enemy(7, 4)], actorId: "lesson-actor", target: { row: 7, col: 4 } },
    { id: "elephant-eye", valid: false, pieces: [blackGeneral(), redGeneral(), actor("elephant", 9, 2), blocker("lesson-eye", 8, 3)], actorId: "lesson-actor", target: { row: 7, col: 4 } },
    { id: "elephant-river", valid: false, pieces: [blackGeneral(), redGeneral(), actor("elephant", 5, 2)], actorId: "lesson-actor", target: { row: 3, col: 4 } },
  ],
  horse: [
    { id: "horse-step", valid: true, freeMove: true, pieces: [blackGeneral(), redGeneral(), actor("horse", 9, 1)], actorId: "lesson-actor", target: { row: 7, col: 2 } },
    { id: "horse-capture", valid: true, pieces: [blackGeneral(), redGeneral(), actor("horse", 9, 1), enemy(7, 2)], actorId: "lesson-actor", target: { row: 7, col: 2 } },
    { id: "horse-leg", valid: false, pieces: [blackGeneral(), redGeneral(), actor("horse", 9, 1), blocker("lesson-leg", 8, 1)], actorId: "lesson-actor", target: { row: 7, col: 2 } },
  ],
  rook: [
    { id: "rook-step", valid: true, freeMove: true, pieces: [blackGeneral(), redGeneral(), actor("rook", 9, 0)], actorId: "lesson-actor", target: { row: 5, col: 0 } },
    { id: "rook-capture", valid: true, pieces: [blackGeneral(), redGeneral(), actor("rook", 9, 0), enemy(5, 0)], actorId: "lesson-actor", target: { row: 5, col: 0 } },
    { id: "rook-blocked", valid: false, pieces: [blackGeneral(), redGeneral(), actor("rook", 9, 0), blocker("lesson-rook-block", 7, 0)], actorId: "lesson-actor", target: { row: 5, col: 0 } },
  ],
  cannon: [
    { id: "cannon-step", valid: true, freeMove: true, pieces: [blackGeneral(), redGeneral(), actor("cannon", 7, 1)], actorId: "lesson-actor", target: { row: 7, col: 4 } },
    { id: "cannon-screen", valid: true, pieces: [blackGeneral(), redGeneral(), actor("cannon", 7, 1), blocker("lesson-screen", 7, 4, "horse"), enemy(7, 7)], actorId: "lesson-actor", target: { row: 7, col: 7 } },
    { id: "cannon-no-screen", valid: false, pieces: [blackGeneral(), redGeneral(), actor("cannon", 7, 1), enemy(7, 7)], actorId: "lesson-actor", target: { row: 7, col: 7 } },
    { id: "cannon-two-screens", valid: false, pieces: [blackGeneral(), redGeneral(), actor("cannon", 7, 1), blocker("lesson-screen-one", 7, 3), blocker("lesson-screen-two", 7, 5), enemy(7, 7)], actorId: "lesson-actor", target: { row: 7, col: 7 } },
  ],
  soldier: [
    { id: "soldier-forward", valid: true, freeMove: true, pieces: [blackGeneral(), redGeneral(), actor("soldier", 6, 4)], actorId: "lesson-actor", target: { row: 5, col: 4 } },
    { id: "soldier-sideways", valid: true, pieces: [blackGeneral(), redGeneral(), actor("soldier", 4, 4)], actorId: "lesson-actor", target: { row: 4, col: 3 } },
    { id: "soldier-capture", valid: true, pieces: [blackGeneral(), redGeneral(), actor("soldier", 4, 4), enemy(4, 5)], actorId: "lesson-actor", target: { row: 4, col: 5 } },
    { id: "soldier-backward", valid: false, pieces: [blackGeneral(), redGeneral(), actor("soldier", 4, 4)], actorId: "lesson-actor", target: { row: 5, col: 4 } },
  ],
};

const pieceScenarioCopy: Record<string, Record<Language, ScenarioText>> = {
  "general-step": { zh: { tab: "九宫移动", description: "帅每次只能横走或直走一格，并且必须留在九宫内。", focus: "金色落点仍在下方九宫内。九宫外的交叉点不会成为合法落点。", instruction: "点击金色落点，让帅在九宫内前进一步", success: "帅在九宫内完成了一格移动" }, en: { tab: "Palace move", description: "The king moves exactly one point orthogonally and must stay in the palace.", focus: "The gold point remains inside the lower palace; intersections outside it are illegal.", instruction: "Move the king one point inside the palace", success: "The king moved one point inside the palace" } },
  "general-capture": { zh: { tab: "近身吃子", description: "帅也能吃掉相邻的敌棋，但落点仍必须安全且位于九宫内。", focus: "吃子不会让帅获得额外距离；它仍然只能移动一格。", instruction: "点击黑卒，让帅吃掉相邻敌棋", success: "帅吃掉了九宫内相邻的黑卒" }, en: { tab: "Capture", description: "The king may capture an adjacent enemy if the destination is safe and inside the palace.", focus: "Capturing does not extend its range; the king still moves only one point.", instruction: "Capture the adjacent black pawn", success: "The king captured the adjacent pawn" } },
  "general-facing": { zh: { tab: "将帅照面", description: "将和帅不能在同一条竖线上直接面对，中间必须至少隔着一枚棋子。", focus: "如果帅走到红色叉号处，双方将帅之间没有任何棋子，因此这一步违规。", instruction: "点击红色叉号，观察为什么帅不能走到这里", success: "正确识别：这一步会造成将帅照面，不能落子" }, en: { tab: "Facing kings", description: "The two kings may not face each other on the same open file.", focus: "Moving to the red X would leave no piece between the kings, so the move is forbidden.", instruction: "Tap the red X to test the forbidden move", success: "Correct: the move would leave the kings facing" } },
  "advisor-step": { zh: { tab: "斜线移动", description: "仕每次沿九宫斜线走一格。", focus: "仕不能横走或直走，只能在九宫五个斜线交点之间活动。", instruction: "沿九宫斜线走到中心", success: "仕沿斜线进入了九宫中心" }, en: { tab: "Diagonal move", description: "The guard moves one point diagonally along palace lines.", focus: "It never moves orthogonally and only uses the five diagonal palace points.", instruction: "Move diagonally to the palace center", success: "The guard reached the palace center" } },
  "advisor-capture": { zh: { tab: "斜线吃子", description: "仕可以沿同样的九宫斜线吃掉敌棋。", focus: "吃子规则不会改变仕的移动方式：仍是一格斜线。", instruction: "沿斜线吃掉九宫中心的黑卒", success: "仕沿九宫斜线完成吃子" }, en: { tab: "Capture", description: "The guard captures using the same one-point palace diagonal.", focus: "Capturing does not change the guard's movement pattern.", instruction: "Capture the pawn at the palace center", success: "The guard captured along a palace diagonal" } },
  "advisor-palace": { zh: { tab: "不能出宫", description: "仕无论移动还是吃子，都不能离开己方九宫。", focus: "红色叉号虽然是斜线方向，但已经位于九宫之外。", instruction: "点击红色叉号，验证仕不能离开九宫", success: "正确识别：仕不能走出九宫" }, en: { tab: "Stay in palace", description: "A guard may never leave its own palace.", focus: "The red X is diagonal, but it lies outside the palace.", instruction: "Tap the red X to test leaving the palace", success: "Correct: the guard cannot leave the palace" } },
  "elephant-step": { zh: { tab: "相走田", description: "相每次沿斜线走两格，也就是俗称的“走田”。", focus: "起点与终点之间的中心交叉点叫象眼。象眼畅通时才能移动。", instruction: "点击金色落点，完成一个田字", success: "相完成了一次走田" }, en: { tab: "Two diagonals", description: "The elephant moves exactly two points diagonally.", focus: "The midpoint is the elephant eye and must be empty.", instruction: "Complete the two-point diagonal move", success: "The elephant completed its move" } },
  "elephant-capture": { zh: { tab: "走田吃子", description: "相按照同样的田字路线吃掉落点上的敌棋。", focus: "只要象眼没有被挡住，并且没有过河，就可以吃子。", instruction: "走田吃掉黑卒", success: "相沿田字路线完成吃子" }, en: { tab: "Capture", description: "The elephant captures on the destination of the same two-point diagonal.", focus: "The eye must be clear and the move must remain on its own side.", instruction: "Capture the pawn with the elephant", success: "The elephant captured along its diagonal" } },
  "elephant-eye": { zh: { tab: "塞象眼", description: "象眼被任何棋子占住时，相不能跳过去，这叫“塞象眼”。", focus: "红兵正好位于相与红色叉号的中点，因此右上方落点被封锁。", instruction: "点击红色叉号，观察塞象眼的效果", success: "正确识别：象眼被占，相不能走田" }, en: { tab: "Blocked eye", description: "An elephant cannot move when any piece occupies its midpoint eye.", focus: "The red pawn sits exactly between the elephant and the red X.", instruction: "Tap the red X to test the blocked eye", success: "Correct: the occupied eye blocks the elephant" } },
  "elephant-river": { zh: { tab: "相不过河", description: "红相只能留在楚河汉界的己方一侧，不能走到河对岸。", focus: "这一步虽然符合田字形状，但终点已经越过河界，因此违规。", instruction: "点击河对岸的红色叉号", success: "正确识别：相不能过河" }, en: { tab: "No river crossing", description: "The red elephant must remain on its own side of the river.", focus: "The shape is correct, but its destination is across the river.", instruction: "Tap the red X across the river", success: "Correct: the elephant cannot cross the river" } },
  "horse-step": { zh: { tab: "马走日", description: "马先沿横线或竖线走一格，再斜走一格，形成“日”字。", focus: "第一段直线方向决定马腿位置；这里马腿畅通。", instruction: "点击金色落点完成马走日", success: "马在马腿畅通时完成了日字移动" }, en: { tab: "Knight move", description: "The horse steps one point orthogonally, then one diagonally.", focus: "The first orthogonal point is the horse leg; it is clear here.", instruction: "Complete the horse move", success: "The horse completed its L-shaped move" } },
  "horse-capture": { zh: { tab: "走日吃子", description: "马在日字终点吃子，仍然需要检查马腿是否畅通。", focus: "黑卒位于日字终点，且马腿没有棋子阻挡。", instruction: "走日吃掉黑卒", success: "马走日完成吃子" }, en: { tab: "Capture", description: "The horse captures at the end of its L-shaped move, provided its leg is clear.", focus: "The pawn is at the destination and the horse leg is open.", instruction: "Capture the pawn with the horse", success: "The horse captured the pawn" } },
  "horse-leg": { zh: { tab: "蹩马腿", description: "马腿位置被棋子占住时，对应方向的两个日字落点都不能走。", focus: "红兵堵住了马向前的第一步，所以马不能到达红色叉号。", instruction: "点击红色叉号，观察蹩马腿", success: "正确识别：马腿被蹩，这个日字不能走" }, en: { tab: "Blocked leg", description: "A piece on the horse-leg point blocks both L-shaped moves in that direction.", focus: "The red pawn blocks the horse's first forward step.", instruction: "Tap the red X to test the blocked leg", success: "Correct: the blocked leg prevents this move" } },
  "rook-step": { zh: { tab: "直线移动", description: "车能沿横线或竖线移动任意格数。", focus: "路径上的每一个交叉点都必须为空，车不能拐弯。", instruction: "沿直线把车向前移动四格", success: "车沿畅通直线完成移动" }, en: { tab: "Straight move", description: "The rook moves any number of points horizontally or vertically.", focus: "Every point along its path must be empty and it cannot turn.", instruction: "Move the rook four points forward", success: "The rook moved along the open file" } },
  "rook-capture": { zh: { tab: "直线吃子", description: "车可以吃掉畅通直线末端的第一枚敌棋。", focus: "被吃棋子之前不能有其他棋子阻挡。", instruction: "沿竖线吃掉黑卒", success: "车沿直线完成吃子" }, en: { tab: "Capture", description: "The rook captures the first enemy on an open rank or file.", focus: "No piece may stand between the rook and its target.", instruction: "Capture the pawn along the file", success: "The rook captured along a straight line" } },
  "rook-blocked": { zh: { tab: "不能跳子", description: "车不能越过己方或敌方棋子。", focus: "红兵挡在车与红色叉号之间，所以车无法跳到兵的后方。", instruction: "点击红色叉号，验证车不能跳子", success: "正确识别：路径被挡，车不能越过棋子" }, en: { tab: "Cannot jump", description: "The rook cannot jump over friendly or enemy pieces.", focus: "The red pawn blocks the path to the red X.", instruction: "Tap the red X beyond the blocker", success: "Correct: the rook cannot jump a piece" } },
  "cannon-step": { zh: { tab: "普通移动", description: "炮不吃子时与车相同，只能沿畅通的横线或竖线移动。", focus: "普通移动不能越过任何棋子，也不需要炮架。", instruction: "沿横线移动红炮", success: "炮沿畅通直线完成普通移动" }, en: { tab: "Normal move", description: "Without capturing, the cannon moves like a rook along an open line.", focus: "It cannot jump during a normal move and needs no screen.", instruction: "Move the cannon along the rank", success: "The cannon completed a normal move" } },
  "cannon-screen": { zh: { tab: "一个炮架", description: "炮吃子时，炮与目标之间必须恰好隔着一枚棋子作为炮架。", focus: "红马是唯一炮架。炮会跳过红马，吃掉同一直线上的黑卒。", instruction: "点击黑卒，隔一个炮架完成吃子", success: "炮隔着唯一炮架吃掉了黑卒" }, en: { tab: "One screen", description: "A cannon capture requires exactly one intervening screen.", focus: "The red horse is the only screen between cannon and pawn.", instruction: "Capture the pawn over one screen", success: "The cannon captured over exactly one screen" } },
  "cannon-no-screen": { zh: { tab: "没有炮架", description: "炮不能像车一样直接吃子；吃子时没有炮架反而不合法。", focus: "红炮与黑卒之间完全空着，因此不能吃掉黑卒。", instruction: "点击黑卒，观察没有炮架时为何不能吃", success: "正确识别：没有炮架，炮不能吃子" }, en: { tab: "No screen", description: "A cannon cannot capture like a rook; zero screens makes the capture illegal.", focus: "The line between cannon and pawn is completely empty.", instruction: "Tap the pawn to test a capture with no screen", success: "Correct: a cannon needs a screen to capture" } },
  "cannon-two-screens": { zh: { tab: "两个炮架", description: "炮也不能跳过两枚或更多棋子吃子。", focus: "两枚红兵都在路径上，炮架数量超过一个，因此黑卒不能被吃。", instruction: "点击黑卒，观察两个炮架为何过多", success: "正确识别：炮吃子只能隔一个炮架" }, en: { tab: "Two screens", description: "A cannon also cannot capture over two or more intervening pieces.", focus: "Two red pawns stand in the path, which is one screen too many.", instruction: "Tap the pawn to test two screens", success: "Correct: a cannon capture needs exactly one screen" } },
  "soldier-forward": { zh: { tab: "过河前", description: "红兵过河前每次只能向黑方方向前进一步。", focus: "红方的前进方向是棋盘上方；此时兵还不能左右移动。", instruction: "让未过河的兵向前走一步", success: "兵在过河前向前移动了一步" }, en: { tab: "Before river", description: "Before crossing the river, a red pawn may move only one point forward.", focus: "Red moves upward on this board and cannot yet move sideways.", instruction: "Move the pawn one point forward", success: "The pawn moved forward before crossing" } },
  "soldier-sideways": { zh: { tab: "过河横走", description: "兵过河后除向前外，还可以向左或向右走一格。", focus: "兵仍然每次只走一格；过河不会让它斜走或后退。", instruction: "让已经过河的兵向左横走一步", success: "兵过河后完成了一次横向移动" }, en: { tab: "Sideways after river", description: "After crossing the river, a pawn may also move one point left or right.", focus: "It still moves one point and never gains diagonal or backward movement.", instruction: "Move the crossed pawn one point sideways", success: "The pawn moved sideways after crossing" } },
  "soldier-capture": { zh: { tab: "横向吃子", description: "过河后的兵可以用横向一步吃掉相邻敌棋。", focus: "兵的吃子方式与移动方式相同，不像国际象棋那样斜吃。", instruction: "向右一步吃掉黑卒", success: "过河兵横向一步完成吃子" }, en: { tab: "Side capture", description: "A crossed pawn may capture an adjacent enemy with a sideways step.", focus: "Xiangqi pawns capture exactly as they move; they do not capture diagonally.", instruction: "Step right and capture the black pawn", success: "The crossed pawn captured sideways" } },
  "soldier-backward": { zh: { tab: "永不后退", description: "兵无论是否过河，都永远不能向己方底线后退。", focus: "过河只增加左右方向，不会解锁后退。", instruction: "点击后方红色叉号，验证兵不能后退", success: "正确识别：兵过河后仍然不能后退" }, en: { tab: "Never backward", description: "A pawn can never move backward, before or after crossing the river.", focus: "Crossing only adds sideways movement; it never unlocks retreat.", instruction: "Tap the red X behind the pawn", success: "Correct: a pawn can never move backward" } },
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

function LessonNavigation({ t, nextTitle, onComplete, onNext, final = false }: { t: TutorialText; nextTitle?: string; onComplete: () => void; onNext?: () => void; final?: boolean }) {
  return <div className="lesson-navigation"><button type="button" onClick={onComplete}>{final ? t.finishCourse : t.finish}</button>{nextTitle && onNext && <button className="is-next" type="button" onClick={onNext}>{t.nextChapter}{nextTitle} →</button>}</div>;
}

function BoardLesson({ t, onComplete, onNext }: { t: TutorialText; onComplete: () => void; onNext: () => void }) {
  return <>
    <LessonHeading number={1} title={t.lessons[0][0]} intro={t.boardIntro} label={t.lessonLabels[0]} />
    <div className="lesson-content">
      <div className="tutorial-board-demo" aria-label={t.lessons[0][0]}><span className="demo-side demo-side--top">{t.boardTop}</span><div className="demo-palace demo-palace--top" /><div className="demo-river">{t.river}</div><div className="demo-palace demo-palace--bottom" /><span className="demo-side demo-side--bottom">{t.boardBottom}</span></div>
      <div className="lesson-facts">{t.boardFacts.map(([title, description], index) => <article key={title}><span>0{index + 1}</span><div><h3>{title}</h3><p>{description}</p></div></article>)}<LessonNavigation t={t} nextTitle={t.lessons[1][0]} onComplete={onComplete} onNext={onNext} /></div>
    </div>
  </>;
}

function PieceLesson({ t, language, pieceStyle, pieceTheme, onComplete, onNext }: { t: TutorialText; language: Language; pieceStyle: PieceStyle; pieceTheme: PieceTheme; onComplete: () => void; onNext: () => void }) {
  const [type, setType] = useState<PieceType>("general");
  const [exampleIndex, setExampleIndex] = useState(0);
  const initialScenario = pieceScenarios.general[0];
  const [pieces, setPieces] = useState<ChessPiece[]>(initialScenario.pieces);
  const [selectedId, setSelectedId] = useState<string | null>(initialScenario.actorId);
  const [practiced, setPracticed] = useState(false);
  const [completedExamples, setCompletedExamples] = useState<Set<string>>(() => new Set());
  const [lastMove, setLastMove] = useState<{ from: Position; to: Position } | null>(null);
  const [freeMoveCount, setFreeMoveCount] = useState(0);
  const pieceIndex = pieceOrder.indexOf(type);
  const scenario = pieceScenarios[type][exampleIndex];
  const scenarioText = pieceScenarioCopy[scenario.id][language];
  const selectedPiece = pieces.find((piece) => piece.id === selectedId) ?? null;
  const availableMoves = useMemo(() => selectedPiece ? getLegalMoves(selectedPiece, pieces).filter((move) => !pieces.some((piece) => piece.row === move.row && piece.col === move.col && piece.type === "general")) : [], [selectedPiece, pieces]);
  const targetIsLegal = availableMoves.some((move) => move.row === scenario.target.row && move.col === scenario.target.col);
  const guidedMoves = selectedPiece && scenario.freeMove && practiced ? availableMoves : selectedPiece && !practiced && scenario.valid && targetIsLegal ? [scenario.target] : [];
  const guidedInvalidMoves = selectedPiece && !practiced && !scenario.valid && !targetIsLegal ? [scenario.target] : [];
  const detailHintIds = useMemo(() => new Set(pieces.filter((piece) => piece.id.startsWith("lesson-eye") || piece.id.startsWith("lesson-leg") || piece.id.startsWith("lesson-rook-block") || piece.id.startsWith("lesson-screen")).map((piece) => piece.id)), [pieces]);
  const lessonGlyph = language === "zh" ? tutorialGlyphs[type] : tutorialEnglishMarks[type];
  const totalExamples = pieceOrder.reduce((total, pieceType) => total + pieceScenarios[pieceType].length, 0);
  function loadScenario(nextType: PieceType, nextExampleIndex: number) { const nextScenario = pieceScenarios[nextType][nextExampleIndex]; if (!nextScenario) return; setType(nextType); setExampleIndex(nextExampleIndex); setPieces(nextScenario.pieces); setSelectedId(nextScenario.actorId); setPracticed(false); setLastMove(null); setFreeMoveCount(0); }
  function markPracticed() { setPracticed(true); setCompletedExamples((current) => new Set(current).add(scenario.id)); }
  function move(position: Position) {
    if (!scenario.valid || !selectedPiece) return;
    const isGuidedMove = !practiced && position.row === scenario.target.row && position.col === scenario.target.col && targetIsLegal;
    const isFreeMove = practiced && scenario.freeMove && availableMoves.some((legal) => legal.row === position.row && legal.col === position.col);
    if (!isGuidedMove && !isFreeMove) return;
    const next = pieces.filter((piece) => !(piece.row === position.row && piece.col === position.col)).map((piece) => piece.id === selectedPiece.id ? { ...piece, ...position } : piece);
    setPieces(next); setLastMove({ from: { row: selectedPiece.row, col: selectedPiece.col }, to: position }); setSelectedId(scenario.freeMove ? selectedPiece.id : null); setFreeMoveCount((count) => count + 1); if (!practiced) markPracticed();
  }
  function tryInvalidMove(position: Position) {
    if (scenario.valid || !selectedPiece || position.row !== scenario.target.row || position.col !== scenario.target.col || targetIsLegal) return;
    setSelectedId(null); markPracticed();
  }
  return <>
    <LessonHeading number={2} title={t.lessons[1][0]} intro={t.piecesIntro} label={t.lessonLabels[1]} />
    <section className="piece-library" aria-label={t.choosePiece}>
      <div className="piece-library-heading"><div><strong>{t.choosePiece}</strong><span>{t.choosePieceHint}</span></div><small>{completedExamples.size} / {totalExamples} {t.viewed}</small></div>
      <div className="piece-library-list">{pieceOrder.map((pieceType) => {
        const complete = pieceScenarios[pieceType].every((item) => completedExamples.has(item.id));
        const glyph = language === "zh" ? tutorialGlyphs[pieceType] : tutorialEnglishMarks[pieceType];
        return <button className={`${type === pieceType ? "is-active" : ""} ${complete ? "is-complete" : ""}`} type="button" key={pieceType} onClick={() => loadScenario(pieceType, 0)} aria-pressed={type === pieceType}>
          <span className={`piece-library-token piece-library-token--${pieceTheme} ${pieceStyle === "symbols" ? "is-symbol" : ""}`}>{pieceStyle === "symbols" ? <PieceIcon type={pieceType} /> : glyph}</span>
          <b>{t.pieceNames[pieceType]}</b>{complete && <i>✓</i>}
        </button>;
      })}</div>
    </section>
    <div className="piece-lesson-layout">
      <div className="piece-example-board"><ChessBoard pieces={pieces} selectedId={selectedId} legalMoves={guidedMoves} invalidMoves={guidedInvalidMoves} onPieceClick={(piece) => { if ((!practiced || scenario.freeMove) && piece.id === scenario.actorId) setSelectedId(piece.id); }} onMove={move} onInvalidMove={tryInvalidMove} invalidMoveLabel={scenarioText.instruction} language={language} pieceStyle={pieceStyle} lastMove={lastMove} pieceTheme={pieceTheme} flipped={false} invalidPieceId={practiced && !scenario.valid ? scenario.actorId : null} hintPieceIds={detailHintIds} onInvalidAction={() => undefined} onBoardClick={() => undefined} onBoardDrop={() => undefined} setupMode={false} /></div>
      <div className="piece-lesson-copy">
        <span className="piece-lesson-count">{String(pieceIndex + 1).padStart(2, "0")} / 07</span>
        <div className={`piece-lesson-icon piece-lesson-icon--${pieceTheme} ${pieceStyle === "symbols" ? "is-symbol" : ""}`}>{pieceStyle === "symbols" ? <PieceIcon type={type} /> : <span>{lessonGlyph}</span>}</div>
        <h3>{t.pieceNames[type]}</h3>
        <div className="piece-example-tabs" aria-label={t.exampleProgress}>{pieceScenarios[type].map((item, index) => <button className={exampleIndex === index ? "is-active" : ""} type="button" key={item.id} onClick={() => loadScenario(type, index)}>{completedExamples.has(item.id) && <span>✓</span>}{pieceScenarioCopy[item.id][language].tab}</button>)}</div>
        <span className={`piece-practice-goal ${scenario.valid ? "" : "is-rule-test"}`}>{scenario.valid ? (language === "zh" ? "可行走法" : "LEGAL MOVE") : (language === "zh" ? "规则辨析" : "RULE CHECK")}</span><p>{scenarioText.description}</p>
        <div className="piece-rule-focus"><b>{t.ruleFocus}</b><p>{scenarioText.focus}</p></div>
        {scenario.id === "cannon-screen" && <ol className="cannon-rule-steps">{t.cannonSteps.map((step, index) => <li key={step}><span>{index + 1}</span>{step}</li>)}</ol>}
        <strong className={practiced ? "is-done" : scenario.valid ? "" : "is-warning"}>{practiced && scenario.freeMove ? <><span>✓ {t.freePractice}</span><small>{t.movesMade}: {freeMoveCount} {t.moveUnit}</small></> : practiced ? `✓ ${scenarioText.success}` : scenarioText.instruction}</strong>
        <button className="piece-example-reset" type="button" onClick={() => loadScenario(type, exampleIndex)}>{t.restartExample}</button>
        <LessonNavigation t={t} nextTitle={t.lessons[2][0]} onComplete={onComplete} onNext={onNext} />
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

function PuzzleLesson({ kind, t, language, pieceStyle, pieceTheme, onComplete, onNext }: { kind: "capture" | "mate"; t: TutorialText; language: Language; pieceStyle: PieceStyle; pieceTheme: PieceTheme; onComplete: () => void; onNext?: () => void }) {
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
      <div className="puzzle-instructions"><span>{kind === "capture" ? t.captureGoal : t.mateGoal}</span><h3>{solved ? (kind === "capture" ? t.captureSuccess : t.mateSuccess) : t.selectRook}</h3><p>{kind === "capture" ? t.captureIntro : t.mateIntro}</p>{solved && <LessonNavigation t={t} nextTitle={kind === "capture" ? t.lessons[3][0] : undefined} onComplete={onComplete} onNext={onNext} final={kind === "mate"} />}</div>
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
  function completeLesson(index: number, nextLesson: number | null = null) { setCompletedLessons((current) => current.includes(index) ? current : [...current, index].sort()); setActiveLesson(nextLesson); }

  if (activeLesson !== null) {
    return <section className="tutorial-shell tutorial-lesson" aria-label={t.lessons[activeLesson][0]}>
      <LessonTopbar label={t.lessonLabels[activeLesson]} t={t} onOverview={() => setActiveLesson(null)} onClose={onClose} />
      <TutorialDisplayControls t={t} pieceStyle={pieceStyle} pieceTheme={pieceTheme} onPieceStyleChange={onPieceStyleChange} onPieceThemeChange={onPieceThemeChange} />
      {activeLesson === 0 && <BoardLesson t={t} onComplete={() => completeLesson(0)} onNext={() => completeLesson(0, 1)} />}
      {activeLesson === 1 && <PieceLesson t={t} language={language} pieceStyle={pieceStyle} pieceTheme={pieceTheme} onComplete={() => completeLesson(1)} onNext={() => completeLesson(1, 2)} />}
      {activeLesson === 2 && <PuzzleLesson kind="capture" t={t} language={language} pieceStyle={pieceStyle} pieceTheme={pieceTheme} onComplete={() => completeLesson(2)} onNext={() => completeLesson(2, 3)} />}
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

import { useState } from "react";
import type { Language } from "../types";

interface TutorialProps {
  language: Language;
  onClose: () => void;
}

const tutorialCopy = {
  zh: {
    eyebrow: "新手教程",
    title: "从第一步开始，认识中国象棋",
    intro: "用四节简短课程认识棋盘、棋子和胜负规则。无需基础，跟着提示一步一步练习。",
    backGame: "返回棋局",
    progress: "学习进度",
    completed: "已完成",
    start: "开始第一课",
    continue: "再次查看",
    firstTag: "从这里开始",
    locked: "后续课程",
    lessons: [
      ["认识棋盘", "了解九宫、楚河汉界和双方阵营"],
      ["认识棋子", "分清七类棋子和它们的基本走法"],
      ["吃子与将军", "理解吃子、将军与保护主帅"],
      ["完成第一局", "在提示引导下完成一盘对局"],
    ],
    lesson: "第一课",
    lessonTitle: "认识棋盘",
    lessonIntro: "中国象棋的棋子落在交叉点上。先记住下面三个区域，就能看懂棋盘。",
    overview: "课程总览",
    finish: "完成本课",
    facts: [
      ["九路十行", "棋盘由 9 条竖线和 10 条横线组成，共有 90 个落子点。"],
      ["楚河汉界", "中间的河界把红黑双方的阵地分开，并会影响兵、卒和象的走法。"],
      ["双方九宫", "棋盘两端的米字格是九宫，将、帅和士、仕只能在各自九宫内活动。"],
    ],
    boardTop: "黑方阵地",
    river: "楚河　汉界",
    boardBottom: "红方阵地",
  },
  en: {
    eyebrow: "BEGINNER GUIDE",
    title: "Learn Xiangqi from your very first move",
    intro: "Four short lessons introduce the board, pieces, and winning rules. No experience needed—learn one step at a time.",
    backGame: "Back to game",
    progress: "Learning progress",
    completed: "completed",
    start: "Start lesson one",
    continue: "Review lesson",
    firstTag: "Start here",
    locked: "Coming next",
    lessons: [
      ["Meet the board", "Learn the palaces, river, and two sides"],
      ["Meet the pieces", "Recognize all seven pieces and their moves"],
      ["Capture and check", "Learn captures, check, and protecting the king"],
      ["Play your first game", "Finish a guided game with helpful prompts"],
    ],
    lesson: "LESSON ONE",
    lessonTitle: "Meet the board",
    lessonIntro: "Xiangqi pieces sit on intersections. Learn these three areas first and the board becomes easy to read.",
    overview: "Course overview",
    finish: "Complete lesson",
    facts: [
      ["Nine files, ten ranks", "The board has 9 vertical and 10 horizontal lines, creating 90 intersections for pieces."],
      ["The river", "The river divides the two territories and changes how pawns and elephants can move."],
      ["Two palaces", "The crossed-line areas are palaces. Kings and guards must remain inside their own palace."],
    ],
    boardTop: "Black territory",
    river: "RIVER",
    boardBottom: "Red territory",
  },
} as const;

export function Tutorial({ language, onClose }: TutorialProps) {
  const [lessonOpen, setLessonOpen] = useState(false);
  const [lessonComplete, setLessonComplete] = useState(false);
  const t = tutorialCopy[language];
  const completedCount = lessonComplete ? 1 : 0;

  if (lessonOpen) {
    return (
      <section className="tutorial-shell tutorial-lesson" aria-label={t.lessonTitle}>
        <div className="tutorial-topbar">
          <button type="button" onClick={() => setLessonOpen(false)}>← {t.overview}</button>
          <span>{t.lesson}</span>
          <button type="button" onClick={onClose}>{t.backGame}</button>
        </div>
        <div className="lesson-heading">
          <span className="lesson-number">01</span>
          <div><p>{t.lesson}</p><h2>{t.lessonTitle}</h2><span>{t.lessonIntro}</span></div>
        </div>
        <div className="lesson-content">
          <div className="tutorial-board-demo" aria-label={t.lessonTitle}>
            <span className="demo-side demo-side--top">{t.boardTop}</span>
            <div className="demo-palace demo-palace--top" />
            <div className="demo-river">{t.river}</div>
            <div className="demo-palace demo-palace--bottom" />
            <span className="demo-side demo-side--bottom">{t.boardBottom}</span>
          </div>
          <div className="lesson-facts">
            {t.facts.map(([title, description], index) => (
              <article key={title}><span>0{index + 1}</span><div><h3>{title}</h3><p>{description}</p></div></article>
            ))}
            <button className="lesson-complete-button" type="button" onClick={() => { setLessonComplete(true); setLessonOpen(false); }}>{t.finish}</button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="tutorial-shell" aria-label={t.eyebrow}>
      <div className="tutorial-topbar">
        <span>{t.eyebrow}</span>
        <button type="button" onClick={onClose}>← {t.backGame}</button>
      </div>
      <div className="tutorial-intro">
        <div>
          <p>{t.eyebrow}</p>
          <h2>{t.title}</h2>
          <span>{t.intro}</span>
          <button type="button" onClick={() => setLessonOpen(true)}>{lessonComplete ? t.continue : t.start} <b>→</b></button>
        </div>
        <div className="tutorial-emblem" aria-hidden="true"><span>帥</span><i /><span>將</span></div>
      </div>
      <div className="tutorial-progress">
        <div><span>{t.progress}</span><strong>{completedCount} / 4 {t.completed}</strong></div>
        <div className="tutorial-progress-track"><i style={{ width: `${completedCount * 25}%` }} /></div>
      </div>
      <div className="tutorial-path">
        {t.lessons.map(([title, description], index) => (
          <article className={`${index === 0 ? "is-current" : "is-locked"} ${index === 0 && lessonComplete ? "is-complete" : ""}`} key={title}>
            <div className="tutorial-step-number">{index === 0 && lessonComplete ? "✓" : String(index + 1).padStart(2, "0")}</div>
            <div className="tutorial-step-copy"><span>{index === 0 ? t.firstTag : t.locked}</span><h3>{title}</h3><p>{description}</p></div>
            {index === 0 && <button type="button" onClick={() => setLessonOpen(true)} aria-label={t.start}>→</button>}
          </article>
        ))}
      </div>
    </section>
  );
}

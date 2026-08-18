import { useEffect, useMemo, useRef, useState } from "react";
import type { ChessPiece, Language, PieceColor, PieceStyle, PieceTheme, PieceType, RecordedMove } from "../types";
import { analyzeRecordedMove, type MoveAnalysis } from "../game/review";
import { ChessBoard } from "./ChessBoard";

interface GameReviewProps {
  startPieces: ChessPiece[];
  moves: RecordedMove[];
  language: Language;
  pieceStyle: PieceStyle;
  pieceTheme: PieceTheme;
  flipped: boolean;
  analysisDepth: number;
  onClose: () => void;
}

const copy = {
  zh: {
    eyebrow: "AI 复盘室", title: "棋谱回放与逐步讲解", close: "返回棋局", opening: "初始局面", move: "第", moveUnit: "步", red: "红方", black: "黑方",
    first: "回到开局", previous: "上一步", play: "自动播放", pause: "暂停", next: "下一步", last: "跳到末局", record: "棋谱时间轴", analysis: "AI 逐步讲解", thinking: "AI 正在重新计算这一步…",
    openingHint: "选择右侧任意一步，查看当时的棋盘和 AI 建议。", recommended: "AI 推荐", capture: "吃掉", check: "并形成将军", mate: "这一步直接结束了对局。", same: "AI 认为这一步与首选方案效果接近，棋子协调和局面安全性都较好。",
    quality: { best: "最佳着法", good: "稳健好棋", questionable: "可以改进", mistake: "明显失误" },
    qualityText: {
      best: "这一步符合当前局面的主要目标，没有发现更明显的改进。",
      good: "这一步保持了局面稳定，但 AI 找到了一种略积极的选择。",
      questionable: "这一步会让主动权有所下降，建议比较 AI 给出的路线。",
      mistake: "这一步明显损失了局面质量，可能忽略了吃子、将军或关键防守。",
    },
    localNote: "分析由本地象棋搜索完成，不上传棋局。",
  },
  en: {
    eyebrow: "AI REVIEW ROOM", title: "Replay and move-by-move analysis", close: "Back to game", opening: "Starting position", move: "Move", moveUnit: "", red: "Red", black: "Black",
    first: "Start", previous: "Previous", play: "Auto play", pause: "Pause", next: "Next", last: "End", record: "Move timeline", analysis: "AI explanation", thinking: "AI is recalculating this move…",
    openingHint: "Choose any move in the timeline to inspect the board and AI suggestion.", recommended: "AI recommends", capture: "captures", check: "and gives check", mate: "This move ends the game.", same: "The AI considers this move close to its top choice, with sound coordination and king safety.",
    quality: { best: "Best move", good: "Good move", questionable: "Can improve", mistake: "Mistake" },
    qualityText: {
      best: "This move meets the position's main demand, with no clear improvement found.",
      good: "The move keeps the position stable, though the AI found a slightly more active option.",
      questionable: "This move gives up some initiative; compare it with the AI line.",
      mistake: "This move significantly worsens the position and may miss a capture, check, or key defense.",
    },
    localNote: "Analysis runs locally; the game record is not uploaded.",
  },
} as const;

const pieceNames: Record<Language, Record<PieceType, string>> = {
  zh: { general: "将/帅", advisor: "士/仕", elephant: "象/相", horse: "马", rook: "车", cannon: "炮", soldier: "兵/卒" },
  en: { general: "King", advisor: "Guard", elephant: "Bishop", horse: "Knight", rook: "Rook", cannon: "Cannon", soldier: "Pawn" },
};

function coordinate(position: { row: number; col: number }) {
  return `(${position.row},${position.col})`;
}

function moveLabel(move: RecordedMove, language: Language) {
  const side = move.mover === "red" ? (language === "zh" ? "红" : "Red") : (language === "zh" ? "黑" : "Black");
  return `${side} ${pieceNames[language][move.pieceType]} ${coordinate(move.from)} → ${coordinate(move.to)}`;
}

function AnalysisCard({ analysis, move, language, loading }: { analysis: MoveAnalysis | null; move: RecordedMove | null; language: Language; loading: boolean }) {
  const t = copy[language];
  if (!move) return <div className="review-analysis review-analysis--empty"><span>{t.analysis}</span><h3>{t.opening}</h3><p>{t.openingHint}</p></div>;
  if (loading || !analysis) return <div className="review-analysis review-analysis--loading"><span>{t.analysis}</span><div className="review-thinking"><i /><i /><i /></div><p>{t.thinking}</p></div>;
  const recommendation = analysis.recommendation;
  const details = [
    analysis.captured ? `${t.capture} ${pieceNames[language][analysis.captured]}` : null,
    analysis.gaveCheck ? t.check : null,
    analysis.isMate ? t.mate : null,
  ].filter(Boolean).join(language === "zh" ? "，" : ", ");
  return <div className={`review-analysis review-analysis--${analysis.quality}`}>
    <span>{t.analysis}</span>
    <div className="review-quality-row"><b>{t.quality[analysis.quality]}</b><small>{move.mover === "red" ? t.red : t.black}</small></div>
    <h3>{moveLabel(move, language)}</h3>
    <p>{analysis.isRecommendedMove ? t.same : t.qualityText[analysis.quality]}</p>
    {details && <p className="review-tactical-note">{details}</p>}
    {recommendation && <div className="review-recommendation">
      <span>{t.recommended}</span>
      <strong>{pieceNames[language][recommendation.pieceType]} {coordinate(recommendation.from)} → {coordinate(recommendation.to)}</strong>
      {(recommendation.captures || recommendation.givesCheck) && <small>{[recommendation.captures ? `${t.capture} ${pieceNames[language][recommendation.captures]}` : null, recommendation.givesCheck ? t.check : null].filter(Boolean).join(language === "zh" ? "，" : ", ")}</small>}
    </div>}
  </div>;
}

export function GameReview({ startPieces, moves, language, pieceStyle, pieceTheme, flipped, analysisDepth, onClose }: GameReviewProps) {
  const t = copy[language];
  const [step, setStep] = useState(moves.length);
  const [playing, setPlaying] = useState(false);
  const [analysis, setAnalysis] = useState<MoveAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const analysisCache = useRef(new Map<number, MoveAnalysis>());
  const activeMove = step > 0 ? moves[step - 1] : null;
  const boardPieces = step > 0 ? moves[step - 1].boardAfter : startPieces;
  const piecesBefore = step <= 1 ? startPieces : moves[step - 2].boardAfter;

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setStep((current) => {
        if (current >= moves.length) { setPlaying(false); return current; }
        const next = current + 1;
        if (next >= moves.length) setPlaying(false);
        return next;
      });
    }, 950);
    return () => window.clearInterval(timer);
  }, [playing, moves.length]);

  useEffect(() => {
    if (!activeMove) { setAnalysis(null); setLoading(false); return; }
    const cached = analysisCache.current.get(step);
    if (cached) { setAnalysis(cached); setLoading(false); return; }
    setAnalysis(null);
    setLoading(true);
    const timer = window.setTimeout(() => {
      const result = analyzeRecordedMove(piecesBefore, activeMove, analysisDepth);
      analysisCache.current.set(step, result);
      setAnalysis(result);
      setLoading(false);
    }, 40);
    return () => window.clearTimeout(timer);
  }, [step, activeMove, piecesBefore, analysisDepth]);

  const lastMove = activeMove ? { from: activeMove.from, to: activeMove.to } : null;
  const progress = moves.length === 0 ? 0 : (step / moves.length) * 100;
  const timelineStyle = useMemo(() => ({ "--review-progress": `${progress}%` } as React.CSSProperties), [progress]);

  function chooseStep(nextStep: number) {
    setPlaying(false);
    setStep(Math.max(0, Math.min(moves.length, nextStep)));
  }

  return <section className="game-review" aria-label={t.title}>
    <div className="review-header">
      <div><p>{t.eyebrow}</p><h2>{t.title}</h2></div>
      <button type="button" onClick={onClose}>← {t.close}</button>
    </div>
    <div className="review-layout">
      <div className="review-board-column">
        <div className="review-step-label"><span>{step === 0 ? t.opening : `${t.move} ${step} ${t.moveUnit}`}</span><b>{step} / {moves.length}</b></div>
        <div className="review-board"><ChessBoard pieces={boardPieces} selectedId={null} legalMoves={[]} onPieceClick={() => undefined} onMove={() => undefined} language={language} pieceStyle={pieceStyle} lastMove={lastMove} pieceTheme={pieceTheme} flipped={flipped} invalidPieceId={null} hintPieceIds={new Set()} onInvalidAction={() => undefined} onBoardClick={() => undefined} onBoardDrop={() => undefined} setupMode={false} /></div>
        <div className="review-player-controls">
          <button type="button" aria-label={t.first} title={t.first} onClick={() => chooseStep(0)} disabled={step === 0}>|‹</button>
          <button type="button" aria-label={t.previous} title={t.previous} onClick={() => chooseStep(step - 1)} disabled={step === 0}>‹</button>
          <button className="review-play" type="button" onClick={() => { if (step >= moves.length) setStep(0); setPlaying((current) => !current); }}>{playing ? t.pause : t.play}</button>
          <button type="button" aria-label={t.next} title={t.next} onClick={() => chooseStep(step + 1)} disabled={step === moves.length}>›</button>
          <button type="button" aria-label={t.last} title={t.last} onClick={() => chooseStep(moves.length)} disabled={step === moves.length}>›|</button>
        </div>
        <div className="review-progress" style={timelineStyle}><i /></div>
      </div>
      <aside className="review-sidebar">
        <AnalysisCard analysis={analysis} move={activeMove} language={language} loading={loading} />
        <div className="review-move-list">
          <div className="review-move-list__heading"><span>{t.record}</span><b>{moves.length}</b></div>
          <button className={step === 0 ? "is-active" : ""} type="button" onClick={() => chooseStep(0)}><i>00</i><span>{t.opening}</span></button>
          {moves.map((move, index) => <button className={step === index + 1 ? "is-active" : ""} type="button" key={move.id} onClick={() => chooseStep(index + 1)}><i>{String(index + 1).padStart(2, "0")}</i><span>{moveLabel(move, language)}</span>{move.gaveCheck && <b>!</b>}</button>)}
        </div>
        <p className="review-local-note">{t.localNote}</p>
      </aside>
    </div>
  </section>;
}

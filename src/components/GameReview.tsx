import { useEffect, useMemo, useRef, useState } from "react";
import type { ChessPiece, Language, PieceColor, PieceStyle, PieceTheme, PieceType, RecordedMove } from "../types";
import type { MoveAnalysis } from "../game/review";
import { getReviewBoardComparison } from "../game/reviewComparison";
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
    openingHint: "选择右侧任意一步，查看当时的棋盘和 AI 建议。", recommended: "AI 首选路线", alternative: "AI 的另一选择", reply: "对手可能的主要应对", capture: "吃掉", check: "并形成将军", mate: "这一步直接结束了对局。", same: "在本次搜索深度内，这一步与 AI 首选一致；这不代表它是理论上的绝对最佳着。",
    quality: { best: "AI 首选", good: "接近首选", questionable: "可以改进", mistake: "明显失误" },
    reasonText: {
      mate: "这一步直接形成胜势或结束对局。", capture: "这一步及时取得了子力，是当前搜索的首选。", check: "这一步利用将军争取主动，是当前搜索的首选。",
      equivalent: "这一步不是 AI 首选，但评估差距很小，可以视为近似选择。", "missed-capture": "这一步错过了更直接的吃子机会，对手因此保留了关键子力。",
      "missed-check": "这一步错过了可迫使对手应将的机会，主动权有所下降。", position: "继续计算对手的最佳回应后，这一步得到的局面评估低于 AI 首选。",
    },
    scoreGap: "与首选差距", decisive: "决定性", confidenceLabel: "可信度", confidence: { low: "较低", medium: "中等", high: "较高" },
    actualRoute: "问题着法", recommendedRoute: "AI 建议", comparisonHint: "落子前局面：红色 × 为错误落点",
    badMove: "问题着法",
    localNote: "分析由本地有限深度搜索完成，不上传棋局；“AI 首选”不等同于理论最优解。",
  },
  en: {
    eyebrow: "AI REVIEW ROOM", title: "Replay and move-by-move analysis", close: "Back to game", opening: "Starting position", move: "Move", moveUnit: "", red: "Red", black: "Black",
    first: "Start", previous: "Previous", play: "Auto play", pause: "Pause", next: "Next", last: "End", record: "Move timeline", analysis: "AI explanation", thinking: "AI is recalculating this move…",
    openingHint: "Choose any move in the timeline to inspect the board and AI suggestion.", recommended: "AI top line", alternative: "AI alternative", reply: "Likely best reply", capture: "captures", check: "and gives check", mate: "This move ends the game.", same: "This matches the AI's choice at the current search depth; it is not a claim of theoretical perfection.",
    quality: { best: "AI top choice", good: "Close alternative", questionable: "Can improve", mistake: "Mistake" },
    reasonText: {
      mate: "This move creates a decisive result or ends the game.", capture: "This timely material gain is the search's top choice.", check: "This check seizes the initiative and is the search's top choice.",
      equivalent: "This is not the AI's first choice, but its evaluation is close enough to be a sound alternative.", "missed-capture": "This misses a more direct capture and lets the opponent keep an important piece.",
      "missed-check": "This misses a forcing check and gives up some initiative.", position: "After calculating the opponent's best reply, this position evaluates below the AI's top line.",
    },
    scoreGap: "Gap from top", decisive: "decisive", confidenceLabel: "Confidence", confidence: { low: "low", medium: "medium", high: "high" },
    actualRoute: "Problem move", recommendedRoute: "AI suggestion", comparisonHint: "Position before the move: the red × marks the wrong destination",
    badMove: "Problem move",
    localNote: "Analysis uses a limited-depth local search; “AI top choice” does not mean a proven theoretical best move.",
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

function scoreGap(scoreLoss: number, language: Language, decisive: string) {
  if (scoreLoss >= 50_000) return decisive;
  const pawns = scoreLoss / 100;
  return language === "zh" ? `${pawns.toFixed(1)} 兵` : `${pawns.toFixed(1)} pawns`;
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
    <p>{analysis.isRecommendedMove ? t.same : t.reasonText[analysis.reason]}</p>
    <div className="review-metrics">
      <span>{t.scoreGap}<b>{scoreGap(analysis.scoreLoss, language, t.decisive)}</b></span>
      <span>{t.confidenceLabel}<b>{t.confidence[analysis.confidence]}</b></span>
    </div>
    {details && <p className="review-tactical-note">{details}</p>}
    {recommendation && <div className="review-recommendation">
      <span>{analysis.scoreLoss <= 35 ? t.alternative : t.recommended}</span>
      <strong>{pieceNames[language][recommendation.pieceType]} {coordinate(recommendation.from)} → {coordinate(recommendation.to)}</strong>
      {(recommendation.captures || recommendation.givesCheck) && <small>{[recommendation.captures ? `${t.capture} ${pieceNames[language][recommendation.captures]}` : null, recommendation.givesCheck ? t.check : null].filter(Boolean).join(language === "zh" ? "，" : ", ")}</small>}
    </div>}
    {analysis.reply && <div className="review-reply">
      <span>{t.reply}</span>
      <strong>{pieceNames[language][analysis.reply.pieceType]} {coordinate(analysis.reply.from)} → {coordinate(analysis.reply.to)}</strong>
      {(analysis.reply.captures || analysis.reply.givesCheck) && <small>{[analysis.reply.captures ? `${t.capture} ${pieceNames[language][analysis.reply.captures]}` : null, analysis.reply.givesCheck ? t.check : null].filter(Boolean).join(language === "zh" ? "，" : ", ")}</small>}
    </div>}
  </div>;
}

export function GameReview({ startPieces, moves, language, pieceStyle, pieceTheme, flipped, analysisDepth, onClose }: GameReviewProps) {
  const t = copy[language];
  const [step, setStep] = useState(moves.length);
  const [playing, setPlaying] = useState(false);
  const [analysis, setAnalysis] = useState<MoveAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const analysisCache = useRef(new Map<string, MoveAnalysis>());
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
    }, 1700);
    return () => window.clearInterval(timer);
  }, [playing, moves.length]);

  useEffect(() => {
    if (!activeMove) { setAnalysis(null); setLoading(false); return; }
    const cacheKey = `${step}:${analysisDepth}`;
    const cached = analysisCache.current.get(cacheKey);
    if (cached) { setAnalysis(cached); setLoading(false); return; }
    setAnalysis(null);
    setLoading(true);
    const worker = new Worker(new URL("../game/review.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (event: MessageEvent<MoveAnalysis>) => {
      analysisCache.current.set(cacheKey, event.data);
      setAnalysis(event.data);
      setLoading(false);
      worker.terminate();
    };
    worker.onerror = () => {
      setLoading(false);
      worker.terminate();
    };
    worker.postMessage({ piecesBefore, move: activeMove, depth: analysisDepth });
    return () => worker.terminate();
  }, [step, activeMove, piecesBefore, analysisDepth]);

  const lastMove = activeMove ? { from: activeMove.from, to: activeMove.to } : null;
  const reviewComparison = getReviewBoardComparison(analysis, activeMove);
  const displayedPieces = reviewComparison ? piecesBefore : boardPieces;
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
        {reviewComparison && <div className="review-comparison-legend" role="status">
          <span><i className="review-legend-dot review-legend-dot--actual" />{t.actualRoute}</span>
          <span><i className="review-legend-dot review-legend-dot--recommended" />{t.recommendedRoute}</span>
          <small>{t.comparisonHint}</small>
        </div>}
        <div className="review-board"><ChessBoard pieces={displayedPieces} selectedId={null} legalMoves={[]} onPieceClick={() => undefined} onMove={() => undefined} language={language} pieceStyle={pieceStyle} lastMove={reviewComparison ? null : lastMove} pieceTheme={pieceTheme} flipped={flipped} invalidPieceId={null} hintPieceIds={new Set()} onInvalidAction={() => undefined} onBoardClick={() => undefined} onBoardDrop={() => undefined} setupMode={false} reviewComparison={reviewComparison} /></div>
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
          {moves.map((move, index) => {
            const moveAnalysis = analysisCache.current.get(`${index + 1}:${analysisDepth}`);
            const isBadMove = moveAnalysis?.quality === "questionable" || moveAnalysis?.quality === "mistake";
            return <button className={`${step === index + 1 ? "is-active" : ""} ${isBadMove ? "has-review-warning" : ""}`} type="button" key={move.id} onClick={() => chooseStep(index + 1)}>
              <i>{String(index + 1).padStart(2, "0")}</i>
              <span>{moveLabel(move, language)}</span>
              {isBadMove ? <b className="review-move-warning" aria-label={t.badMove} title={t.badMove}>×</b> : move.gaveCheck && <b>!</b>}
            </button>;
          })}
        </div>
        <p className="review-local-note">{t.localNote}</p>
      </aside>
    </div>
  </section>;
}

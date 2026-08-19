import type { Language } from "../types";
import type { TrainingArchive } from "../game/trainingArchive";

interface TrainingArchiveLibraryProps {
  archives: TrainingArchive[];
  language: Language;
  onSelect: (archiveId: string) => void;
  onDelete: (archiveId: string) => void;
  onClear: () => void;
  onClose: () => void;
}

const copyBase = {
  zh: {
    eyebrow: "AI 训练档案馆", title: "自我对弈存档", close: "返回棋局", total: "存档总数", red: "红方胜", black: "黑方胜", draw: "和棋",
    plies: "手", replay: "查看回放", remove: "删除", clear: "清空全部存档", emptyTitle: "还没有训练存档", empty: "完成一局 AI 自我训练后，棋谱会自动出现在这里。",
    clearConfirm: "确定清空全部训练回放存档吗？此操作无法撤销。", removeConfirm: "确定删除这局训练存档吗？",
  },
  en: {
    eyebrow: "AI TRAINING ARCHIVE", title: "Self-play replays", close: "Back to game", total: "Archives", red: "Red wins", black: "Black wins", draw: "Draw",
    plies: "plies", replay: "Watch replay", remove: "Delete", clear: "Clear all archives", emptyTitle: "No training archives yet", empty: "A replay will be saved here whenever a self-play training game finishes.",
    clearConfirm: "Clear every training replay? This cannot be undone.", removeConfirm: "Delete this training replay?",
  },
} as const;
const copy = {
  ...copyBase,
  ko: {
    ...copyBase.en,
    eyebrow: "AI 훈련 보관함", title: "자기 대국 리플레이", close: "대국으로 돌아가기", total: "전체 기록", red: "홍 승리", black: "흑 승리", draw: "무승부", plies: "수", replay: "리플레이 보기", remove: "삭제", clear: "전체 기록 삭제", emptyTitle: "훈련 기록이 없습니다", empty: "AI 자기 대국이 끝나면 리플레이가 이곳에 자동 저장됩니다.", clearConfirm: "모든 훈련 기록을 삭제할까요? 되돌릴 수 없습니다.", removeConfirm: "이 훈련 기록을 삭제할까요?",
  },
} as const;

function resultLabel(archive: TrainingArchive, language: Language) {
  const t = copy[language];
  return archive.winner === "red" ? t.red : archive.winner === "black" ? t.black : t.draw;
}

function archiveDate(timestamp: number, language: Language) {
  return new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : language === "ko" ? "ko-KR" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

export function TrainingArchiveLibrary({ archives, language, onSelect, onDelete, onClear, onClose }: TrainingArchiveLibraryProps) {
  const t = copy[language];
  const newestFirst = [...archives].sort((first, second) => second.finishedAt - first.finishedAt);
  const redWins = archives.filter((archive) => archive.winner === "red").length;
  const blackWins = archives.filter((archive) => archive.winner === "black").length;
  const draws = archives.length - redWins - blackWins;

  return <section className="training-archive-library" aria-label={t.title}>
    <div className="review-header training-archive-header">
      <div><p>{t.eyebrow}</p><h2>{t.title}</h2></div>
      <button type="button" onClick={onClose}>← {t.close}</button>
    </div>
    <div className="training-archive-summary">
      <span>{t.total}<b>{archives.length}</b></span>
      <span>{t.red}<b>{redWins}</b></span>
      <span>{t.black}<b>{blackWins}</b></span>
      <span>{t.draw}<b>{draws}</b></span>
    </div>
    {newestFirst.length === 0 ? <div className="training-archive-empty">
      <i aria-hidden="true">◇</i><h3>{t.emptyTitle}</h3><p>{t.empty}</p>
    </div> : <>
      <div className="training-archive-grid">
        {newestFirst.map((archive, index) => <article className="training-archive-card" key={archive.id}>
          <button className="training-archive-card__main" type="button" onClick={() => onSelect(archive.id)}>
            <span className={`training-archive-result training-archive-result--${archive.winner ?? "draw"}`}>{resultLabel(archive, language)}</span>
            <strong>{language === "zh" ? `训练棋局 ${String(newestFirst.length - index).padStart(2, "0")}` : language === "ko" ? `훈련 대국 ${String(newestFirst.length - index).padStart(2, "0")}` : `Training game ${String(newestFirst.length - index).padStart(2, "0")}`}</strong>
            <small>{archiveDate(archive.finishedAt, language)} · {archive.moves.length} {t.plies}</small>
            <i>{t.replay} →</i>
          </button>
          <button className="training-archive-card__delete" type="button" onClick={() => {
            if (window.confirm(t.removeConfirm)) onDelete(archive.id);
          }}>{t.remove}</button>
        </article>)}
      </div>
      <button className="training-archive-clear" type="button" onClick={() => {
        if (window.confirm(t.clearConfirm)) onClear();
      }}>{t.clear}</button>
    </>}
  </section>;
}

import type { ChessPiece, PieceColor, RecordedMove } from "../types";
import { buildLearningGame, type LearningGame, type LearningOutcome } from "./learning";

export type SelfPlayDecisionLabel = "teacher" | "explore" | null;

function outcomeFor(color: PieceColor, winner: PieceColor | null): LearningOutcome {
  if (!winner) return "draw";
  return winner === color ? "win" : "loss";
}

function outcomeReward(outcome: LearningOutcome) {
  return outcome === "win" ? 1 : outcome === "loss" ? -1 : 0;
}

export function getSelfPlayDecisionReward(label: Exclude<SelfPlayDecisionLabel, null>, outcome: LearningOutcome) {
  const teacherReward = label === "teacher" ? 0.7 : -0.7;
  return Math.max(-1, Math.min(1, teacherReward + outcomeReward(outcome) * 0.3));
}

export function buildSelfPlayLearningGames(
  trainingGameId: string,
  startPieces: ChessPiece[],
  moves: RecordedMove[],
  labels: SelfPlayDecisionLabel[],
  winner: PieceColor | null,
  finishedAt = Date.now(),
): LearningGame[] {
  return (["red", "black"] as PieceColor[]).flatMap((color) => {
    const outcome = outcomeFor(color, winner);
    const game = buildLearningGame(startPieces, moves, color, outcome, finishedAt);
    if (!game) return [];
    const decisions = game.decisions.flatMap((decision) => {
      const label = labels[decision.ply];
      if (!label) return [];
      return [{ ...decision, reward: getSelfPlayDecisionReward(label, outcome) }];
    });
    if (decisions.length === 0) return [];
    return [{
      ...game,
      id: `${trainingGameId}-${color}`,
      source: "self-play" as const,
      trainingGameId,
      decisions,
    }];
  });
}


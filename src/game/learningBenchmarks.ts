import type { ChessPiece, RecordedMove } from "../types";
import { applyAiMove } from "./ai";
import {
  buildLearningGame,
  createLearningDataset,
  getLearningStats,
  getLearningMoveHints,
  MAX_LEARNING_GAMES,
  parseLearningDataset,
  recordLearningGame,
  removeLearningGame,
} from "./learning";
import { buildSelfPlayLearningGames, getSelfPlayDecisionReward } from "./selfPlay";

export interface LearningBenchmarkResult {
  name: string;
  passed: boolean;
}

const startPieces: ChessPiece[] = [
  { id: "bg", type: "general", color: "black", row: 0, col: 4 },
  { id: "rg", type: "general", color: "red", row: 9, col: 4 },
  { id: "rr", type: "rook", color: "red", row: 9, col: 0 },
  { id: "br", type: "rook", color: "black", row: 0, col: 0 },
];

function move(board: ChessPiece[], pieceId: string, row: number, col: number, index: number): RecordedMove {
  const piece = board.find((item) => item.id === pieceId)!;
  const capturedPiece = board.find((item) => item.row === row && item.col === col) ?? null;
  const boardAfter = applyAiMove(board, pieceId, row, col);
  return {
    id: `learning-game-${index}`,
    mover: piece.color,
    pieceId,
    pieceType: piece.type,
    from: { row: piece.row, col: piece.col },
    to: { row, col },
    capturedPiece,
    gaveCheck: false,
    boardAfter,
  };
}

export function runLearningBenchmarks(): LearningBenchmarkResult[] {
  const redMove = move(startPieces, "rr", 8, 0, 1);
  const blackMove = move(redMove.boardAfter, "br", 1, 0, 2);
  const game = buildLearningGame(startPieces, [redMove, blackMove], "black", "win", 10)!;
  const firstDataset = recordLearningGame(createLearningDataset(), game);
  const replacement = recordLearningGame(firstDataset, { ...game, outcome: "loss", finishedAt: 11 });
  const removed = removeLearningGame(replacement, game.id);
  const samePositionWins = [0, 1, 2].reduce(
    (dataset, index) => recordLearningGame(dataset, { ...game, id: `win-${index}`, finishedAt: index, outcome: "win" }),
    createLearningDataset(),
  );
  const samePositionLosses = [0, 1, 2].reduce(
    (dataset, index) => recordLearningGame(dataset, { ...game, id: `loss-${index}`, finishedAt: index, outcome: "loss" }),
    createLearningDataset(),
  );
  const positionKey = game.decisions[0].positionKey;
  const winningHint = getLearningMoveHints(samePositionWins, positionKey)[0];
  const losingHint = getLearningMoveHints(samePositionLosses, positionKey)[0];
  const loopedDataset = recordLearningGame(createLearningDataset(), {
    ...game,
    id: "single-loop",
    decisions: [game.decisions[0], game.decisions[0], game.decisions[0]],
  });
  const selfPlayGames = buildSelfPlayLearningGames(
    "training-game-1",
    startPieces,
    [redMove, blackMove],
    ["teacher", "explore"],
    "red",
    20,
  );
  const selfPlayDataset = selfPlayGames.reduce(
    (dataset, selfPlayGame) => recordLearningGame(dataset, selfPlayGame),
    createLearningDataset(),
  );
  let capped = createLearningDataset();
  for (let index = 0; index < MAX_LEARNING_GAMES + 5; index += 1) {
    capped = recordLearningGame(capped, { ...game, id: `game-${index}`, finishedAt: index });
  }

  return [
    { name: "records-only-ai-decisions", passed: game.decisions.length === 1 && game.decisions[0].ply === 1 },
    { name: "replaces-same-completed-game", passed: replacement.games.length === 1 && replacement.games[0].outcome === "loss" },
    { name: "removes-undone-result", passed: removed.games.length === 0 },
    { name: "caps-learning-history", passed: capped.games.length === MAX_LEARNING_GAMES && capped.games[0].id === "game-5" },
    { name: "rejects-invalid-dataset", passed: getLearningStats(parseLearningDataset('{"version":2,"games":[]}')).games === 0 },
    { name: "round-trips-dataset", passed: getLearningStats(parseLearningDataset(JSON.stringify(firstDataset))).decisions === 1 },
    { name: "requires-minimum-trusted-samples", passed: getLearningMoveHints(firstDataset, positionKey).length === 0 },
    { name: "rewards-repeated-winning-choice", passed: Boolean(winningHint && winningHint.bonus > 0 && winningHint.samples === 3) },
    { name: "discourages-repeated-losing-choice", passed: Boolean(losingHint && losingHint.bonus < 0 && losingHint.samples === 3) },
    { name: "reports-trusted-experience", passed: getLearningStats(samePositionWins).trustedMoves === 1 },
    {
      name: "does-not-trust-single-game-loop",
      passed: getLearningMoveHints(loopedDataset, positionKey).length === 0
        && getLearningStats(loopedDataset).trustedMoves === 0,
    },
    {
      name: "builds-independent-self-play-sides",
      passed: selfPlayGames.length === 2
        && selfPlayGames[0].id !== selfPlayGames[1].id
        && selfPlayGames.every((selfPlayGame) => selfPlayGame.source === "self-play"),
    },
    {
      name: "teacher-filter-overrides-raw-outcome",
      passed: selfPlayGames.find((selfPlayGame) => selfPlayGame.aiColor === "red")?.decisions[0].reward === 1
        && selfPlayGames.find((selfPlayGame) => selfPlayGame.aiColor === "black")?.decisions[0].reward === -1
        && getSelfPlayDecisionReward("teacher", "loss") > 0
        && getSelfPlayDecisionReward("explore", "win") < 0,
    },
    {
      name: "counts-one-self-play-board-game",
      passed: getLearningStats(selfPlayDataset).selfPlayGames === 1
        && getLearningStats(parseLearningDataset(JSON.stringify(selfPlayDataset))).selfPlayGames === 1,
    },
  ];
}

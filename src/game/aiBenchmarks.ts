import { initialPieces } from "../data/initialPieces";
import type { ChessPiece, PieceColor } from "../types";
import { applyAiMove, getRecentMovePenalty, searchBestMove, type AiSearchResult } from "./ai";
import { getAllLegalMoves, isInCheck } from "./rules";
import { getPositionKey } from "./adjudication";

export interface AiBenchmarkResult {
  name: string;
  passed: boolean;
  elapsedMs: number;
  completedDepth: number;
  nodes: number;
}

function piece(
  id: string,
  type: ChessPiece["type"],
  color: PieceColor,
  row: number,
  col: number,
): ChessPiece {
  return { id, type, color, row, col };
}

function result(name: string, search: AiSearchResult, passed: boolean): AiBenchmarkResult {
  return {
    name,
    passed,
    elapsedMs: Math.round(search.stats.elapsedMs),
    completedDepth: search.stats.completedDepth,
    nodes: search.stats.nodes + search.stats.quiescenceNodes,
  };
}

function recordedMove(
  piecesBefore: ChessPiece[],
  pieceId: string,
  row: number,
  col: number,
  index: number,
) {
  const movingPiece = piecesBefore.find((item) => item.id === pieceId)!;
  const capturedPiece = piecesBefore.find((item) => item.row === row && item.col === col) ?? null;
  const boardAfter = applyAiMove(piecesBefore, pieceId, row, col);
  return {
    id: `benchmark-${index}`,
    mover: movingPiece.color,
    pieceId,
    pieceType: movingPiece.type,
    from: { row: movingPiece.row, col: movingPiece.col },
    to: { row, col },
    capturedPiece,
    gaveCheck: isInCheck(movingPiece.color === "red" ? "black" : "red", boardAfter),
    boardAfter,
  };
}

export function runAiBenchmarks(): AiBenchmarkResult[] {
  const captureRook = [
    piece("bg", "general", "black", 0, 4),
    piece("rg", "general", "red", 9, 4),
    piece("block", "soldier", "red", 5, 4),
    piece("rr", "rook", "red", 4, 0),
    piece("br", "rook", "black", 4, 5),
  ];
  const rookSearch = searchBestMove(captureRook, "red", 4, 350);
  const rookPassed = rookSearch.choice?.piece.id === "rr"
    && rookSearch.choice.move.row === 4
    && rookSearch.choice.move.col === 5;

  const cannonScreen = [
    piece("bg", "general", "black", 0, 4),
    piece("rg", "general", "red", 9, 4),
    piece("block", "soldier", "red", 5, 4),
    piece("rc", "cannon", "red", 7, 1),
    piece("screen", "soldier", "red", 4, 1),
    piece("br", "rook", "black", 1, 1),
  ];
  const cannonSearch = searchBestMove(cannonScreen, "red", 4, 350);
  const cannonPassed = cannonSearch.choice?.piece.id === "rc"
    && cannonSearch.choice.move.row === 1
    && cannonSearch.choice.move.col === 1;

  const checkedRed = [
    piece("bg", "general", "black", 0, 4),
    piece("rg", "general", "red", 9, 4),
    piece("br", "rook", "black", 3, 4),
    piece("rr", "rook", "red", 8, 0),
  ];
  const defenseSearch = searchBestMove(checkedRed, "red", 4, 350);
  const defenseBoard = defenseSearch.choice
    ? applyAiMove(
        checkedRed,
        defenseSearch.choice.piece.id,
        defenseSearch.choice.move.row,
        defenseSearch.choice.move.col,
      )
    : checkedRed;

  const stalemate = [
    piece("bg", "general", "black", 0, 4),
    piece("rg", "general", "red", 9, 4),
    piece("block", "soldier", "red", 5, 4),
    piece("rr", "rook", "red", 1, 0),
    piece("rh1", "horse", "red", 2, 2),
    piece("rh2", "horse", "red", 2, 6),
  ];
  const stalemateSearch = searchBestMove(stalemate, "black", 4, 200);

  const easyOpening = searchBestMove(initialPieces, "red", 2, 120);
  const normalOpening = searchBestMove(initialPieces, "red", 4, 400);
  const hardOpening = searchBestMove(initialPieces, "red", 6, 1500);

  const quietPosition = [
    piece("bg", "general", "black", 0, 4),
    piece("rg", "general", "red", 9, 4),
    piece("block", "soldier", "black", 5, 4),
    piece("rr", "rook", "red", 9, 0),
  ];
  const baselineRepeat = searchBestMove(quietPosition, "red", 1, 220);
  const repeatedBoard = baselineRepeat.choice
    ? applyAiMove(quietPosition, baselineRepeat.choice.piece.id, baselineRepeat.choice.move.row, baselineRepeat.choice.move.col)
    : quietPosition;
  const repeatedKey = getPositionKey(repeatedBoard, "black");
  const repetitionAware = searchBestMove(quietPosition, "red", 1, 220, {
    positionHistory: [getPositionKey(quietPosition, "red"), repeatedKey],
    ruleMoves: [],
  });
  const repetitionAwareKey = repetitionAware.choice
    ? getPositionKey(
        applyAiMove(quietPosition, repetitionAware.choice.piece.id, repetitionAware.choice.move.row, repetitionAware.choice.move.col),
        "black",
      )
    : repeatedKey;

  const allNextPositions = getAllLegalMoves("red", quietPosition).map(({ piece, move }) =>
    getPositionKey(applyAiMove(quietPosition, piece.id, move.row, move.col), "black"));
  const forcedRepeat = searchBestMove(quietPosition, "red", 1, 220, {
    positionHistory: [getPositionKey(quietPosition, "red"), ...allNextPositions],
    ruleMoves: [],
  });

  const shuttleStart = [
    piece("bg", "general", "black", 0, 4),
    piece("rg", "general", "red", 9, 4),
    piece("block", "soldier", "black", 5, 4),
    piece("rr", "rook", "red", 9, 0),
  ];
  const rookOut = recordedMove(shuttleStart, "rr", 8, 0, 1);
  const afterRookOut = rookOut.boardAfter;
  const quietReturnPenalty = getRecentMovePenalty(
    afterRookOut,
    { piece: afterRookOut.find((item) => item.id === "rr")!, move: { row: 9, col: 0 } },
    "red",
    [rookOut],
  );
  const rookBack = recordedMove(afterRookOut, "rr", 9, 0, 2);
  const shuttlePenalty = getRecentMovePenalty(
    rookBack.boardAfter,
    { piece: rookBack.boardAfter.find((item) => item.id === "rr")!, move: { row: 8, col: 0 } },
    "red",
    [rookOut, rookBack],
  );
  const captureTargetPosition = [...afterRookOut, piece("target", "soldier", "black", 9, 0)];
  const tacticalReturnPenalty = getRecentMovePenalty(
    captureTargetPosition,
    { piece: captureTargetPosition.find((item) => item.id === "rr")!, move: { row: 9, col: 0 } },
    "red",
    [rookOut],
  );
  const attackedRookPosition = [...afterRookOut, piece("attacking-rook", "rook", "black", 8, 8)];
  const defensiveReturnPenalty = getRecentMovePenalty(
    attackedRookPosition,
    { piece: attackedRookPosition.find((item) => item.id === "rr")!, move: { row: 9, col: 0 } },
    "red",
    [rookOut],
  );
  const shuttleAware = searchBestMove(afterRookOut, "red", 1, 220, {
    positionHistory: [],
    ruleMoves: [],
    moves: [rookOut],
  });

  return [
    result("capture-hanging-rook", rookSearch, Boolean(rookPassed)),
    result("cannon-screen-capture", cannonSearch, Boolean(cannonPassed)),
    result(
      "answer-check",
      defenseSearch,
      Boolean(defenseSearch.choice) && !isInCheck("red", defenseBoard),
    ),
    result("stalemate-is-loss", stalemateSearch, stalemateSearch.choice === null),
    result(
      "easy-opening-budget",
      easyOpening,
      Boolean(easyOpening.choice)
        && easyOpening.stats.elapsedMs < 220
        && easyOpening.stats.completedDepth >= 1,
    ),
    result(
      "normal-opening-budget",
      normalOpening,
      Boolean(normalOpening.choice)
        && normalOpening.stats.elapsedMs < 550
        && normalOpening.stats.completedDepth >= 1
        && normalOpening.stats.nodes + normalOpening.stats.quiescenceNodes
          > easyOpening.stats.nodes + easyOpening.stats.quiescenceNodes,
    ),
    result(
      "hard-opening-budget",
      hardOpening,
      Boolean(hardOpening.choice)
        && hardOpening.stats.elapsedMs < 1700
        && hardOpening.stats.completedDepth >= 2
        && hardOpening.stats.nodes + hardOpening.stats.quiescenceNodes
          > normalOpening.stats.nodes + normalOpening.stats.quiescenceNodes,
    ),
    result(
      "avoid-meaningless-repeat",
      repetitionAware,
      Boolean(baselineRepeat.choice && repetitionAware.choice) && repetitionAwareKey !== repeatedKey,
    ),
    result(
      "allow-forced-repeat",
      forcedRepeat,
      Boolean(forcedRepeat.choice),
    ),
    result(
      "penalize-quiet-rook-return",
      shuttleAware,
      quietReturnPenalty === 65
        && Boolean(shuttleAware.choice)
        && !(shuttleAware.choice?.piece.id === "rr" && shuttleAware.choice.move.row === 9 && shuttleAware.choice.move.col === 0),
    ),
    result(
      "penalize-repeated-rook-shuttle",
      shuttleAware,
      shuttlePenalty === 140,
    ),
    result(
      "allow-tactical-rook-return",
      shuttleAware,
      tacticalReturnPenalty === 0,
    ),
    result(
      "allow-rook-retreat-under-attack",
      shuttleAware,
      defensiveReturnPenalty === 0,
    ),
  ];
}

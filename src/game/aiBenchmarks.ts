import { initialPieces } from "../data/initialPieces";
import type { ChessPiece, PieceColor } from "../types";
import { applyAiMove, searchBestMove, type AiSearchResult } from "./ai";
import { isInCheck } from "./rules";

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
        && normalOpening.stats.completedDepth >= 2,
    ),
    result(
      "hard-opening-budget",
      hardOpening,
      Boolean(hardOpening.choice)
        && hardOpening.stats.elapsedMs < 1700
        && hardOpening.stats.completedDepth >= 3,
    ),
  ];
}

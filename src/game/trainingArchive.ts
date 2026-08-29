import { initialPieces } from "../data/initialPieces";
import type { ChessPiece, PieceColor, PieceType, RecordedMove } from "../types";
import type { GameEndReason } from "./backup";

export const TRAINING_ARCHIVE_STORAGE_KEY = "chinese-chess-ai-training-archives-v1";
export const MAX_TRAINING_ARCHIVES = 24;

export interface ArchivedTrainingMove {
  mover: PieceColor;
  pieceId: string;
  pieceType: PieceType;
  from: { row: number; col: number };
  to: { row: number; col: number };
  capturedPieceType: PieceType | null;
  gaveCheck: boolean;
}

export interface TrainingArchive {
  id: string;
  finishedAt: number;
  winner: PieceColor | null;
  draw: boolean;
  endReason?: GameEndReason;
  abandoned?: boolean;
  startPieces?: ChessPiece[];
  moves: ArchivedTrainingMove[];
}

export interface TrainingArchiveDataset {
  version: 1;
  archives: TrainingArchive[];
}

export function createTrainingArchiveDataset(): TrainingArchiveDataset {
  return { version: 1, archives: [] };
}

export function buildTrainingArchive(
  id: string,
  moves: RecordedMove[],
  winner: PieceColor | null,
  draw: boolean,
  finishedAt = Date.now(),
  endReason?: GameEndReason,
  abandoned = false,
  startPieces?: ChessPiece[],
): TrainingArchive {
  return {
    id,
    finishedAt,
    winner,
    draw,
    ...(endReason ? { endReason } : {}),
    ...(abandoned ? { abandoned: true } : {}),
    ...(startPieces ? { startPieces: startPieces.map((piece) => ({ ...piece })) } : {}),
    moves: moves.map((move) => ({
      mover: move.mover,
      pieceId: move.pieceId,
      pieceType: move.pieceType,
      from: move.from,
      to: move.to,
      capturedPieceType: move.capturedPiece?.type ?? null,
      gaveCheck: move.gaveCheck,
    })),
  };
}

export function recordTrainingArchive(dataset: TrainingArchiveDataset, archive: TrainingArchive): TrainingArchiveDataset {
  return {
    version: 1,
    archives: [...dataset.archives.filter((item) => item.id !== archive.id), archive]
      .sort((first, second) => first.finishedAt - second.finishedAt)
      .slice(-MAX_TRAINING_ARCHIVES),
  };
}

export function removeTrainingArchive(dataset: TrainingArchiveDataset, archiveId: string): TrainingArchiveDataset {
  const archives = dataset.archives.filter((archive) => archive.id !== archiveId);
  return archives.length === dataset.archives.length ? dataset : { version: 1, archives };
}

const pieceTypes: PieceType[] = ["general", "advisor", "elephant", "horse", "rook", "cannon", "soldier"];

function isPieceType(value: unknown): value is PieceType {
  return typeof value === "string" && pieceTypes.includes(value as PieceType);
}

function isBoardPosition(value: unknown): value is { row: number; col: number } {
  if (!value || typeof value !== "object") return false;
  const position = value as { row?: unknown; col?: unknown };
  return Number.isInteger(position.row) && Number.isInteger(position.col)
    && Number(position.row) >= 0 && Number(position.row) <= 9
    && Number(position.col) >= 0 && Number(position.col) <= 8;
}

function applyArchivedMove(pieces: ChessPiece[], move: ArchivedTrainingMove) {
  return pieces
    .filter((piece) => !(piece.row === move.to.row && piece.col === move.to.col))
    .map((piece) => piece.id === move.pieceId ? { ...piece, row: move.to.row, col: move.to.col } : piece);
}

export function reconstructTrainingMoves(archive: TrainingArchive, startPieces: ChessPiece[] = archive.startPieces ?? initialPieces): RecordedMove[] {
  let board = startPieces.map((piece) => ({ ...piece }));
  return archive.moves.map((move, index) => {
    const capturedPiece = board.find((piece) => piece.row === move.to.row && piece.col === move.to.col) ?? null;
    board = applyArchivedMove(board, move);
    return {
      id: `${archive.id}-replay-${index}`,
      mover: move.mover,
      pieceId: move.pieceId,
      pieceType: move.pieceType,
      from: move.from,
      to: move.to,
      capturedPiece,
      gaveCheck: move.gaveCheck,
      boardAfter: board,
    };
  });
}

export function parseTrainingArchiveDataset(value: string | null): TrainingArchiveDataset {
  if (!value) return createTrainingArchiveDataset();
  try {
    const data = JSON.parse(value) as Partial<TrainingArchiveDataset>;
    if (data.version !== 1 || !Array.isArray(data.archives)) return createTrainingArchiveDataset();
    const archives = data.archives.filter((archive): archive is TrainingArchive => Boolean(
      archive
      && typeof archive.id === "string"
      && Number.isFinite(archive.finishedAt)
      && archive.finishedAt >= 0
      && archive.finishedAt <= 8.64e15
      && (archive.winner === null || archive.winner === "red" || archive.winner === "black")
      && typeof archive.draw === "boolean"
      && (archive.endReason === undefined || typeof archive.endReason === "string")
      && (archive.abandoned === undefined || typeof archive.abandoned === "boolean")
      && (archive.startPieces === undefined || Array.isArray(archive.startPieces) && archive.startPieces.every((piece) => piece
        && typeof piece.id === "string"
        && isPieceType(piece.type)
        && (piece.color === "red" || piece.color === "black")
        && Number.isInteger(piece.row) && piece.row >= 0 && piece.row <= 9
        && Number.isInteger(piece.col) && piece.col >= 0 && piece.col <= 8))
      && Array.isArray(archive.moves)
      && archive.moves.every((move) => move
        && (move.mover === "red" || move.mover === "black")
        && typeof move.pieceId === "string"
        && isPieceType(move.pieceType)
        && isBoardPosition(move.from)
        && isBoardPosition(move.to)
        && (move.capturedPieceType === null || isPieceType(move.capturedPieceType))
        && typeof move.gaveCheck === "boolean"),
    ));
    return {
      version: 1,
      archives: archives.sort((first, second) => first.finishedAt - second.finishedAt).slice(-MAX_TRAINING_ARCHIVES),
    };
  } catch {
    return createTrainingArchiveDataset();
  }
}

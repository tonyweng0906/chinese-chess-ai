import {
  createTrainingArchiveDataset,
  parseTrainingArchiveDataset,
  type TrainingArchive,
  type TrainingArchiveDataset,
} from "./trainingArchive";

export const PLAYED_ARCHIVE_STORAGE_KEY = "chinese-chess-ai-played-archives-v1";
export const MAX_PLAYED_ARCHIVES = 5;

export function createPlayedArchiveDataset(): TrainingArchiveDataset {
  return createTrainingArchiveDataset();
}

export function recordPlayedArchive(dataset: TrainingArchiveDataset, archive: TrainingArchive): TrainingArchiveDataset {
  return {
    version: 1,
    archives: [...dataset.archives.filter((item) => item.id !== archive.id), archive]
      .sort((first, second) => first.finishedAt - second.finishedAt)
      .slice(-MAX_PLAYED_ARCHIVES),
  };
}

export function removePlayedArchive(dataset: TrainingArchiveDataset, archiveId: string): TrainingArchiveDataset {
  const archives = dataset.archives.filter((archive) => archive.id !== archiveId);
  return archives.length === dataset.archives.length ? dataset : { version: 1, archives };
}

export function parsePlayedArchiveDataset(value: string | null): TrainingArchiveDataset {
  const parsed = parseTrainingArchiveDataset(value);
  return { version: 1, archives: parsed.archives.slice(-MAX_PLAYED_ARCHIVES) };
}

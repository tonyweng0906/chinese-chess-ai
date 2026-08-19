import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "vite";

const outDir = await mkdtemp(join(tmpdir(), "xiangqi-selfplay-benchmark-"));

try {
  await build({
    logLevel: "silent",
    build: {
      ssr: "src/game/selfPlay.worker.ts",
      outDir,
      emptyOutDir: true,
    },
  });

  const messages = [];
  globalThis.self = {
    onmessage: null,
    postMessage(message) { messages.push(message); },
  };
  const workerUrl = `${pathToFileURL(join(outDir, "selfPlay.worker.js")).href}?run=${Date.now()}`;
  await import(workerUrl);
  globalThis.self.onmessage({
    data: {
      type: "start",
      sessionId: "preview-benchmark",
      targetGames: 1,
      dataset: { version: 1, games: [] },
      seed: 20260819,
    },
  });

  const previews = messages.filter((message) => message.type === "preview");
  const progress = messages.find((message) => message.type === "progress");
  const complete = messages.find((message) => message.type === "complete");
  const first = previews[0];
  const moved = previews.find((preview) => preview.ply > 0);
  const results = [
    { name: "streams-initial-training-board", passed: first?.ply === 0 && first?.pieces?.length === 32 },
    { name: "streams-live-training-moves", passed: Boolean(moved?.lastMove && moved.pieces && moved.turn) },
    { name: "finishes-previewed-training-game", passed: Boolean(progress?.completedGames === 1 && complete?.completedGames === 1) },
    { name: "emits-complete-training-archive", passed: Boolean(progress?.archive?.id && progress.archive.moves?.length === progress.lastGamePlies) },
  ];
  console.table(results);
  if (results.some((result) => !result.passed)) process.exitCode = 1;
} finally {
  delete globalThis.self;
  await rm(outDir, { recursive: true, force: true });
}

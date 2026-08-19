import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "vite";

const outDir = await mkdtemp(join(tmpdir(), "xiangqi-learning-benchmark-"));

try {
  await build({
    logLevel: "silent",
    build: { ssr: "src/game/learningBenchmarks.ts", outDir, emptyOutDir: true },
  });
  const benchmarkUrl = `${pathToFileURL(join(outDir, "learningBenchmarks.js")).href}?run=${Date.now()}`;
  const { runLearningBenchmarks } = await import(benchmarkUrl);
  const results = runLearningBenchmarks();
  console.table(results);
  if (results.some((result) => !result.passed)) process.exitCode = 1;
} finally {
  await rm(outDir, { recursive: true, force: true });
}

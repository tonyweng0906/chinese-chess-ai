import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "vite";

const outDir = await mkdtemp(join(tmpdir(), "xiangqi-endgame-solver-"));

try {
  await build({
    logLevel: "silent",
    build: {
      ssr: "src/game/endgameSolverBenchmarks.ts",
      outDir,
      emptyOutDir: true,
    },
  });
  const benchmarkUrl = `${pathToFileURL(join(outDir, "endgameSolverBenchmarks.js")).href}?run=${Date.now()}`;
  const { runEndgameSolverBenchmarks } = await import(benchmarkUrl);
  const results = runEndgameSolverBenchmarks();
  console.table(results);
  if (results.some((result) => !result.passed)) process.exitCode = 1;
} finally {
  await rm(outDir, { recursive: true, force: true });
}

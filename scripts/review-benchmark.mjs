import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "vite";

const outDir = await mkdtemp(join(tmpdir(), "xiangqi-review-benchmark-"));

try {
  await build({
    logLevel: "silent",
    build: {
      ssr: "src/game/reviewBenchmarks.ts",
      outDir,
      emptyOutDir: true,
    },
  });

  const benchmarkUrl = `${pathToFileURL(join(outDir, "reviewBenchmarks.js")).href}?run=${Date.now()}`;
  const { runReviewBenchmarks } = await import(benchmarkUrl);
  const results = runReviewBenchmarks();
  console.table(results);

  if (results.some((result) => !result.passed)) {
    process.exitCode = 1;
  }
} finally {
  await rm(outDir, { recursive: true, force: true });
}

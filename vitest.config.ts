import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

// Vitest config for the CareerHub client (Assignment 3.2 — Testing).
// • jsdom so component tests have a DOM and a real localStorage.
// • globals so describe/it/expect/vi are available without imports.
// • env injects the same NEXT_PUBLIC_* vars the API client reads, so MSW
//   handlers built from process.env match the URLs the code actually fetches.
// • resolve.alias mirrors the "@/..." path alias from tsconfig.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    // This machine imports/transforms slowly; userEvent types char-by-char.
    // Generous timeouts keep behaviour tests from flaking on speed alone.
    testTimeout: 20000,
    hookTimeout: 20000,
    // --- Worker pool: avoid the parallel-spawn storm ------------------------
    // Vitest's forks pool defaults to one worker PER test file, up to the CPU
    // count, all booting the Vite transform pipeline at once. On this slow box
    // that contention pushes individual workers past Vitest's *hardcoded* 60s
    // start/stop timeouts → "Failed to start forks worker" / "Timeout
    // terminating forks worker". fileParallelism:false forces maxWorkers to 1,
    // so a single worker runs every file in sequence (still isolated per file):
    // it starts once and is torn down once — no spawn/teardown storm.
    pool: "forks",
    fileParallelism: false,
    // Belt-and-suspenders if the box is busy when the one worker is torn down.
    teardownTimeout: 30000,
    env: {
      NEXT_PUBLIC_API_URL: "http://localhost:8080",
      NEXT_PUBLIC_API_BASE_URL: "http://localhost:8080",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});

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

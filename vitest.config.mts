import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Resolves the "@/*" alias from tsconfig so tests import the same way
    // the app does.
    tsconfigPaths: true,
  },
  test: {
    // Domain logic is pure and framework-free — no DOM environment needed.
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});

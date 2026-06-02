import { defineConfig } from "vitest/config";

// Unit tests only — pure logic under src/. Playwright E2E specs live in
// tests/e2e and are run separately via `npm run test:e2e`.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.{test,spec}.{js,jsx}"],
    exclude: ["tests/e2e/**", "node_modules/**"],
  },
});

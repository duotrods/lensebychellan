import { defineConfig } from "vitest/config";

// Firestore security-rules tests. They need the emulator: run `npm run test:rules`.
export default defineConfig({
  test: { environment: "node", include: ["tests/rules/**/*.test.js"], testTimeout: 20000 },
});

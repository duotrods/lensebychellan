import { defineConfig, devices } from "@playwright/test";

// E2E config. Spins up the Vite dev server automatically. The authenticated
// flow (submit an incident) is gated behind E2E_EMAIL / E2E_PASSWORD env vars
// so the public smoke test can run in CI without secrets.
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});

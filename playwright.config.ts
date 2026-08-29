import { config } from "dotenv";
import { defineConfig, devices } from "@playwright/test";

// The Playwright test process (not just the `next dev` it spawns) needs
// DATABASE_URL directly, since e2e/auth.spec.ts cleans up its test user
// straight through Drizzle.
config({ path: ".env.local" });

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      // Playwright's bundled Chromium build has dropped support for this
      // machine's macOS version; `channel: "chrome"` drives the system-
      // installed Google Chrome instead, which needs no browser download.
      name: "chromium",
      use: { ...devices["Desktop Chrome"], channel: "chrome" },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});

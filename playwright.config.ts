import { defineConfig, devices } from "@playwright/test";

const localPort = process.env.PORT || "3000";
const localBaseURL = `http://127.0.0.1:${localPort}`;
const smokeTarget = process.env.PLAYWRIGHT_SMOKE_TARGET;
const isHostedSmoke = smokeTarget === "hosted";
const baseURL = isHostedSmoke ? process.env.PLAYWRIGHT_BASE_URL : localBaseURL;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
  ],
  webServer: isHostedSmoke
    ? undefined
    : {
        command: `npm run dev -- --hostname 127.0.0.1 --port ${localPort}`,
        url: localBaseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
      },
});

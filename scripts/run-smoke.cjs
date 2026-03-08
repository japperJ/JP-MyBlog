const { spawnSync } = require("node:child_process");

const smokeTarget = process.argv[2];
const extraArgs = process.argv.slice(3);
const playwrightArgs = [
  "playwright",
  "test",
  "tests/admin.spec.ts",
  "tests/api.spec.ts",
  "--project=chromium",
  ...extraArgs,
];
const localHosts = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1", "[::1]"]);

if (smokeTarget !== "local" && smokeTarget !== "hosted") {
  console.error("[smoke] Expected target to be 'local' or 'hosted'.");
  process.exit(1);
}

if (smokeTarget === "hosted") {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL;

  if (!baseURL) {
    console.error(
      "[smoke:hosted] PLAYWRIGHT_BASE_URL is required. Use a real hosted preview URL. Run `npm run test:smoke:local` for local smoke.",
    );
    process.exit(1);
  }

  let parsedURL;

  try {
    parsedURL = new URL(baseURL);
  } catch {
    console.error(`[smoke:hosted] PLAYWRIGHT_BASE_URL must be a valid absolute URL. Received: ${baseURL}`);
    process.exit(1);
  }

  if (!/^https?:$/.test(parsedURL.protocol)) {
    console.error(
      `[smoke:hosted] PLAYWRIGHT_BASE_URL must use http or https. Received protocol: ${parsedURL.protocol}`,
    );
    process.exit(1);
  }

  if (localHosts.has(parsedURL.hostname) || parsedURL.hostname.endsWith(".local")) {
    console.error(
      `[smoke:hosted] PLAYWRIGHT_BASE_URL must point to a real hosted deployment, not ${parsedURL.hostname}. Use \`npm run test:smoke:local\` for local smoke.`,
    );
    process.exit(1);
  }
}

const env = {
  ...process.env,
  PLAYWRIGHT_SMOKE_TARGET: smokeTarget,
};
const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx";
const result = spawnSync(npxCommand, playwrightArgs, {
  stdio: "inherit",
  env,
});

if (result.error) {
  console.error(`[smoke:${smokeTarget}] Failed to start Playwright.`, result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);

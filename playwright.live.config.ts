import { defineConfig, devices } from "@playwright/test";

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);
const EXPLICIT_PORT_RE = /^http:\/\/(?:\[[^\]]+\]|[^/:?#]+):(\d+)\/?$/i;

interface ValidatedOrigin {
  origin: string;
  cliHost: string;
  port: number;
}

function assertLoopbackRootOrigin(
  envName: string,
  rawValue: string | undefined,
): ValidatedOrigin {
  const trimmed = rawValue?.trim();
  if (!trimmed) {
    throw new Error(
      `[playwright.live.config] Missing required ${envName}. ` +
        "Live E2E tests must explicitly target an isolated loopback server.",
    );
  }

  if (trimmed.includes("@")) {
    throw new Error(
      `[playwright.live.config] Embedded credentials are forbidden in ${envName}.`,
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(`[playwright.live.config] Invalid URL in ${envName}.`);
  }

  if (parsed.username || parsed.password) {
    throw new Error(
      `[playwright.live.config] Embedded credentials are forbidden in ${envName}.`,
    );
  }

  if (parsed.protocol !== "http:") {
    throw new Error(
      `[playwright.live.config] Refusing protocol "${parsed.protocol}" in ${envName}. ` +
        "Only explicit http: loopback root-origin URLs are supported.",
    );
  }

  if (
    trimmed.includes("?") ||
    trimmed.includes("#") ||
    parsed.search ||
    parsed.hash ||
    parsed.pathname !== "/"
  ) {
    throw new Error(
      `[playwright.live.config] ${envName} must be a root-origin URL without path, query, or hash.`,
    );
  }

  const portMatch = EXPLICIT_PORT_RE.exec(trimmed);
  if (!portMatch) {
    throw new Error(
      `[playwright.live.config] ${envName} must specify an explicit numeric port.`,
    );
  }

  const port = Number(portMatch[1]);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(
      `[playwright.live.config] Invalid port in ${envName}: ${portMatch[1]}.`,
    );
  }

  const normalizedHost = parsed.hostname.toLowerCase();
  if (!LOOPBACK_HOSTS.has(normalizedHost)) {
    throw new Error(
      `[playwright.live.config] Refusing non-loopback host "${parsed.hostname}" in ${envName}. ` +
        "External or shared URLs are forbidden.",
    );
  }

  const cliHost =
    parsed.hostname.startsWith("[") && parsed.hostname.endsWith("]")
      ? parsed.hostname.slice(1, -1)
      : parsed.hostname;

  return {
    origin: parsed.origin,
    cliHost,
    port,
  };
}

const frontend = assertLoopbackRootOrigin(
  "E2E_LIVE_FRONTEND_URL",
  process.env.E2E_LIVE_FRONTEND_URL,
);
const backend = assertLoopbackRootOrigin(
  "E2E_LIVE_BACKEND_URL",
  process.env.E2E_LIVE_BACKEND_URL,
);

if (frontend.origin === backend.origin) {
  throw new Error(
    `[playwright.live.config] E2E_LIVE_FRONTEND_URL and E2E_LIVE_BACKEND_URL must not share the same origin (${frontend.origin}).`,
  );
}

export default defineConfig({
  testDir: "./e2e-live",
  timeout: 60000,
  expect: {
    timeout: 10000,
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [
    ["list"],
    ["json", { outputFile: "e2e-live-results.json" }],
  ],
  use: {
    baseURL: frontend.origin,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: `npm run dev -- --host ${frontend.cliHost} --port ${frontend.port} --strictPort --mode e2e`,
    url: frontend.origin,
    reuseExistingServer: false,
    timeout: 30000,
    env: {
      ...process.env,
      VITE_API_BASE_URL: `${backend.origin}/api`,
      VITE_API_PROXY_TARGET: backend.origin,
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});

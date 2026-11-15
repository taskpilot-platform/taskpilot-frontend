import assert from "node:assert/strict";
import path from "node:path";
import { afterEach, describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import axios from "axios";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(__dirname, "../..");
const liveConfigUrl = pathToFileURL(
  path.join(frontendRoot, "playwright.live.config.ts"),
).href;
const defaultConfigUrl = pathToFileURL(
  path.join(frontendRoot, "playwright.config.ts"),
).href;

let importCounter = 0;

async function importLiveConfig(envOverrides) {
  const prevFrontend = process.env.E2E_LIVE_FRONTEND_URL;
  const prevBackend = process.env.E2E_LIVE_BACKEND_URL;

  try {
    if (envOverrides.E2E_LIVE_FRONTEND_URL === undefined) {
      delete process.env.E2E_LIVE_FRONTEND_URL;
    } else {
      process.env.E2E_LIVE_FRONTEND_URL = envOverrides.E2E_LIVE_FRONTEND_URL;
    }

    if (envOverrides.E2E_LIVE_BACKEND_URL === undefined) {
      delete process.env.E2E_LIVE_BACKEND_URL;
    } else {
      process.env.E2E_LIVE_BACKEND_URL = envOverrides.E2E_LIVE_BACKEND_URL;
    }

    importCounter += 1;
    const mod = await import(`${liveConfigUrl}?case=${importCounter}`);
    return mod.default;
  } finally {
    if (prevFrontend === undefined) {
      delete process.env.E2E_LIVE_FRONTEND_URL;
    } else {
      process.env.E2E_LIVE_FRONTEND_URL = prevFrontend;
    }

    if (prevBackend === undefined) {
      delete process.env.E2E_LIVE_BACKEND_URL;
    } else {
      process.env.E2E_LIVE_BACKEND_URL = prevBackend;
    }
  }
}

describe("playwright.live.config.ts isolation and API binding", () => {
  afterEach(() => {
    delete process.env.E2E_LIVE_FRONTEND_URL;
    delete process.env.E2E_LIVE_BACKEND_URL;
  });

  it("rejects missing required frontend or backend URL", async () => {
    await assert.rejects(() =>
      importLiveConfig({
        E2E_LIVE_FRONTEND_URL: undefined,
        E2E_LIVE_BACKEND_URL: "http://127.0.0.1:18080",
      }),
    );
    await assert.rejects(() =>
      importLiveConfig({
        E2E_LIVE_FRONTEND_URL: "http://127.0.0.1:4173",
        E2E_LIVE_BACKEND_URL: "   ",
      }),
    );
  });

  it("rejects non-loopback or non-HTTP URLs", async () => {
    const invalidCases = [
      {
        E2E_LIVE_FRONTEND_URL: "http://shared.example.com:4173",
        E2E_LIVE_BACKEND_URL: "http://127.0.0.1:18080",
      },
      {
        E2E_LIVE_FRONTEND_URL: "http://127.0.0.1:4173",
        E2E_LIVE_BACKEND_URL: "http://192.168.1.50:18080",
      },
      {
        E2E_LIVE_FRONTEND_URL: "https://127.0.0.1:4173",
        E2E_LIVE_BACKEND_URL: "http://127.0.0.1:18080",
      },
      {
        E2E_LIVE_FRONTEND_URL: "http://127.0.0.1:4173",
        E2E_LIVE_BACKEND_URL: "https://localhost:18080",
      },
    ];

    for (const envCase of invalidCases) {
      await assert.rejects(() => importLiveConfig(envCase));
    }
  });

  it("rejects missing/invalid ports, paths, queries, hashes, and same-origin collisions", async () => {
    const invalidForms = [
      {
        E2E_LIVE_FRONTEND_URL: "http://127.0.0.1",
        E2E_LIVE_BACKEND_URL: "http://127.0.0.1:18080",
      },
      {
        E2E_LIVE_FRONTEND_URL: "http://127.0.0.1:4173",
        E2E_LIVE_BACKEND_URL: "http://localhost",
      },
      {
        E2E_LIVE_FRONTEND_URL: "http://127.0.0.1:0",
        E2E_LIVE_BACKEND_URL: "http://127.0.0.1:18080",
      },
      {
        E2E_LIVE_FRONTEND_URL: "http://127.0.0.1:70000",
        E2E_LIVE_BACKEND_URL: "http://127.0.0.1:18080",
      },
      {
        E2E_LIVE_FRONTEND_URL: "http://127.0.0.1:4173/subpath",
        E2E_LIVE_BACKEND_URL: "http://127.0.0.1:18080",
      },
      {
        E2E_LIVE_FRONTEND_URL: "http://127.0.0.1:4173/?foo=bar",
        E2E_LIVE_BACKEND_URL: "http://127.0.0.1:18080",
      },
      {
        E2E_LIVE_FRONTEND_URL: "http://127.0.0.1:4173/#hash",
        E2E_LIVE_BACKEND_URL: "http://127.0.0.1:18080",
      },
      {
        E2E_LIVE_FRONTEND_URL: "http://127.0.0.1:4173",
        E2E_LIVE_BACKEND_URL: "http://127.0.0.1:4173",
      },
    ];

    for (const envCase of invalidForms) {
      await assert.rejects(() => importLiveConfig(envCase));
    }
  });

  it("rejects embedded credentials without printing the raw URL or secret", async () => {
    await assert.rejects(
      () =>
        importLiveConfig({
          E2E_LIVE_FRONTEND_URL: "http://admin:super-secret-pass@127.0.0.1:4173",
          E2E_LIVE_BACKEND_URL: "http://127.0.0.1:18080",
        }),
      (err) => {
        assert.ok(err instanceof Error);
        assert.equal(err.message.includes("super-secret-pass"), false);
        assert.equal(err.message.includes("admin:"), false);
        return true;
      },
    );
  });

  it("owns an isolated strictPort dev server and binds VITE_API_BASE_URL (/api) and VITE_API_PROXY_TARGET", async () => {
    const config = await importLiveConfig({
      E2E_LIVE_FRONTEND_URL: "http://127.0.0.1:4173",
      E2E_LIVE_BACKEND_URL: "http://127.0.0.1:18080",
    });

    assert.equal(config.use?.baseURL, "http://127.0.0.1:4173");
    assert.ok(config.webServer, "live config must own a frontend webServer");
    assert.equal(config.webServer.reuseExistingServer, false);
    assert.equal(config.webServer.url, "http://127.0.0.1:4173");
    assert.match(config.webServer.command, /--strictPort/);
    assert.match(config.webServer.command, /--port 4173/);
    assert.match(config.webServer.command, /--host 127\.0\.0\.1/);
    assert.match(config.webServer.command, /--mode e2e/);
    assert.equal(
      config.webServer.env?.VITE_API_BASE_URL,
      "http://127.0.0.1:18080/api",
    );
    assert.equal(
      config.webServer.env?.VITE_API_PROXY_TARGET,
      "http://127.0.0.1:18080",
    );

    const liveHttpClient = axios.create({
      baseURL: config.webServer.env.VITE_API_BASE_URL,
    });
    assert.equal(
      liveHttpClient.getUri({ url: "/v1/projects/100/files" }),
      "http://127.0.0.1:18080/api/v1/projects/100/files",
    );
  });

  it("keeps default playwright.config.ts incapable of reusing an arbitrary server", async () => {
    const mod = await import(`${defaultConfigUrl}?defaultCheck=1`);
    assert.equal(mod.default.webServer?.reuseExistingServer, false);
  });
});

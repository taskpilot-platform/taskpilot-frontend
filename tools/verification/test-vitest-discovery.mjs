import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("unit discovery excludes browser specs while Playwright retains the live workflow", () => {
  const listed = spawnSync(process.execPath, [
    "node_modules/vitest/vitest.mjs", "list", "--filesOnly", "--json",
  ], { cwd: root, encoding: "utf8", timeout: 30000 });
  assert.equal(listed.status, 0, listed.stderr);
  const files = JSON.parse(listed.stdout).map(({ file }) => file.replaceAll("\\", "/"));
  for (const name of ["P5TaskContracts", "P5TaskWorkflow", "P5SprintHistory"]) {
    assert.ok(files.some((file) => file.endsWith(`/src/test/tasks/${name}.test.tsx`)), name);
  }
  assert.ok(files.every((file) => !/\/(?:e2e|e2e-live)\//.test(file)), files.join("\n"));

  const browser = spawnSync(process.execPath, [
    "node_modules/@playwright/test/cli.js", "test", "--list",
    "--config=playwright.live.config.ts", "e2e-live/p5-task-workflow.live.spec.ts",
  ], {
    cwd: root, encoding: "utf8", timeout: 30000,
    env: { ...process.env, E2E_LIVE_FRONTEND_URL: "http://127.0.0.1:18081", E2E_LIVE_BACKEND_URL: "http://127.0.0.1:18080" },
  });
  assert.equal(browser.status, 0, browser.stderr);
  assert.ok(browser.stdout.includes("p5-task-workflow.live.spec.ts"), browser.stdout);
});

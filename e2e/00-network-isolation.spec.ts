import { createServer } from "node:http";
import { test, expect } from "./helpers/isolated-test";

test("mocked suite blocks unhandled HTTP and WebSocket egress before transport", async ({ page }) => {
  let requests = 0;
  let upgrades = 0;
  const server = createServer((_req, res) => { requests++; res.end("must not reach transport"); });
  server.on("upgrade", (_req, socket) => { upgrades++; socket.destroy(); });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Missing probe port");
  try {
    await page.goto("/");
    // Unhandled API requests must fall through mock handlers to the deny rule, never the preview proxy.
    await page.route("**/api/isolated-probe", (route) => route.fallback());
    const outcome = await page.evaluate(async (port) => {
      const httpBlocked = await fetch(`http://127.0.0.1:${port}/private`, { mode: "no-cors" })
        .then(() => false, () => true);
      const proxyBlocked = await fetch("/api/isolated-probe").then(() => false, () => true);
      const wsClosed = await new Promise<boolean>((resolve) => {
        const ws = new WebSocket(`ws://127.0.0.1:${port}/private`);
        ws.onopen = () => { ws.close(); resolve(false); };
        ws.onclose = () => resolve(true);
        ws.onerror = () => resolve(true);
      });
      return { httpBlocked, proxyBlocked, wsClosed };
    }, address.port);
    expect(outcome).toEqual({ httpBlocked: true, proxyBlocked: true, wsClosed: true });
    expect(requests).toBe(0);
    expect(upgrades).toBe(0);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

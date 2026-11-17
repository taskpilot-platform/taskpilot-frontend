import { test as base, expect } from "@playwright/test";

/** Mocked suite only: unhandled HTTP and WebSocket requests never reach a provider or backend. */
export const test = base.extend<{ networkIsolation: void }>({
  networkIsolation: [async ({ context }, use, testInfo) => {
    const blocked: string[] = [];
    await context.route("**/*", async (route) => {
      const url = new URL(route.request().url());
      // Preview also proxies /api and /ws; same-origin alone would leak to a real backend.
      const backendPath = /^\/(?:api|v1|ws)(?:\/|$)/.test(url.pathname);
      if (url.origin === "http://127.0.0.1:5173" && !backendPath) {
        await route.continue();
      } else {
        blocked.push(`${route.request().method()} ${url.origin}${url.pathname}`);
        await route.abort("blockedbyclient");
      }
    });
    await context.routeWebSocket("**/*", (socket) => {
      blocked.push(`WS ${new URL(socket.url()).origin}`);
      socket.close({ code: 1008, reason: "Mocked suite: network isolated" });
    });
    await use();
    await testInfo.attach("blocked-network", {
      body: JSON.stringify(blocked, null, 2), contentType: "application/json",
    });
  }, { auto: true }],
});

export { expect };

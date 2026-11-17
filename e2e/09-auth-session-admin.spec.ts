import { test, expect } from "./helpers/isolated-test";

function makeJwt(sub: string, expOffsetSec: number, roleClaim?: string): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(
    JSON.stringify({
      sub,
      ...(roleClaim ? { role: roleClaim } : {}),
      exp: Math.floor(Date.now() / 1000) + expOffsetSec,
    }),
  ).toString("base64url");
  return `${header}.${body}.mock_sig`;
}

test.describe("P1.3 Auth Session, Single-Flight Refresh, Role Guard & TECH-CONFIG-01", () => {
  test("TECH-CONFIG-01 & hydration refresh: routes via /api, refreshes expired access once, and opens SSE on /api/v1", async ({
    page,
  }) => {
    const expiredToken = makeJwt("1", -120);
    const freshToken = makeJwt("1", 900);
    let refreshCalls = 0;
    const requestedUrls: string[] = [];

    await page.addInitScript(
      ({ access, refresh }) => {
        localStorage.setItem("i18nextLng", "en");
        localStorage.setItem("taskpilot_access_token", access);
        localStorage.setItem("taskpilot_refresh_token", refresh);
      },
      { access: expiredToken, refresh: "11111111-1111-4111-8111-111111111111" },
    );

    await page.route("**/api/v1/**", async (route) => {
      const request = route.request();
      const url = request.url();
      requestedUrls.push(url);

      if (url.endsWith("/api/v1/auth/refresh")) {
        refreshCalls += 1;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            status: 200,
            message: "OK",
            data: {
              token: freshToken,
              refreshToken: "22222222-2222-4222-8222-222222222222",
              type: "Bearer",
              expiresIn: 900,
            },
          }),
        });
        return;
      }

      if (url.endsWith("/api/v1/users/me")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            status: 200,
            message: "OK",
            data: {
              id: 1,
              email: "user@taskpilot.local",
              fullName: "Test User",
              avatarUrl: null,
              role: "USER",
              status: "AVAILABLE",
              currentWorkload: 0,
              createdAt: "2026-01-01T00:00:00Z",
              updatedAt: "2026-01-01T00:00:00Z",
            },
          }),
        });
        return;
      }

      if (url.includes("/api/v1/notifications/my/stream")) {
        await route.fulfill({
          status: 200,
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
          },
          body: "event: notification.unread-count\ndata: 0\n\n",
        });
        return;
      }

      if (url.includes("/api/v1/notifications/my/unread-count")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ status: 200, message: "OK", data: 0 }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: 200,
          message: "OK",
          data: { content: [], totalElements: 0, totalPages: 0, size: 20, number: 0 },
        }),
      });
    });

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect.poll(() => refreshCalls).toBe(1);
    expect(requestedUrls.some((u) => u.includes("/api/v1/notifications/my/stream"))).toBe(true);

    const savedAccess = await page.evaluate(() => localStorage.getItem("taskpilot_access_token"));
    const savedRefresh = await page.evaluate(() => localStorage.getItem("taskpilot_refresh_token"));
    expect(savedAccess).toBe(freshToken);
    expect(savedRefresh).toBe("22222222-2222-4222-8222-222222222222");
  });

  test("revoked refresh clears session caches and redirects to /login", async ({ page }) => {
    const expiredToken = makeJwt("1", -120);

    await page.addInitScript(
      ({ access, refresh }) => {
        localStorage.setItem("i18nextLng", "en");
        localStorage.setItem("taskpilot_access_token", access);
        localStorage.setItem("taskpilot_refresh_token", refresh);
        localStorage.setItem("userRole", "ADMIN");
        localStorage.setItem("navContext", "ADMIN_SYSTEM");
        localStorage.setItem("ai.pending.request.1", "pending-1");
      },
      { access: expiredToken, refresh: "11111111-1111-4111-8111-111111111111" },
    );

    await page.route("**/api/v1/auth/refresh", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ status: 401, message: "Refresh revoked" }),
      });
    });

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login$/);

    const remaining = await page.evaluate(() => ({
      access: localStorage.getItem("taskpilot_access_token"),
      refresh: localStorage.getItem("taskpilot_refresh_token"),
      role: localStorage.getItem("userRole"),
      nav: localStorage.getItem("navContext"),
      aiPending: localStorage.getItem("ai.pending.request.1"),
    }));
    expect(remaining).toEqual({
      access: null,
      refresh: null,
      role: null,
      nav: null,
      aiPending: null,
    });
  });

  test("blocks non-admin USER from /admin/users even with stale localStorage ADMIN and forged JWT claim", async ({
    page,
  }) => {
    const forgedToken = makeJwt("2", 900, "ADMIN");

    await page.addInitScript(
      ({ access, refresh }) => {
        localStorage.setItem("i18nextLng", "en");
        localStorage.setItem("taskpilot_access_token", access);
        localStorage.setItem("taskpilot_refresh_token", refresh);
        localStorage.setItem("userRole", "ADMIN");
        localStorage.setItem("navContext", "ADMIN_SYSTEM");
      },
      { access: forgedToken, refresh: "11111111-1111-4111-8111-111111111111" },
    );

    await page.route("**/api/v1/**", async (route) => {
      const url = route.request().url();
      if (url.endsWith("/api/v1/users/me")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            status: 200,
            message: "OK",
            data: {
              id: 2,
              email: "user@taskpilot.local",
              fullName: "Regular User",
              avatarUrl: null,
              role: "USER",
              status: "AVAILABLE",
              currentWorkload: 0,
              createdAt: "2026-01-01T00:00:00Z",
              updatedAt: "2026-01-01T00:00:00Z",
            },
          }),
        });
        return;
      }
      if (url.includes("/api/v1/notifications/my/stream")) {
        await route.fulfill({
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
          body: "event: notification.unread-count\ndata: 0\n\n",
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: 200,
          message: "OK",
          data: { content: [], totalElements: 0, totalPages: 0, size: 20, number: 0 },
        }),
      });
    });

    await page.goto("/admin/users");
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByTestId("nav-context-switcher")).toHaveCount(0);
  });

  test("coordinates multi-tab refresh via Web Locks so two concurrent tabs issue only one refresh", async ({
    context,
  }) => {
    const expiredToken = makeJwt("1", -120);
    const freshToken = makeJwt("1", 900);
    let refreshCalls = 0;

    await context.addInitScript(
      ({ access, refresh }) => {
        localStorage.setItem("i18nextLng", "en");
        if (!localStorage.getItem("taskpilot_access_token")) {
          localStorage.setItem("taskpilot_access_token", access);
          localStorage.setItem("taskpilot_refresh_token", refresh);
        }
      },
      { access: expiredToken, refresh: "11111111-1111-4111-8111-111111111111" },
    );

    await context.route("**/api/v1/**", async (route) => {
      const url = route.request().url();
      if (url.endsWith("/api/v1/auth/refresh")) {
        refreshCalls += 1;
        await new Promise((resolve) => setTimeout(resolve, 60));
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            status: 200,
            message: "OK",
            data: {
              token: freshToken,
              refreshToken: "22222222-2222-4222-8222-222222222222",
              type: "Bearer",
              expiresIn: 900,
            },
          }),
        });
        return;
      }
      if (url.endsWith("/api/v1/users/me")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            status: 200,
            message: "OK",
            data: {
              id: 1,
              email: "user@taskpilot.local",
              fullName: "Test User",
              avatarUrl: null,
              role: "USER",
              status: "AVAILABLE",
              currentWorkload: 0,
              createdAt: "2026-01-01T00:00:00Z",
              updatedAt: "2026-01-01T00:00:00Z",
            },
          }),
        });
        return;
      }
      if (url.includes("/api/v1/notifications/my/stream")) {
        await route.fulfill({
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
          body: "event: notification.unread-count\ndata: 0\n\n",
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: 200,
          message: "OK",
          data: { content: [], totalElements: 0, totalPages: 0, size: 20, number: 0 },
        }),
      });
    });

    const pageA = await context.newPage();
    const pageB = await context.newPage();
    await Promise.all([pageA.goto("/dashboard"), pageB.goto("/dashboard")]);

    await expect(pageA).toHaveURL(/\/dashboard$/);
    await expect(pageB).toHaveURL(/\/dashboard$/);
    expect(refreshCalls).toBe(1);
  });
});

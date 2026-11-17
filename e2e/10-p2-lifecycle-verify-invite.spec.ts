import { test, expect } from "./helpers/isolated-test";

function makeJwt(sub: string, expOffsetSec: number): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(
    JSON.stringify({
      sub,
      exp: Math.floor(Date.now() / 1000) + expOffsetSec,
    }),
  ).toString("base64url");
  return `${header}.${body}.mock_sig`;
}

test.describe("P2 Verify, Restore, OAuth Setup, and Private Invitation UI", () => {
  test("verifies mailbox owner chosen final password via /verify-email", async ({ page }) => {
    let submittedPayload: unknown = null;
    await page.addInitScript(() => {
      localStorage.setItem("i18nextLng", "en");
    });

    await page.route("**/api/v1/auth/verify-email", async (route) => {
      submittedPayload = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: 200, message: "OK", data: null }),
      });
    });

    await page.goto("/verify-email?token=verify-pw-tok");
    await page.getByLabel("New Password").fill("MailboxChosen99!");
    await page.getByLabel("Confirm Password").fill("MailboxChosen99!");
    await page.getByRole("button", { name: /Verify & Activate Account/i }).click();

    await expect(page.getByRole("heading", { name: "Email Verified" })).toBeVisible();
    expect(submittedPayload).toEqual({
      token: "verify-pw-tok",
      newPassword: "MailboxChosen99!",
    });
  });

  test("login RESTORE_REQUIRED routes to /restore-account and confirms restore", async ({ page }) => {
    const freshJwt = makeJwt("7", 900);
    await page.addInitScript(() => {
      localStorage.setItem("i18nextLng", "en");
    });

    await page.route("**/api/v1/**", async (route) => {
      const url = route.request().url();
      if (url.endsWith("/api/v1/auth/login")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            status: 200,
            message: "OK",
            data: {
              outcome: "RESTORE_REQUIRED",
              restoreTicket: "restore-e2e-ticket",
              email: "deact@taskpilot.local",
              provider: "local",
            },
          }),
        });
        return;
      }
      if (url.endsWith("/api/v1/auth/restore/confirm")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            status: 200,
            message: "OK",
            data: {
              token: freshJwt,
              refreshToken: "ref-7",
              type: "Bearer",
              expiresIn: 900,
              outcome: "AUTHENTICATED",
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
              id: 7,
              email: "deact@taskpilot.local",
              fullName: "Restored User",
              role: "USER",
              status: "AVAILABLE",
              availability: "AVAILABLE",
              accountState: "ACTIVE",
              emailVerified: true,
              hasPassword: true,
              linkedProviders: [],
              createdAt: "2026-01-01T00:00:00Z",
              updatedAt: "2026-01-01T00:00:00Z",
            },
          }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: 200, message: "OK", data: [] }),
      });
    });

    await page.goto("/login");
    await page.getByLabel(/Email/i).fill("deact@taskpilot.local");
    await page.getByLabel(/Password/i).fill("CorrectPass99!");
    await page.locator('button[type="submit"]').click();

    await expect(page).toHaveURL(/\/restore-account/);
    await page.getByRole("button", { name: /Confirm Restore/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("private project invitation acceptance works on /invitations/accept", async ({ page }) => {
    const jwt = makeJwt("9", 900);
    await page.addInitScript(({ access }) => {
      localStorage.setItem("i18nextLng", "en");
      localStorage.setItem("taskpilot_access_token", access);
      localStorage.setItem("taskpilot_refresh_token", "ref-9");
    }, { access: jwt });

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
              id: 9,
              email: "invitee@taskpilot.local",
              fullName: "Invitee",
              role: "USER",
              status: "AVAILABLE",
              emailVerified: true,
              hasPassword: true,
              createdAt: "2026-01-01T00:00:00Z",
              updatedAt: "2026-01-01T00:00:00Z",
            },
          }),
        });
        return;
      }
      if (url.endsWith("/api/v1/projects/invitations/accept")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            status: 200,
            message: "OK",
            data: { projectId: 42, userId: 9, role: "MEMBER" },
          }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: 200, message: "OK", data: { content: [] } }),
      });
    });

    await page.goto("/invitations/accept?token=priv-inv-42");
    await page.getByRole("button", { name: /Accept Invitation/i }).click();
    await expect(page).toHaveURL(/\/projects\/42/);
  });
});

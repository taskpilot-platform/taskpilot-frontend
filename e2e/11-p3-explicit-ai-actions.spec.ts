import { test, expect } from "./helpers/isolated-test";
import { setupWorkspaceMocks } from "./helpers/mock-setup";

test.describe("P3 explicit AI actions (mock API, no model/provider)", () => {
  for (const mode of ["success", "retry", "conflict", "cancel", "expired"] as const) {
    test(mode, async ({ page }) => {
      await setupWorkspaceMocks(page, { language: "vi" });
      await page.route("**/api/v1/users/me/skills/directory", (route) => route.fulfill({ json: { status: 200, data: [] } }));
      const requests: { url: string; body: Record<string, unknown> }[] = [];
      let calls = 0;
      const confirmation = {
        confirmationRequired: true, actionId: "p3-action", payloadHash: "bound-preview-sha256",
        toolName: "createTask", summary: "Tạo task minh chứng P3",
        arguments: { projectId: 100, title: "Task minh chứng P3" },
        expiresAt: mode === "expired" ? "2020-01-01T00:00:00Z" : new Date(Date.now() + 600_000).toISOString(),
      };
      await page.route("**/api/v1/ai/**", async (route) => {
        const url = new URL(route.request().url());
        if (url.pathname.includes("/actions/")) {
          requests.push({ url: url.pathname, body: route.request().postDataJSON() ?? {} });
          calls++;
          if (mode === "retry" && calls === 1) { await route.abort("failed"); return; }
          const status = mode === "conflict" ? 409 : 200;
          await route.fulfill({ status, json: { status, message: status === 409 ? "Resource changed" : "Success", data: { id: 501 } } });
          return;
        }
        if (url.pathname.endsWith("/messages")) {
          await route.fulfill({ json: { status: 200, data: { content: [{ id: 5, sender: "ASSISTANT",
            content: "Xem trước thao tác.\n```taskpilot-confirm\n" + JSON.stringify(confirmation) + "\n```", createdAt: new Date().toISOString() }], totalElements: 1 } } });
        } else if (url.pathname.endsWith("/sessions")) {
          await route.fulfill({ json: { status: 200, data: { content: [{ id: 42, title: "P3 action session", createdAt: new Date().toISOString(), messageCount: 1 }] } } });
        } else { await route.fulfill({ json: { status: 200, data: null } }); }
      });
      await page.goto("/copilot");
      await page.getByText("P3 action session", { exact: true }).first().click();
      if (mode === "expired") {
        await expect(page.getByRole("button", { name: "Cần tạo lại bản xem trước" }).first()).toBeDisabled();
        expect(requests).toHaveLength(0);
        return;
      }
      await page.getByRole("button", { name: mode === "cancel" ? "Hủy" : "Xác nhận", exact: true }).first().click();
      if (mode === "retry") {
        await expect(page.getByRole("alert").filter({ hasText: "thử lại an toàn" })).toBeVisible();
        await page.getByRole("button", { name: "Xác nhận", exact: true }).first().click();
      }
      if (mode === "conflict") {
        await expect(page.getByRole("alert").filter({ hasText: "tạo lại" })).toBeVisible();
        await expect(page.getByRole("button", { name: "Cần tạo lại bản xem trước" }).first()).toBeDisabled();
      } else {
        await expect(page.getByRole("button", { name: mode === "cancel" ? "Đã hủy" : "Đã thực hiện" }).first()).toBeDisabled();
      }
      expect(requests).toHaveLength(mode === "retry" ? 2 : 1);
      expect(requests[0].url).toBe(`/api/v1/ai/sessions/42/actions/p3-action/${mode === "cancel" ? "cancel" : "confirm"}`);
      if (mode !== "cancel") {
        expect(requests[0].body).toEqual({ payloadHash: confirmation.payloadHash, idempotencyKey: "ui-action-p3-action" });
        if (mode === "retry") expect(requests[1].body).toEqual(requests[0].body);
      }
    });
  }
});

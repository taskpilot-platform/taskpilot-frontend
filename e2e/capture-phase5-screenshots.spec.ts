import { test, expect } from "./helpers/isolated-test";
import { setupWorkspaceMocks } from "./helpers/mock-setup";

// Mocked UI captures; not evidence of live messaging, adaptive learning or video transport.
test("capture current P4 project collaboration views without deferred custom groups", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 850 });
  await setupWorkspaceMocks(page, { language: "en" });
  await page.goto("/chat?project=100");
  await expect(page.getByTestId("global-chat-page")).toBeVisible();
  await expect(page.getByTestId("active-channel-name")).toBeVisible();
  await expect(page.getByTestId("tab-chat-btn")).toBeVisible();
  await expect(page.getByTestId("btn-open-create-group")).toHaveCount(0);
  await page.screenshot({ path: test.info().outputPath("p4-project-chat-desktop.png") });

  await page.getByTestId("tab-files-btn").click();
  await expect(page.getByRole("heading", { name: "Project Files" })).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("p4-project-files.png") });

  await page.getByTestId("tab-meetings-btn").click();
  await expect(page.getByTestId("project-meetings-tab")).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("p4-project-meetings.png") });

  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/chat?project=100");
  await expect(page.getByTestId("global-chat-page")).toBeVisible();
  await expect(page.getByTestId("toggle-mobile-channel-list-btn")).toBeVisible();
  await expect(page.getByTestId("btn-open-create-group")).toHaveCount(0);
  await page.screenshot({ path: test.info().outputPath("p4-project-chat-mobile.png") });
});

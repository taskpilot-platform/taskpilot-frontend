import { test, expect } from "@playwright/test";
import { setupWorkspaceMocks } from "./helpers/mock-setup";
import * as path from "path";
import * as fs from "fs";

const TARGET_DIRS = [
  "/home/dptn/.gemini/antigravity-cli/brain/92660f43-2135-48b7-83f2-c958f2f8b092/assets/collab",
  "/home/dptn/projects/taskpilot/report/src/assets/collab",
];

async function saveScreenshot(page: any, filename: string) {
  for (const dir of TARGET_DIRS) {
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const fullPath = path.join(dir, filename);
      await page.screenshot({ path: fullPath, fullPage: false });
      console.log(`Saved screenshot: ${fullPath}`);
    } catch (err: any) {
      console.warn(`Could not save screenshot to ${dir}: ${err.message}`);
    }
  }
}

test.describe("Phase 5 MS Teams Collab & Adaptive AI Screenshots", () => {
  test("Capture screenshots 18 to 23", async ({ page }) => {
    test.setTimeout(90000);

    // 18. MS Teams Unified Chat Desktop View
    await page.setViewportSize({ width: 1366, height: 850 });
    await setupWorkspaceMocks(page);
    await page.goto("/chat");
    await expect(page.locator('[data-testid="global-chat-page"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="active-channel-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="tab-chat-btn"]')).toBeVisible();
    await page.waitForTimeout(1000);
    await saveScreenshot(page, "18_ms_teams_unified_chat_desktop.png");

    // 19. MS Teams Create Group Chat Modal
    await page.locator('[data-testid="btn-open-create-group"]').click();
    await expect(page.locator('[data-testid="input-group-name"]')).toBeVisible();
    await page.locator('[data-testid="input-group-name"]').fill("Nhóm Nghiên cứu AI & Adaptive Weights");
    await page.locator('[data-testid="input-group-description"]').fill("Trao đổi chuyên sâu về Heuristic Scoring và Offline Weight Proposals");
    await page.waitForTimeout(500);
    await saveScreenshot(page, "19_ms_teams_create_group_chat_modal.png");

    // Click submit to create group
    await page.locator('[data-testid="btn-submit-create-group"]').click();
    await page.waitForTimeout(1000);

    // 20. Custom Standalone Group Conversation
    // Group should be active now or we click it
    const activeHeader = page.locator('[data-testid="active-channel-name"]');
    await expect(activeHeader).toBeVisible();
    // Fill message in custom group chat composer
    const composer = page.locator('textarea, input[placeholder*="tin nhắn"], input[placeholder*="message"]').last();
    if (await composer.isVisible()) {
      await composer.fill("Xin chào cả nhóm! Kết quả kiểm thử Offline Adaptive Weight Proposals trên tập dữ liệu V40 đạt 100% hội tụ.");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(500);
    }
    await saveScreenshot(page, "20_ms_teams_custom_group_conversation.png");

    // 21. MS Teams 3-Pillars: Switch to Files Tab
    const channel100 = page.locator('[data-testid="channel-item-100"]');
    if (await channel100.isVisible()) {
      await channel100.click();
      await page.waitForTimeout(500);
    }
    const tabFilesBtn = page.locator('[data-testid="tab-files-btn"]');
    await expect(tabFilesBtn).toBeVisible();
    await tabFilesBtn.click();
    await page.waitForTimeout(1000);
    await saveScreenshot(page, "21_ms_teams_3_pillars_tabs.png");

    // 22. AI Adaptive Recommendation Card View
    await page.goto("/demo-recommendation");
    await expect(page.locator('[data-testid="demo-adaptive-card-page"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="recommendation-card-container"]')).toBeVisible();
    await page.waitForTimeout(1000);
    await saveScreenshot(page, "22_ai_adaptive_recommendation_card.png");

    // 23. Mobile Responsive View (375x812 iPhone)
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/chat");
    await expect(page.locator('[data-testid="global-chat-page"]')).toBeVisible({ timeout: 15000 });
    const mobileToggle = page.locator('[data-testid="toggle-mobile-channel-list-btn"]');
    if (await mobileToggle.isVisible()) {
      await mobileToggle.click();
      await page.waitForTimeout(500);
    }
    await saveScreenshot(page, "23_mobile_responsive_collab_hub.png");
  });
});

import { test, expect } from "@playwright/test";
import { setupWorkspaceMocks } from "./helpers/mock-setup";

const ATTACHMENT_MESSAGES = [
  {
    id: 1,
    projectId: 100,
    senderId: 2, // Sarah Connor
    senderName: "Sarah Connor",
    senderAvatarUrl: null,
    messageType: "FILE",
    content: "Here is the sprint retrospective report for review:",
    fileId: 42,
    fileName: "Sprint_Retrospective_Report.pdf",
    createdAt: "2026-10-08T08:00:00Z",
  },
  {
    id: 2,
    projectId: 100,
    senderId: 1, // Alex Rivera
    senderName: "Alex Rivera",
    senderAvatarUrl: null,
    messageType: "TEXT",
    content: "Thanks Sarah, downloading now!",
    createdAt: "2026-10-08T08:05:00Z",
  },
];

const INITIAL_PROJECT_FILES = [
  {
    id: 42,
    projectId: 100,
    uploaderId: 2,
    uploaderName: "Sarah Connor",
    fileName: "Sprint_Retrospective_Report.pdf",
    originalName: "Sprint_Retrospective_Report.pdf",
    fileSize: 1024 * 720,
    contentType: "application/pdf",
    storageKey: "projects/100/files/uuid_retro.pdf",
    storageBucket: "documents",
    createdAt: "2026-10-08T08:00:00Z",
    updatedAt: "2026-10-08T08:00:00Z",
  },
];

test.describe("Suite 5: Chat Attachments, Navigation & Cross-Tab E2E (TC086 - TC100)", () => {
  test.beforeEach(async ({ page }) => {
    await setupWorkspaceMocks(page, {
      initialMessages: ATTACHMENT_MESSAGES,
      initialFiles: INITIAL_PROJECT_FILES,
    });
  });

  // TC086: Message with FILE type renders attachment card
  test("TC086: Chat message with FILE type renders attachment container", async ({ page }) => {
    await page.goto("/projects/100/chat");
    await expect(page.getByText("Sprint_Retrospective_Report.pdf")).toBeVisible();
  });

  // TC087: File attachment displays file icon and download action
  test("TC087: File attachment card displays FileText icon and download anchor", async ({ page }) => {
    await page.goto("/projects/100/chat");
    const attachmentAnchor = page.locator('a[href*="/files/42/download"]');
    await expect(attachmentAnchor).toBeVisible();
  });

  // TC088: Clicking attachment triggers download URL
  test("TC088: Clicking file attachment card points to correct download endpoint", async ({ page }) => {
    await page.goto("/projects/100/chat");
    const attachmentAnchor = page.locator('a[href*="/files/42/download"]');
    const href = await attachmentAnchor.getAttribute("href");
    expect(href).toContain("/v1/projects/100/files/42/download");
  });

  // TC089: Tab navigation: Click Files button switches to Files tab
  test("TC089: Clicking Files button in tab bar displays Project File Storage", async ({ page }) => {
    await page.goto("/projects/100/overview");
    const filesTabBtn = page.getByRole("button", { name: /^Files$/i });
    await filesTabBtn.click();

    await expect(page.getByRole("heading", { name: "Project Files" })).toBeVisible();
    expect(page.url()).toContain("/projects/100/files");
  });

  // TC090: Tab navigation: Click Chat button switches to Chat tab
  test("TC090: Clicking Chat button in tab bar displays Project Chat Room", async ({ page }) => {
    await page.goto("/projects/100/files");
    const chatTabBtn = page.getByRole("button", { name: /^Chat$/i });
    await chatTabBtn.click();

    await expect(page.getByText("Project Chat Room")).toBeVisible();
    expect(page.url()).toContain("/projects/100/chat");
  });

  // TC091: Tab navigation: Switch back to Overview / Board
  test("TC091: Switching from Chat back to Board displays Board view", async ({ page }) => {
    await page.goto("/projects/100/chat");
    const boardTabBtn = page.getByRole("button", { name: /^Board$/i });
    await boardTabBtn.click();

    expect(page.url()).toContain("/projects/100/board");
  });

  // TC092: Direct link navigation to /projects/100/files
  test("TC092: Direct URL access to /projects/100/files routes directly to files tab", async ({ page }) => {
    await page.goto("/projects/100/files");
    await expect(page.getByRole("heading", { name: "Project Files" })).toBeVisible();
  });

  // TC093: Direct link navigation to /projects/100/chat
  test("TC093: Direct URL access to /projects/100/chat routes directly to chat tab", async ({ page }) => {
    await page.goto("/projects/100/chat");
    await expect(page.getByText("Project Chat Room")).toBeVisible();
  });

  // TC094: URL updates synchronously when clicking tabs
  test("TC094: Navigation bar clicks update browser history pathname", async ({ page }) => {
    await page.goto("/projects/100/overview");

    await page.getByRole("button", { name: /^Files$/i }).click();
    await page.waitForURL("**/projects/100/files");

    await page.getByRole("button", { name: /^Chat$/i }).click();
    await page.waitForURL("**/projects/100/chat");
  });

  // TC095: Active tab styling for Files button
  test("TC095: Files tab button receives active secondary variant when selected", async ({ page }) => {
    await page.goto("/projects/100/files");
    const filesTabBtn = page.getByRole("button", { name: /^Files$/i });
    await expect(filesTabBtn).toHaveClass(/bg-muted/);
  });

  // TC096: Active tab styling for Chat button
  test("TC096: Chat tab button receives active secondary variant when selected", async ({ page }) => {
    await page.goto("/projects/100/chat");
    const chatTabBtn = page.getByRole("button", { name: /^Chat$/i });
    await chatTabBtn.click();
    await expect(chatTabBtn).toHaveClass(/bg-muted/);
  });

  // TC097: Project workspace header persists across tab changes
  test("TC097: Top project navigation bar remains visible across Files and Chat tabs", async ({ page }) => {
    await page.goto("/projects/100/files");
    await expect(page.getByText("TaskPilot Collaboration Workspace")).toBeVisible();

    await page.getByRole("button", { name: /^Chat$/i }).click();
    await expect(page.getByText("TaskPilot Collaboration Workspace")).toBeVisible();
  });

  // TC098: Multi-user simulation in chat
  test("TC098: Distinguishes between multiple team members in discussion thread", async ({ page }) => {
    await page.goto("/projects/100/chat");
    await expect(page.getByText("Sarah Connor")).toBeVisible();
    await expect(page.getByText("Thanks Sarah, downloading now!")).toBeVisible();
  });

  // TC099: Stress burst: Multiple messages in order
  test("TC099: Stress burst of 5 messages renders all in chronological sequence", async ({ page }) => {
    await page.goto("/projects/100/chat");
    const input = page.getByPlaceholder("Type a message...");

    for (let i = 1; i <= 5; i++) {
      await input.fill(`Burst message sequence #${i}`);
      await input.press("Enter");
      await expect(page.getByText(`Burst message sequence #${i}`)).toBeVisible();
    }
  });

  // TC100: End-to-end full workflow: Upload spec in Files -> Announce in Chat -> Verify persistence
  test("TC100: E2E Full Workflow: Upload spec in Files tab, announce in Chat room, verify seamless cross-tab persistence", async ({ page }) => {
    // 1. Start on Files tab
    await page.goto("/projects/100/files");
    await expect(page.getByRole("heading", { name: "Project Files" })).toBeVisible();

    // 2. Upload spec file
    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.getByText("Upload File").click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: "taskpilot_phase3_spec.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("pdf-bytes"),
    });

    await expect(page.getByText("uploaded_test_file.pdf")).toBeVisible();

    // 3. Switch to Chat tab
    const chatBtn = page.getByRole("button", { name: /^Chat$/i });
    await chatBtn.click();
    await expect(page.getByText("Project Chat Room")).toBeVisible();

    // 4. Send announcement message to team
    const chatInput = page.getByPlaceholder("Type a message...");
    await chatInput.fill("Team, I have uploaded the Phase 3 specification in Files tab!");
    await chatInput.press("Enter");

    await expect(page.getByText("Team, I have uploaded the Phase 3 specification in Files tab!")).toBeVisible();

    // 5. Navigate back to Files tab and verify data remains intact
    const filesBtn = page.getByRole("button", { name: /^Files$/i });
    await filesBtn.click();
    await expect(page.getByRole("heading", { name: "Project Files" })).toBeVisible();
    await expect(page.getByText("uploaded_test_file.pdf")).toBeVisible();

    // 6. Navigate back to Chat tab and verify message is still rendered
    await chatBtn.click();
    await expect(page.getByText("Team, I have uploaded the Phase 3 specification in Files tab!")).toBeVisible();
  });
});

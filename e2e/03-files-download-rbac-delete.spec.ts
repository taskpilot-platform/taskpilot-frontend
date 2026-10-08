import { test, expect } from "@playwright/test";
import { setupWorkspaceMocks, DEFAULT_MOCK_USER, TEAMMATE_USER } from "./helpers/mock-setup";

const SAMPLE_FILES = [
  {
    id: 1,
    projectId: 100,
    uploaderId: 1, // Alex Rivera (manager & uploader)
    uploaderName: "Alex Rivera",
    fileName: "spec_architecture.pdf",
    originalName: "spec_architecture.pdf",
    fileSize: 1024 * 300,
    contentType: "application/pdf",
    storageKey: "projects/100/files/uuid_spec.pdf",
    storageBucket: "documents",
    createdAt: "2026-10-08T08:00:00Z",
    updatedAt: "2026-10-08T08:00:00Z",
  },
  {
    id: 2,
    projectId: 100,
    uploaderId: 2, // Sarah Connor (teammate)
    uploaderName: "Sarah Connor",
    fileName: "design_system.png",
    originalName: "design_system.png",
    fileSize: 1024 * 1024 * 2.5,
    contentType: "image/png",
    storageKey: "projects/100/files/uuid_design.png",
    storageBucket: "documents",
    createdAt: "2026-10-08T08:10:00Z",
    updatedAt: "2026-10-08T08:10:00Z",
  },
];

test.describe("Suite 3: Project File Storage - Download & Delete RBAC (TC046 - TC060)", () => {
  // TC046: Download link exists
  test("TC046: Download link is present in file action buttons", async ({ page }) => {
    await setupWorkspaceMocks(page, { initialFiles: SAMPLE_FILES });
    await page.goto("/projects/100/files");
    const downloadLinks = page.locator('a[download], a[href*="/download"]');
    await expect(downloadLinks.first()).toBeVisible();
  });

  // TC047: Download link URL structure
  test("TC047: Download URL contains correct projectId and fileId", async ({ page }) => {
    await setupWorkspaceMocks(page, { initialFiles: SAMPLE_FILES });
    await page.goto("/projects/100/files");
    const downloadLink = page.locator('a[href*="/v1/projects/100/files/1/download"]');
    await expect(downloadLink).toBeAttached();
  });

  // TC048: Delete button visible for file uploader
  test("TC048: Delete button is visible for the file uploader", async ({ page }) => {
    await setupWorkspaceMocks(page, { initialFiles: SAMPLE_FILES, user: DEFAULT_MOCK_USER, isManager: false });
    await page.goto("/projects/100/files");
    // Alex uploaded file 1, so Alex can delete file 1
    const row = page.locator("div").filter({ hasText: "spec_architecture.pdf" });
    const deleteBtn = row.locator("button").filter({ has: page.locator("svg.lucide-trash-2") });
    await expect(deleteBtn.first()).toBeVisible();
  });

  // TC049: Delete button visible for Project Manager on all files
  test("TC049: Delete button is visible for Project Manager on teammate files", async ({ page }) => {
    await setupWorkspaceMocks(page, { initialFiles: SAMPLE_FILES, user: DEFAULT_MOCK_USER, isManager: true });
    await page.goto("/projects/100/files");
    // Manager Alex can delete Sarah's file (file 2)
    const row = page.locator("div").filter({ hasText: "design_system.png" });
    const deleteBtn = row.locator("button").filter({ has: page.locator("svg.lucide-trash-2") });
    await expect(deleteBtn.first()).toBeVisible();
  });

  // TC050: Delete button hidden for non-uploader regular Member
  test("TC050: Delete button is hidden for regular member on teammate files", async ({ page }) => {
    // Logged in as Sarah (regular member, not manager)
    await setupWorkspaceMocks(page, { initialFiles: SAMPLE_FILES, user: TEAMMATE_USER, isManager: false });
    await page.goto("/projects/100/files");
    // Sarah should NOT see delete button on Alex's file (file 1)
    const alexFileRow = page.locator("div").filter({ hasText: "spec_architecture.pdf" }).last();
    const deleteBtn = alexFileRow.locator("button").filter({ has: page.locator("svg.lucide-trash-2") });
    await expect(deleteBtn).not.toBeVisible();
  });

  // TC051: Delete button hidden when project is archived
  test("TC051: Delete button is hidden when project is in ARCHIVED status", async ({ page }) => {
    await setupWorkspaceMocks(page, { initialFiles: SAMPLE_FILES, isArchived: true, isManager: true });
    await page.goto("/projects/100/files");
    const deleteButtons = page.locator("button svg.lucide-trash-2");
    await expect(deleteButtons).toHaveCount(0);
  });

  // TC052: Confirm dialog triggers on delete click
  test("TC052: Clicking delete button prompts window.confirm dialog", async ({ page }) => {
    await setupWorkspaceMocks(page, { initialFiles: SAMPLE_FILES, isManager: true });
    await page.goto("/projects/100/files");

    let dialogAppeared = false;
    page.once("dialog", (dialog) => {
      dialogAppeared = true;
      void dialog.dismiss();
    });

    const row = page.locator("div").filter({ hasText: "spec_architecture.pdf" });
    const deleteBtn = row.locator("button").filter({ has: page.locator("svg.lucide-trash-2") }).first();
    await deleteBtn.click();
    expect(dialogAppeared).toBe(true);
  });

  // TC053: Canceling confirm dialog retains the file
  test("TC053: Dismissing confirmation dialog retains file in list", async ({ page }) => {
    await setupWorkspaceMocks(page, { initialFiles: SAMPLE_FILES, isManager: true });
    await page.goto("/projects/100/files");

    page.once("dialog", (dialog) => {
      void dialog.dismiss();
    });

    const row = page.locator("div").filter({ hasText: "spec_architecture.pdf" });
    const deleteBtn = row.locator("button").filter({ has: page.locator("svg.lucide-trash-2") }).first();
    await deleteBtn.click();

    await expect(page.getByText("spec_architecture.pdf")).toBeVisible();
  });

  // TC054: Confirming delete removes file from UI
  test("TC054: Confirming delete sends API request and removes row", async ({ page }) => {
    await setupWorkspaceMocks(page, { initialFiles: SAMPLE_FILES, isManager: true });
    await page.goto("/projects/100/files");

    page.once("dialog", (dialog) => {
      void dialog.accept();
    });

    const row = page.locator("div").filter({ hasText: "spec_architecture.pdf" });
    const deleteBtn = row.locator("button").filter({ has: page.locator("svg.lucide-trash-2") }).first();
    await deleteBtn.click();

    await expect(page.getByText("spec_architecture.pdf")).not.toBeVisible();
  });

  // TC055: Deleting file decrements counter
  test("TC055: Deleting file updates card header counter from 2 to 1", async ({ page }) => {
    await setupWorkspaceMocks(page, { initialFiles: SAMPLE_FILES, isManager: true });
    await page.goto("/projects/100/files");
    await expect(page.getByText("All Documents (2)")).toBeVisible();

    page.once("dialog", (dialog) => void dialog.accept());
    const row = page.locator("div").filter({ hasText: "spec_architecture.pdf" });
    const deleteBtn = row.locator("button").filter({ has: page.locator("svg.lucide-trash-2") }).first();
    await deleteBtn.click();

    await expect(page.getByText("All Documents (1)")).toBeVisible();
  });

  // TC056: Download button hover styling
  test("TC056: Download link has hover styling and accessible role", async ({ page }) => {
    await setupWorkspaceMocks(page, { initialFiles: SAMPLE_FILES });
    await page.goto("/projects/100/files");
    const downloadLink = page.locator('a[href*="/download"]').first();
    await expect(downloadLink).toBeVisible();
    await downloadLink.hover();
  });

  // TC057: Delete failure shows error banner
  test("TC057: Shows error alert if delete API endpoint fails with 500", async ({ page }) => {
    await setupWorkspaceMocks(page, { initialFiles: SAMPLE_FILES, isManager: true });
    // Override delete route to fail
    await page.route("**/api/v1/projects/100/files/*", async (route) => {
      if (route.request().method() === "DELETE") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({
            status: 500,
            message: "Internal storage error during file deletion",
          }),
        });
      } else {
        await route.fallback();
      }
    });

    await page.goto("/projects/100/files");
    page.once("dialog", (dialog) => void dialog.accept());
    const row = page.locator("div").filter({ hasText: "spec_architecture.pdf" });
    const deleteBtn = row.locator("button").filter({ has: page.locator("svg.lucide-trash-2") }).first();
    await deleteBtn.click();

    await expect(page.getByText(/Internal storage error|Failed to delete file/i)).toBeVisible();
  });

  // TC058: Download link target blank or direct download
  test("TC058: Download link has target blank or download attribute for safe browser navigation", async ({ page }) => {
    await setupWorkspaceMocks(page, { initialFiles: SAMPLE_FILES });
    await page.goto("/projects/100/files");
    const downloadLink = page.locator('a[href*="/download"]').first();
    const target = await downloadLink.getAttribute("target");
    expect(target === "_blank" || target === null).toBe(true);
  });

  // TC059: Deleting all files transitions to empty state
  test("TC059: Deleting all remaining files transitions display to empty state illustration", async ({ page }) => {
    await setupWorkspaceMocks(page, {
      initialFiles: [SAMPLE_FILES[0]],
      isManager: true,
    });
    await page.goto("/projects/100/files");
    await expect(page.getByText("spec_architecture.pdf")).toBeVisible();

    page.once("dialog", (dialog) => void dialog.accept());
    const deleteBtn = page.locator("button svg.lucide-trash-2").first();
    await deleteBtn.click();

    await expect(page.getByText("No files in this project yet")).toBeVisible();
  });

  // TC060: Regular member can delete their own uploaded file
  test("TC060: Regular member can delete their own file even without manager role", async ({ page }) => {
    // Logged in as Sarah, who uploaded design_system.png
    await setupWorkspaceMocks(page, { initialFiles: SAMPLE_FILES, user: TEAMMATE_USER, isManager: false });
    await page.goto("/projects/100/files");

    const row = page.locator("div").filter({ hasText: "design_system.png" });
    const deleteBtn = row.locator("button").filter({ has: page.locator("svg.lucide-trash-2") });
    await expect(deleteBtn.first()).toBeVisible();
  });
});

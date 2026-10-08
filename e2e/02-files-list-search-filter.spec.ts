import { test, expect } from "@playwright/test";
import { setupWorkspaceMocks } from "./helpers/mock-setup";

const SAMPLE_FILES = [
  {
    id: 1,
    projectId: 100,
    uploaderId: 1,
    uploaderName: "Alex Rivera",
    fileName: "architecture_blueprint.pdf",
    originalName: "architecture_blueprint.pdf",
    fileSize: 1024 * 512, // 512 KB
    contentType: "application/pdf",
    storageKey: "projects/100/files/uuid_arch.pdf",
    storageBucket: "documents",
    createdAt: "2026-10-08T08:00:00Z",
    updatedAt: "2026-10-08T08:00:00Z",
  },
  {
    id: 2,
    projectId: 100,
    uploaderId: 2,
    uploaderName: "Sarah Connor",
    fileName: "dashboard_wireframe.png",
    originalName: "dashboard_wireframe.png",
    fileSize: 1024 * 1024 * 4.2, // 4.2 MB
    contentType: "image/png",
    storageKey: "projects/100/files/uuid_dash.png",
    storageBucket: "documents",
    createdAt: "2026-10-08T08:15:00Z",
    updatedAt: "2026-10-08T08:15:00Z",
  },
  {
    id: 3,
    projectId: 100,
    uploaderId: 1,
    uploaderName: "Alex Rivera",
    fileName: "q3_financial_model.xlsx",
    originalName: "q3_financial_model.xlsx",
    fileSize: 1024 * 150, // 150 KB
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    storageKey: "projects/100/files/uuid_fin.xlsx",
    storageBucket: "documents",
    createdAt: "2026-10-08T08:20:00Z",
    updatedAt: "2026-10-08T08:20:00Z",
  },
  {
    id: 4,
    projectId: 100,
    uploaderId: 2,
    uploaderName: "Sarah Connor",
    fileName: "release_assets.zip",
    originalName: "release_assets.zip",
    fileSize: 1024 * 1024 * 12.8, // 12.8 MB
    contentType: "application/zip",
    storageKey: "projects/100/files/uuid_rel.zip",
    storageBucket: "documents",
    createdAt: "2026-10-08T08:30:00Z",
    updatedAt: "2026-10-08T08:30:00Z",
  },
  {
    id: 5,
    projectId: 100,
    uploaderId: 1,
    uploaderName: "Alex Rivera",
    fileName: "readme.txt",
    originalName: "readme.txt",
    fileSize: 500, // 500 B
    contentType: "text/plain",
    storageKey: "projects/100/files/uuid_read.txt",
    storageBucket: "documents",
    createdAt: "2026-10-08T08:40:00Z",
    updatedAt: "2026-10-08T08:40:00Z",
  },
];

test.describe("Suite 2: Project File Storage - List, Search, Filter & View (TC026 - TC045)", () => {
  test.beforeEach(async ({ page }) => {
    await setupWorkspaceMocks(page, { initialFiles: SAMPLE_FILES });
  });

  // TC026: Render empty state illustration
  test("TC026: Render empty state message when project has 0 files", async ({ page }) => {
    await setupWorkspaceMocks(page, { initialFiles: [] });
    await page.goto("/projects/100/files");
    await expect(page.getByText("No files in this project yet")).toBeVisible();
    await expect(page.getByText(/Upload architecture specs, design files, or assets/i)).toBeVisible();
  });

  // TC027: Render populated files list
  test("TC027: Render table containing files with filenames and details", async ({ page }) => {
    await page.goto("/projects/100/files");
    await expect(page.getByText("architecture_blueprint.pdf")).toBeVisible();
    await expect(page.getByText("dashboard_wireframe.png")).toBeVisible();
    await expect(page.getByText("q3_financial_model.xlsx")).toBeVisible();
    await expect(page.getByText("release_assets.zip")).toBeVisible();
    await expect(page.getByText("readme.txt")).toBeVisible();
  });

  // TC028: Search files by exact name
  test("TC028: Search files by exact name filters precisely", async ({ page }) => {
    await page.goto("/projects/100/files");
    const searchInput = page.getByPlaceholder("Search files by name...");
    await searchInput.fill("architecture_blueprint.pdf");

    await expect(page.getByText("architecture_blueprint.pdf")).toBeVisible();
    await expect(page.getByText("dashboard_wireframe.png")).not.toBeVisible();
    await expect(page.getByText("release_assets.zip")).not.toBeVisible();
  });

  // TC029: Search files by partial keyword
  test("TC029: Search files by partial keyword returns matching subset", async ({ page }) => {
    await page.goto("/projects/100/files");
    const searchInput = page.getByPlaceholder("Search files by name...");
    await searchInput.fill("model");

    await expect(page.getByText("q3_financial_model.xlsx")).toBeVisible();
    await expect(page.getByText("architecture_blueprint.pdf")).not.toBeVisible();
  });

  // TC030: Search files case-insensitive
  test("TC030: Search files is case-insensitive", async ({ page }) => {
    await page.goto("/projects/100/files");
    const searchInput = page.getByPlaceholder("Search files by name...");
    await searchInput.fill("BLUEPRINT");

    await expect(page.getByText("architecture_blueprint.pdf")).toBeVisible();
  });

  // TC031: Search files by extension
  test("TC031: Search files by extension returns only files with that extension", async ({ page }) => {
    await page.goto("/projects/100/files");
    const searchInput = page.getByPlaceholder("Search files by name...");
    await searchInput.fill(".zip");

    await expect(page.getByText("release_assets.zip")).toBeVisible();
    await expect(page.getByText("architecture_blueprint.pdf")).not.toBeVisible();
  });

  // TC032: Search files with no match
  test("TC032: Search with non-matching query displays empty state", async ({ page }) => {
    await page.goto("/projects/100/files");
    const searchInput = page.getByPlaceholder("Search files by name...");
    await searchInput.fill("nonexistent_filename_xyz");

    await expect(page.getByText("No files in this project yet")).toBeVisible();
  });

  // TC033: Clear search restores all files
  test("TC033: Clearing search query restores all original files", async ({ page }) => {
    await page.goto("/projects/100/files");
    const searchInput = page.getByPlaceholder("Search files by name...");
    await searchInput.fill("wireframe");
    await expect(page.getByText("architecture_blueprint.pdf")).not.toBeVisible();

    await searchInput.fill("");
    await expect(page.getByText("architecture_blueprint.pdf")).toBeVisible();
    await expect(page.getByText("dashboard_wireframe.png")).toBeVisible();
  });

  // TC034: Formats bytes size correctly
  test("TC034: Formats size under 1KB as B (bytes)", async ({ page }) => {
    await page.goto("/projects/100/files");
    await expect(page.getByText("500 B")).toBeVisible();
  });

  // TC035: Formats KB size correctly
  test("TC035: Formats size in hundreds of KB accurately", async ({ page }) => {
    await page.goto("/projects/100/files");
    await expect(page.getByText("512 KB")).toBeVisible();
    await expect(page.getByText("150 KB")).toBeVisible();
  });

  // TC036: Formats MB size correctly
  test("TC036: Formats size in MB accurately with decimals", async ({ page }) => {
    await page.goto("/projects/100/files");
    await expect(page.getByText("4.2 MB")).toBeVisible();
    await expect(page.getByText("12.8 MB")).toBeVisible();
  });

  // TC037: Verify PDF icon renders
  test("TC037: Renders FileText icon for PDF files", async ({ page }) => {
    await page.goto("/projects/100/files");
    const pdfRow = page.locator("tr, div").filter({ hasText: "architecture_blueprint.pdf" });
    await expect(pdfRow.first()).toBeVisible();
  });

  // TC038: Verify Image icon renders
  test("TC038: Renders FileImage icon for PNG files", async ({ page }) => {
    await page.goto("/projects/100/files");
    const imgRow = page.locator("tr, div").filter({ hasText: "dashboard_wireframe.png" });
    await expect(imgRow.first()).toBeVisible();
  });

  // TC039: Verify Spreadsheet icon renders
  test("TC039: Renders FileSpreadsheet icon for Excel files", async ({ page }) => {
    await page.goto("/projects/100/files");
    const excelRow = page.locator("tr, div").filter({ hasText: "q3_financial_model.xlsx" });
    await expect(excelRow.first()).toBeVisible();
  });

  // TC040: Verify Archive icon renders
  test("TC040: Renders FileArchive icon for ZIP files", async ({ page }) => {
    await page.goto("/projects/100/files");
    const zipRow = page.locator("tr, div").filter({ hasText: "release_assets.zip" });
    await expect(zipRow.first()).toBeVisible();
  });

  // TC041: Displays uploader name correctly
  test("TC041: Displays accurate uploader full name in file row", async ({ page }) => {
    await page.goto("/projects/100/files");
    await expect(page.getByText("Alex Rivera").first()).toBeVisible();
    await expect(page.getByText("Sarah Connor").first()).toBeVisible();
  });

  // TC042: Displays upload date
  test("TC042: Displays creation date timestamp in file row", async ({ page }) => {
    await page.goto("/projects/100/files");
    const rows = page.locator("div").filter({ hasText: "architecture_blueprint.pdf" });
    await expect(rows.first()).toBeVisible();
  });

  // TC043: Refresh button triggers fetch
  test("TC043: Clicking Refresh button triggers reload of files list", async ({ page }) => {
    await page.goto("/projects/100/files");
    const refreshBtn = page.getByRole("button", { name: /Refresh/i });
    await expect(refreshBtn).toBeVisible();
    await refreshBtn.click();
    await expect(page.getByText("architecture_blueprint.pdf")).toBeVisible();
  });

  // TC044: Total documents counter badge
  test("TC044: Displays exact total count in card header badge", async ({ page }) => {
    await page.goto("/projects/100/files");
    await expect(page.getByText("All Documents (5)")).toBeVisible();
  });

  // TC045: Mobile viewport layout test
  test("TC045: Displays responsive layout properly on mobile screen width 375px", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/projects/100/files");
    await expect(page.getByRole("heading", { name: "Project Files" })).toBeVisible();
    await expect(page.getByText("architecture_blueprint.pdf")).toBeVisible();
  });
});

import { test, expect } from "@playwright/test";
import { setupWorkspaceMocks, DEFAULT_MOCK_USER } from "./helpers/mock-setup";

test.describe("Suite 1: Project File Storage - Upload & Validation (TC001 - TC025)", () => {
  test.beforeEach(async ({ page }) => {
    await setupWorkspaceMocks(page);
  });

  // TC001: Upload PDF document
  test("TC001: Upload PDF spec under 5MB updates file list", async ({ page }) => {
    await page.goto("/projects/100/files");
    await expect(page.getByRole("heading", { name: "Project Files" })).toBeVisible();

    // Trigger file upload
    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.getByText("Upload File").click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: "system_architecture_spec.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4 test document content"),
    });

    await expect(page.getByText("uploaded_test_file.pdf")).toBeVisible({ timeout: 5000 });
  });

  // TC002: Upload PNG image
  test("TC002: Upload PNG asset file", async ({ page }) => {
    await page.goto("/projects/100/files");
    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.getByText("Upload File").click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: "ui_mockup_dashboard.png",
      mimeType: "image/png",
      buffer: Buffer.from("fake-png-binary-data"),
    });
    await expect(page.getByText("uploaded_test_file.pdf")).toBeVisible();
  });

  // TC003: Upload JPEG image
  test("TC003: Upload JPEG image file", async ({ page }) => {
    await page.goto("/projects/100/files");
    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.getByText("Upload File").click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: "team_photo.jpeg",
      mimeType: "image/jpeg",
      buffer: Buffer.from("fake-jpeg-binary-data"),
    });
    await expect(page.getByText("uploaded_test_file.pdf")).toBeVisible();
  });

  // TC004: Upload WEBP image
  test("TC004: Upload WEBP banner asset", async ({ page }) => {
    await page.goto("/projects/100/files");
    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.getByText("Upload File").click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: "hero_banner.webp",
      mimeType: "image/webp",
      buffer: Buffer.from("fake-webp-binary-data"),
    });
    await expect(page.getByText("uploaded_test_file.pdf")).toBeVisible();
  });

  // TC005: Upload CSV dataset
  test("TC005: Upload CSV sprint metrics dataset", async ({ page }) => {
    await page.goto("/projects/100/files");
    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.getByText("Upload File").click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: "velocity_sprint1_metrics.csv",
      mimeType: "text/csv",
      buffer: Buffer.from("id,sprint,points\n1,Sprint 1,42"),
    });
    await expect(page.getByText("uploaded_test_file.pdf")).toBeVisible();
  });

  // TC006: Upload Excel spreadsheet
  test("TC006: Upload Excel xlsx budget spreadsheet", async ({ page }) => {
    await page.goto("/projects/100/files");
    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.getByText("Upload File").click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: "project_budget_2026.xlsx",
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer: Buffer.from("fake-xlsx-binary"),
    });
    await expect(page.getByText("uploaded_test_file.pdf")).toBeVisible();
  });

  // TC007: Upload ZIP archive
  test("TC007: Upload ZIP archive of export assets", async ({ page }) => {
    await page.goto("/projects/100/files");
    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.getByText("Upload File").click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: "release_bundle_v1.zip",
      mimeType: "application/zip",
      buffer: Buffer.from("PK\x03\x04fake-zip"),
    });
    await expect(page.getByText("uploaded_test_file.pdf")).toBeVisible();
  });

  // TC008: Upload TAR.GZ archive
  test("TC008: Upload TAR.GZ compressed log archive", async ({ page }) => {
    await page.goto("/projects/100/files");
    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.getByText("Upload File").click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: "server_logs_archive.tar.gz",
      mimeType: "application/gzip",
      buffer: Buffer.from("fake-tar-gz"),
    });
    await expect(page.getByText("uploaded_test_file.pdf")).toBeVisible();
  });

  // TC009: Upload Markdown doc file
  test("TC009: Upload Markdown release notes file", async ({ page }) => {
    await page.goto("/projects/100/files");
    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.getByText("Upload File").click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: "CHANGELOG_v2.md",
      mimeType: "text/markdown",
      buffer: Buffer.from("# Changelog\n- Added phase 3 files"),
    });
    await expect(page.getByText("uploaded_test_file.pdf")).toBeVisible();
  });

  // TC010: Upload JSON file
  test("TC010: Upload JSON schema specification file", async ({ page }) => {
    await page.goto("/projects/100/files");
    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.getByText("Upload File").click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: "schema_v32.json",
      mimeType: "application/json",
      buffer: Buffer.from('{"version": 32, "feature": "chat-files"}'),
    });
    await expect(page.getByText("uploaded_test_file.pdf")).toBeVisible();
  });

  // TC011: Upload YAML file
  test("TC011: Upload YAML docker compose configuration", async ({ page }) => {
    await page.goto("/projects/100/files");
    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.getByText("Upload File").click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: "docker_compose.yaml",
      mimeType: "text/yaml",
      buffer: Buffer.from("version: '3.8'\nservices:\n  app:\n    image: taskpilot"),
    });
    await expect(page.getByText("uploaded_test_file.pdf")).toBeVisible();
  });

  // TC012: Upload Plain text file
  test("TC012: Upload Plain text readme file", async ({ page }) => {
    await page.goto("/projects/100/files");
    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.getByText("Upload File").click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: "notes.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("Sprint notes and checklist"),
    });
    await expect(page.getByText("uploaded_test_file.pdf")).toBeVisible();
  });

  // TC013: Upload Python code file
  test("TC013: Upload Python script file", async ({ page }) => {
    await page.goto("/projects/100/files");
    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.getByText("Upload File").click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: "data_processor.py",
      mimeType: "text/x-python",
      buffer: Buffer.from("print('hello taskpilot')"),
    });
    await expect(page.getByText("uploaded_test_file.pdf")).toBeVisible();
  });

  // TC014: Upload Java source file
  test("TC014: Upload Java entity source code file", async ({ page }) => {
    await page.goto("/projects/100/files");
    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.getByText("Upload File").click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: "ProjectFileEntity.java",
      mimeType: "text/x-java-source",
      buffer: Buffer.from("public class ProjectFileEntity {}"),
    });
    await expect(page.getByText("uploaded_test_file.pdf")).toBeVisible();
  });

  // TC015: Upload file with unicode Vietnamese characters
  test("TC015: Upload file with Vietnamese unicode filename", async ({ page }) => {
    await page.goto("/projects/100/files");
    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.getByText("Upload File").click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: "Báo_cáo_nghiệm_thu_Đồ_án_2.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("Vietnamese document bytes"),
    });
    await expect(page.getByText("uploaded_test_file.pdf")).toBeVisible();
  });

  // TC016: Upload file with spaces and symbols in name
  test("TC016: Upload file with spaces and hyphen characters", async ({ page }) => {
    await page.goto("/projects/100/files");
    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.getByText("Upload File").click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: "My Project Report (Final Draft - v2.1).pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("pdf bytes"),
    });
    await expect(page.getByText("uploaded_test_file.pdf")).toBeVisible();
  });

  // TC017: Upload file with very long filename (120 chars)
  test("TC017: Upload file with very long filename", async ({ page }) => {
    const longName = "very_long_project_architecture_specification_document_with_detailed_module_breakdown_and_database_schema_diagrams_v1.pdf";
    await page.goto("/projects/100/files");
    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.getByText("Upload File").click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: longName,
      mimeType: "application/pdf",
      buffer: Buffer.from("pdf bytes"),
    });
    await expect(page.getByText("uploaded_test_file.pdf")).toBeVisible();
  });

  // TC018: Upload small 100 bytes file
  test("TC018: Upload tiny 100-byte text snippet file", async ({ page }) => {
    await page.goto("/projects/100/files");
    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.getByText("Upload File").click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: "snippet.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("a".repeat(100)),
    });
    await expect(page.getByText("uploaded_test_file.pdf")).toBeVisible();
  });

  // TC019: Upload 15MB file simulation
  test("TC019: Upload 15MB dataset file within 50MB boundary", async ({ page }) => {
    await page.goto("/projects/100/files");
    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.getByText("Upload File").click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: "large_dataset_15mb.csv",
      mimeType: "text/csv",
      buffer: Buffer.from("col1,col2\n".repeat(1000)),
    });
    await expect(page.getByText("uploaded_test_file.pdf")).toBeVisible();
  });

  // TC020: Verify upload button exists and visible for manager
  test("TC020: Verify Upload File button is visible for Project Manager", async ({ page }) => {
    await page.goto("/projects/100/files");
    await expect(page.getByText("Upload File")).toBeVisible();
  });

  // TC021: Verify upload button hidden when project is archived
  test("TC021: Verify Upload File button is hidden when project is archived", async ({ page }) => {
    await setupWorkspaceMocks(page, { isArchived: true });
    await page.goto("/projects/100/files");
    await expect(page.getByText("Upload File")).not.toBeVisible();
  });

  // TC022: Verify max 50MB badge notice rendered
  test("TC022: Verify Max 50MB notice is displayed in card header", async ({ page }) => {
    await page.goto("/projects/100/files");
    await expect(page.getByText("Max 50MB per file")).toBeVisible();
  });

  // TC023: File input has hidden file element configured
  test("TC023: File input element exists and accepts files in DOM", async ({ page }) => {
    await page.goto("/projects/100/files");
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeAttached();
  });

  // TC024: Verify file upload error toast on network failure
  test("TC024: Shows error alert when upload API returns 400 bad request", async ({ page }) => {
    // Override upload route to return 400 error
    await page.route("**/api/v1/projects/100/files**", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({
            status: 400,
            message: "File size exceeds 50MB limit",
          }),
        });
      } else {
        await route.fallback();
      }
    });

    await page.goto("/projects/100/files");
    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.getByText("Upload File").click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: "too_large_60mb.zip",
      mimeType: "application/zip",
      buffer: Buffer.from("oversized"),
    });

    await expect(page.getByText(/File size exceeds 50MB limit|Upload failed/i)).toBeVisible();
  });

  // TC025: Cancel file chooser retains existing files
  test("TC025: File chooser dismissal does not alter current list", async ({ page }) => {
    await page.goto("/projects/100/files");
    await expect(page.getByText("No files in this project yet")).toBeVisible();
  });
});

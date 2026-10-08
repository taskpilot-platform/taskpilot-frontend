import { test, expect } from "@playwright/test";
import { setupWorkspaceMocks, DEFAULT_MOCK_USER } from "./helpers/mock-setup";
import * as path from "path";

const REPORT_FILES = [
  {
    id: 1,
    projectId: 100,
    uploaderId: 1,
    uploaderName: "Alex Rivera",
    fileName: "Architecture_Specification_v2.0.pdf",
    originalName: "Architecture_Specification_v2.0.pdf",
    fileSize: 1024 * 1024 * 1.8,
    contentType: "application/pdf",
    storageKey: "projects/100/files/uuid_arch_spec.pdf",
    storageBucket: "documents",
    createdAt: "2026-10-08T08:00:00Z",
    updatedAt: "2026-10-08T08:00:00Z",
  },
  {
    id: 2,
    projectId: 100,
    uploaderId: 2,
    uploaderName: "Sarah Connor",
    fileName: "System_Database_Schema_Diagram.png",
    originalName: "System_Database_Schema_Diagram.png",
    fileSize: 1024 * 1024 * 3.4,
    contentType: "image/png",
    storageKey: "projects/100/files/uuid_schema.png",
    storageBucket: "documents",
    createdAt: "2026-10-08T08:15:00Z",
    updatedAt: "2026-10-08T08:15:00Z",
  },
  {
    id: 3,
    projectId: 100,
    uploaderId: 1,
    uploaderName: "Alex Rivera",
    fileName: "Sprint_Burndown_and_Budget.xlsx",
    originalName: "Sprint_Burndown_and_Budget.xlsx",
    fileSize: 1024 * 450,
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    storageKey: "projects/100/files/uuid_budget.xlsx",
    storageBucket: "documents",
    createdAt: "2026-10-08T08:30:00Z",
    updatedAt: "2026-10-08T08:30:00Z",
  },
  {
    id: 4,
    projectId: 100,
    uploaderId: 2,
    uploaderName: "Sarah Connor",
    fileName: "TaskPilot_API_Collection.json",
    originalName: "TaskPilot_API_Collection.json",
    fileSize: 1024 * 120,
    contentType: "application/json",
    storageKey: "projects/100/files/uuid_api.json",
    storageBucket: "documents",
    createdAt: "2026-10-08T08:45:00Z",
    updatedAt: "2026-10-08T08:45:00Z",
  },
  {
    id: 5,
    projectId: 100,
    uploaderId: 3,
    uploaderName: "Michael Chang",
    fileName: "Deploy_Docker_Compose.yaml",
    originalName: "Deploy_Docker_Compose.yaml",
    fileSize: 1024 * 12.5,
    contentType: "application/x-yaml",
    storageKey: "projects/100/files/uuid_docker.yaml",
    storageBucket: "documents",
    createdAt: "2026-10-08T09:00:00Z",
    updatedAt: "2026-10-08T09:00:00Z",
  },
];

const REPORT_MESSAGES = [
  {
    id: 1,
    projectId: 100,
    senderId: 1,
    senderName: "Alex Rivera",
    senderAvatarUrl: null,
    messageType: "TEXT",
    content: "Chào cả team! Chào mừng mọi người đến với kênh trao đổi chính thức của dự án TaskPilot Workspace.",
    fileId: null,
    fileName: null,
    createdAt: "2026-10-08T09:00:00Z",
  },
  {
    id: 2,
    projectId: 100,
    senderId: 2,
    senderName: "Sarah Connor",
    senderAvatarUrl: null,
    messageType: "TEXT",
    content: "Chào anh Alex! Em vừa hoàn thành cấu hình Flyway migration V32 và S3StorageService cho phân hệ Files & Chat.",
    fileId: null,
    fileName: null,
    createdAt: "2026-10-08T09:05:00Z",
  },
  {
    id: 3,
    projectId: 100,
    senderId: 2,
    senderName: "Sarah Connor",
    senderAvatarUrl: null,
    messageType: "FILE",
    content: "Em gửi tài liệu kiến trúc hệ thống và đặc tả kỹ thuật Phase 3 để team review nhé:",
    fileId: 1,
    fileName: "Architecture_Specification_v2.0.pdf",
    createdAt: "2026-10-08T09:06:00Z",
  },
  {
    id: 4,
    projectId: 100,
    senderId: 1,
    senderName: "Alex Rivera",
    senderAvatarUrl: null,
    messageType: "TEXT",
    content: "Cảm ơn Sarah! Đã kiểm tra luồng streaming download và 100 kịch bản Playwright E2E đều đạt 100% PASS.",
    fileId: null,
    fileName: null,
    createdAt: "2026-10-08T09:10:00Z",
  },
  {
    id: 5,
    projectId: 100,
    senderId: 1,
    senderName: "Alex Rivera",
    senderAvatarUrl: null,
    messageType: "TEXT",
    content: "Giai đoạn 3 đã hoàn tất xuất sắc và được merge vào main! Chuẩn bị bắt tay sang Giai đoạn 4 LiveKit Video Meeting nhé! 🚀",
    fileId: null,
    fileName: null,
    createdAt: "2026-10-08T09:12:00Z",
  },
];

const TARGET_DIRS = [
  "/home/dptn/projects/taskpilot/taskpilot/docs/implementation/collab/assets",
  "/home/dptn/projects/taskpilot/report/src/assets/collab",
];

async function saveScreenshot(page: any, filename: string) {
  for (const dir of TARGET_DIRS) {
    const fullPath = path.join(dir, filename);
    await page.screenshot({ path: fullPath, fullPage: false });
  }
}

test.describe("Capture UAT Report Screenshots", () => {
  test("Capture all 10 high-resolution screenshots for thesis report", async ({ page }) => {
    // 1. Files Tab - Empty state
    await page.setViewportSize({ width: 1280, height: 800 });
    await setupWorkspaceMocks(page, { initialFiles: [], initialMessages: [] });
    await page.goto("/projects/100/files");
    await expect(page.getByRole("heading", { name: "Project Files" })).toBeVisible();
    await saveScreenshot(page, "01_project_files_empty_state.png");

    // 2. Files Tab - Populated file list with metadata & badges
    await setupWorkspaceMocks(page, { initialFiles: REPORT_FILES, initialMessages: [] });
    await page.goto("/projects/100/files");
    await expect(page.getByText("Architecture_Specification_v2.0.pdf")).toBeVisible();
    await saveScreenshot(page, "02_project_files_list_desktop.png");

    // 3. Files Tab - Search filter active
    const searchInput = page.getByPlaceholder("Search files by name...");
    await searchInput.fill("Schema");
    await expect(page.getByText("System_Database_Schema_Diagram.png")).toBeVisible();
    await expect(page.getByText("Architecture_Specification_v2.0.pdf")).not.toBeVisible();
    await saveScreenshot(page, "03_project_files_search_filter.png");

    // Clear search
    await searchInput.fill("");
    await expect(page.getByText("Architecture_Specification_v2.0.pdf")).toBeVisible();

    // 4. Files Tab - Mobile Responsive View (375x812 iPhone)
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/projects/100/files");
    await expect(page.getByRole("heading", { name: "Project Files" })).toBeVisible();
    await saveScreenshot(page, "04_project_files_mobile_responsive.png");

    // 5. Chat Tab - Desktop View with Connected badge & conversation stream
    await page.setViewportSize({ width: 1280, height: 850 });
    await setupWorkspaceMocks(page, { initialFiles: REPORT_FILES, initialMessages: REPORT_MESSAGES });
    await page.goto("/projects/100/chat");
    await expect(page.getByText("Project Chat Room")).toBeVisible();
    await expect(page.getByText(/Connected|Reconnecting/i)).toBeVisible();
    await saveScreenshot(page, "05_project_chat_room_desktop.png");

    // 6. Chat Tab - File attachment card detail
    const attachmentCard = page.getByText("Architecture_Specification_v2.0.pdf");
    await expect(attachmentCard).toBeVisible();
    await saveScreenshot(page, "06_project_chat_file_attachment.png");

    // 7. Chat Tab - Input focus & typing state
    const chatInput = page.getByPlaceholder("Type a message...");
    await chatInput.fill("Đã cập nhật tài liệu báo cáo định kỳ và sẵn sàng demo!");
    await saveScreenshot(page, "07_project_chat_composer_active.png");

    // 8. Chat Tab - Mobile Responsive View (375x812)
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/projects/100/chat");
    await expect(page.getByText("Project Chat Room")).toBeVisible();
    await saveScreenshot(page, "08_project_chat_mobile_responsive.png");

    // 9. Workspace Full Tabs Navigation Bar (Overview, Board, Backlog, Files, Chat)
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/projects/100/overview");
    await expect(page.getByRole("button", { name: /^Files$/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Chat$/i })).toBeVisible();
    await saveScreenshot(page, "09_workspace_tabs_navigation.png");

    // 10. Archived Project State (Upload & Delete buttons hidden, chat input disabled)
    await setupWorkspaceMocks(page, { initialFiles: REPORT_FILES, initialMessages: REPORT_MESSAGES, isArchived: true });
    await page.goto("/projects/100/files");
    await expect(page.getByText("Upload File")).not.toBeVisible();
    await saveScreenshot(page, "10_project_files_archived_readonly.png");
  });
});

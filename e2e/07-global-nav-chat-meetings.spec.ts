import { test, expect } from "@playwright/test";
import { setupWorkspaceMocks, DEFAULT_MOCK_USER } from "./helpers/mock-setup";

const SAMPLE_PROJECTS = [
  {
    id: 100,
    name: "TaskPilot Collaboration Workspace",
    description: "Core workspace",
    status: "ACTIVE",
    myRole: "MANAGER",
    startDate: "2026-09-01T00:00:00Z",
    endDate: "2026-12-31T00:00:00Z",
    joinedAt: "2026-09-01T00:00:00Z",
  },
  {
    id: 200,
    name: "Mobile App Initiative",
    description: "Next-gen mobile experience",
    status: "ACTIVE",
    myRole: "MEMBER",
    startDate: "2026-10-01T00:00:00Z",
    endDate: "2026-12-31T00:00:00Z",
    joinedAt: "2026-10-01T00:00:00Z",
  },
];

const SAMPLE_CHAT_MESSAGES = [
  {
    id: 1,
    projectId: 100,
    senderId: 1,
    senderName: "Alex Rivera",
    senderAvatarUrl: null,
    messageType: "TEXT",
    content: "Chào mọi người trong kênh chat dự án!",
    createdAt: "2026-10-08T08:00:00Z",
  },
];

const SAMPLE_MEETINGS = [
  {
    id: 501,
    projectId: 100,
    title: "Daily Standup & Tech Sync",
    description: "Sync on collaboration features and LiveKit room",
    status: "ACTIVE",
    recordingEnabled: true,
    hostId: 1,
    hostName: "Alex Rivera",
    roomName: "meeting-project-100-501",
    startedAt: "2026-10-08T09:00:00Z",
    endedAt: null,
    durationSeconds: 120,
    participantCount: 2,
    participants: [
      {
        userId: 1,
        fullName: "Alex Rivera",
        role: "HOST",
        joinedAt: "2026-10-08T09:00:00Z",
      },
    ],
  },
];

test.describe("Global Navigation: Chat & Video Meetings Tabs", () => {
  test.beforeEach(async ({ page }) => {
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
    await setupWorkspaceMocks(page, {
      initialMessages: SAMPLE_CHAT_MESSAGES,
      initialMeetings: SAMPLE_MEETINGS,
    });

    // Provide mock for projects/my with 2 projects
    await page.route("**/api/v1/projects/my**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: 200,
          message: "Success",
          data: {
            content: SAMPLE_PROJECTS,
            totalElements: SAMPLE_PROJECTS.length,
            totalPages: 1,
            size: 50,
            number: 0,
          },
        }),
      });
    });

    // Mock project 200
    await page.route("**/api/v1/projects/200", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: 200,
          message: "Success",
          data: SAMPLE_PROJECTS[1],
        }),
      });
    });
  });

  // --- 1. Global Navigation Bar ---
  test("TC-GNAV-01: Global navigation bar displays Chat and Meetings tabs", async ({ page }) => {
    await page.goto("/projects");
    await page.waitForLoadState("domcontentloaded");

    const chatNav = page.locator('[data-testid="nav-chat"]');
    const meetingsNav = page.locator('[data-testid="nav-meetings"]');

    await expect(chatNav).toBeVisible({ timeout: 10000 });
    await expect(meetingsNav).toBeVisible({ timeout: 10000 });
  });

  test("TC-GNAV-02: Clicking Chat navigation item navigates to /chat", async ({ page }) => {
    await page.goto("/projects");
    await page.waitForLoadState("domcontentloaded");

    const chatNav = page.locator('[data-testid="nav-chat"]');
    await chatNav.click();

    await page.waitForURL(/\/chat/);
    await expect(page.locator('[data-testid="global-chat-page"]')).toBeVisible({ timeout: 10000 });
  });

  test("TC-GNAV-03: Clicking Meetings navigation item navigates to /meetings", async ({ page }) => {
    await page.goto("/projects");
    await page.waitForLoadState("domcontentloaded");

    const meetingsNav = page.locator('[data-testid="nav-meetings"]');
    await meetingsNav.click();

    await page.waitForURL(/\/meetings/);
    await expect(page.locator('[data-testid="global-meetings-page"]')).toBeVisible({ timeout: 10000 });
  });

  // --- 2. Global Chat Page ---
  test("TC-GCHAT-01: Global Chat displays project channel list and embeds active chat room", async ({ page }) => {
    await page.goto("/chat?project=100");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator('[data-testid="global-chat-page"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="global-chat-sidebar"]')).toBeVisible();

    // Verify project channels are rendered
    await expect(page.locator('[data-testid="channel-item-100"]')).toBeVisible();
    await expect(page.locator('[data-testid="channel-item-200"]')).toBeVisible();

    // Verify Project Chat Tab is rendered for selected project
    await expect(page.locator('[data-testid="project-chat-tab"]')).toBeVisible();
    await expect(page.getByText("Chào mọi người trong kênh chat dự án!")).toBeVisible();
  });

  test("TC-GCHAT-02: Switching channels updates selected project and URL", async ({ page }) => {
    await page.goto("/chat?project=100");
    await page.waitForLoadState("domcontentloaded");

    await page.locator('[data-testid="channel-item-200"]').click();
    await expect(page).toHaveURL(/project=200/);
    await expect(page.locator('[data-testid="active-channel-name"]')).toContainText("Mobile App Initiative");
  });

  test("TC-GCHAT-03: Search input filters project channel list", async ({ page }) => {
    await page.goto("/chat?project=100");
    await page.waitForLoadState("domcontentloaded");

    const searchInput = page.locator('[data-testid="project-search-input"]');
    await searchInput.fill("Mobile");

    await expect(page.locator('[data-testid="channel-item-200"]')).toBeVisible();
    await expect(page.locator('[data-testid="channel-item-100"]')).not.toBeVisible();
  });

  // --- 3. Global Meetings Page ---
  test("TC-GMEET-01: Global Meetings page displays header and active meeting banner", async ({ page }) => {
    await page.goto("/meetings?project=100");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator('[data-testid="global-meetings-page"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="global-meetings-project-select"]')).toBeVisible();

    // Active meeting banner from project 100
    await expect(page.locator('[data-testid="active-meeting-banner"]')).toBeVisible();
    await expect(page.locator('[data-testid="active-banner-title"]')).toContainText("Daily Standup & Tech Sync");
    await expect(page.locator('[data-testid="join-active-meeting-btn"]')).toBeVisible();
  });

  test("TC-GMEET-02: Global Meetings page supports creating a new meeting", async ({ page }) => {
    await page.goto("/meetings?project=100");
    await page.waitForLoadState("domcontentloaded");

    const createBtn = page.locator('[data-testid="create-meeting-btn"]');
    await expect(createBtn).toBeVisible();
    await createBtn.click();

    await expect(page.locator('[data-testid="create-meeting-dialog"]')).toBeVisible();
    await expect(page.locator('[data-testid="meeting-title-input"]')).toBeVisible();
  });

  test("TC-GMEET-03: Joining active meeting enters LiveMeetingRoom with clean styling and video controls", async ({ page }) => {
    await page.goto("/meetings?project=100");
    await page.waitForLoadState("domcontentloaded");

    await page.locator('[data-testid="join-active-meeting-btn"]').click();

    // Verify LiveMeetingRoom rendered
    const liveRoom = page.locator('[data-testid="live-meeting-room"]');
    await expect(liveRoom).toBeVisible({ timeout: 10000 });

    // Verify media controls bar is rendered
    await expect(page.locator('[data-testid="toggle-cam-btn"]')).toBeVisible();
    await expect(page.locator('[data-testid="toggle-mic-btn"]')).toBeVisible();
    await expect(page.locator('[data-testid="leave-meeting-btn"]')).toBeVisible();

    // Verify room has clean styling and NOT pitch-black slate-950
    const classAttr = await liveRoom.getAttribute("class");
    expect(classAttr).not.toContain("bg-slate-950");

    // Click leave room returns to meetings tab
    await page.locator('[data-testid="leave-meeting-btn"]').click();
    await expect(page.locator('[data-testid="project-meetings-tab"]')).toBeVisible({ timeout: 10000 });
  });

  // --- 4. Regression: Workspace Tabs Still Function ---
  test("TC-REG-01: Direct navigation to /projects/100/chat and /projects/100/meetings still functions", async ({ page }) => {
    await page.goto("/projects/100/chat");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator('[data-testid="project-chat-tab"]')).toBeVisible({ timeout: 10000 });

    await page.goto("/projects/100/meetings");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator('[data-testid="project-meetings-tab"]')).toBeVisible({ timeout: 10000 });
  });
});

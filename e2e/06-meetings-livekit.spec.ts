import { test, expect } from "@playwright/test";
import { setupWorkspaceMocks, DEFAULT_MOCK_USER } from "./helpers/mock-setup";

test.describe("Phase 4: LiveKit Video Meeting & Collaboration (TC101 - TC130)", () => {
  test.beforeEach(async ({ page }) => {
    // Grant clipboard permissions
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  });

  // --- AC-04: Workspace Navigation & Tab ---
  test("TC101: Display Meetings tab in Project Workspace navigation", async ({ page }) => {
    await setupWorkspaceMocks(page);
    await page.goto("/projects/100/overview");
    await page.waitForLoadState("domcontentloaded");

    const meetingsTabBtn = page.locator('[data-testid="tab-meetings"]');
    await expect(meetingsTabBtn).toBeVisible({ timeout: 10000 });
    await expect(meetingsTabBtn).toContainText("Meetings");
  });

  test("TC102: Switch to Meetings tab and display empty state when no meetings exist", async ({ page }) => {
    await setupWorkspaceMocks(page, { initialMeetings: [] });
    await page.goto("/projects/100/overview");
    await page.waitForLoadState("domcontentloaded");

    await page.locator('[data-testid="tab-meetings"]').click();
    await expect(page.locator('[data-testid="project-meetings-tab"]')).toBeVisible();
    await expect(page.locator('[data-testid="empty-meetings-view"]')).toBeVisible();
    await expect(page.locator('[data-testid="empty-start-meeting-btn"]')).toBeVisible();
  });

  // --- AC-01: Create Meeting Dialog & Validation ---
  test("TC103: Open create meeting dialog modal", async ({ page }) => {
    await setupWorkspaceMocks(page, { initialMeetings: [] });
    await page.goto("/projects/100/meetings");
    await page.waitForLoadState("domcontentloaded");

    await page.locator('[data-testid="create-meeting-btn"]').click();
    await expect(page.locator('[data-testid="create-meeting-dialog"]')).toBeVisible();
    await expect(page.locator('[data-testid="meeting-title-input"]')).toBeVisible();
  });

  test("TC104: Form validation requires title to submit", async ({ page }) => {
    await setupWorkspaceMocks(page, { initialMeetings: [] });
    await page.goto("/projects/100/meetings");
    await page.waitForLoadState("domcontentloaded");

    await page.locator('[data-testid="create-meeting-btn"]').click();
    const submitBtn = page.locator('[data-testid="submit-create-meeting-btn"]');
    await expect(submitBtn).toBeDisabled();

    await page.locator('[data-testid="meeting-title-input"]').fill("Sprint Kickoff");
    await expect(submitBtn).toBeEnabled();
  });

  test("TC105: Toggle recording checkbox in create meeting dialog", async ({ page }) => {
    await setupWorkspaceMocks(page, { initialMeetings: [] });
    await page.goto("/projects/100/meetings");
    await page.waitForLoadState("domcontentloaded");

    await page.locator('[data-testid="create-meeting-btn"]').click();
    const recCheckbox = page.locator('[data-testid="meeting-rec-checkbox"]');
    await expect(recCheckbox).not.toBeChecked();

    await recCheckbox.click();
    await expect(recCheckbox).toBeChecked();
  });

  // --- AC-05: Create & Auto-Join Live Meeting Room ---
  test("TC106: Successfully create meeting and auto-join live room", async ({ page }) => {
    await setupWorkspaceMocks(page, { initialMeetings: [] });
    await page.goto("/projects/100/meetings");
    await page.waitForLoadState("domcontentloaded");

    await page.locator('[data-testid="create-meeting-btn"]').click();
    await page.locator('[data-testid="meeting-title-input"]').fill("Phase 4 Architecture Review");
    await page.locator('[data-testid="meeting-desc-input"]').fill("LiveKit video meeting discussion");
    await page.locator('[data-testid="meeting-rec-checkbox"]').click();
    await page.locator('[data-testid="submit-create-meeting-btn"]').click();

    // Auto joins live meeting room
    await expect(page.locator('[data-testid="live-meeting-room"]')).toBeVisible({ timeout: 10000 });
  });

  test("TC107: Display live meeting room header with title and duration timer", async ({ page }) => {
    const mockMeeting = {
      id: 1,
      projectId: 100,
      title: "Design Sync",
      status: "ACTIVE",
      roomName: "room-1",
      startedAt: new Date().toISOString(),
      hostName: DEFAULT_MOCK_USER.fullName,
      hostId: DEFAULT_MOCK_USER.id,
      recordingEnabled: true,
      activeParticipantsCount: 1,
      totalParticipantsCount: 1,
      isHost: true,
    };

    await setupWorkspaceMocks(page, { initialMeetings: [mockMeeting] });
    await page.goto("/projects/100/meetings");
    await page.waitForLoadState("domcontentloaded");

    await page.locator('[data-testid="join-meeting-btn-1"]').click();
    await expect(page.locator('[data-testid="live-meeting-room"]')).toBeVisible();

    await expect(page.locator('[data-testid="meeting-title"]')).toContainText("Design Sync");
    await expect(page.locator('[data-testid="meeting-timer"]')).toBeVisible();
    await expect(page.locator("text=REC")).toBeVisible();
  });

  // --- AC-05: Video Grid & Participant Tiles ---
  test("TC108: Display adaptive video grid with local participant tile", async ({ page }) => {
    const mockMeeting = {
      id: 1,
      projectId: 100,
      title: "Daily Standup",
      status: "ACTIVE",
      roomName: "room-1",
      startedAt: new Date().toISOString(),
      hostName: DEFAULT_MOCK_USER.fullName,
      hostId: DEFAULT_MOCK_USER.id,
      recordingEnabled: false,
      activeParticipantsCount: 1,
      totalParticipantsCount: 1,
      isHost: true,
    };

    await setupWorkspaceMocks(page, { initialMeetings: [mockMeeting] });
    await page.goto("/projects/100/meetings");
    await page.waitForLoadState("domcontentloaded");

    await page.locator('[data-testid="join-meeting-btn-1"]').click();
    await expect(page.locator('[data-testid="video-grid"]')).toBeVisible();
    await expect(page.locator('[data-testid="participant-tile-user_1"]')).toBeVisible();
  });

  test("TC109: Show participant name and active status on local tile", async ({ page }) => {
    const mockMeeting = {
      id: 1,
      projectId: 100,
      title: "Daily Standup",
      status: "ACTIVE",
      roomName: "room-1",
      startedAt: new Date().toISOString(),
      hostName: DEFAULT_MOCK_USER.fullName,
      hostId: DEFAULT_MOCK_USER.id,
      recordingEnabled: false,
      activeParticipantsCount: 1,
      totalParticipantsCount: 1,
      isHost: true,
    };

    await setupWorkspaceMocks(page, { initialMeetings: [mockMeeting] });
    await page.goto("/projects/100/meetings");
    await page.waitForLoadState("domcontentloaded");

    await page.locator('[data-testid="join-meeting-btn-1"]').click();
    const tile = page.locator('[data-testid="participant-tile-user_1"]');
    await expect(tile).toContainText(DEFAULT_MOCK_USER.fullName);
  });

  // --- AC-05: Controls (Mic, Cam, Screen Share) ---
  test("TC110: Toggle microphone control updates state", async ({ page }) => {
    const mockMeeting = {
      id: 1,
      projectId: 100,
      title: "Voice Test",
      status: "ACTIVE",
      roomName: "room-1",
      startedAt: new Date().toISOString(),
      hostName: DEFAULT_MOCK_USER.fullName,
      hostId: DEFAULT_MOCK_USER.id,
      recordingEnabled: false,
      activeParticipantsCount: 1,
      totalParticipantsCount: 1,
      isHost: true,
    };

    await setupWorkspaceMocks(page, { initialMeetings: [mockMeeting] });
    await page.goto("/projects/100/meetings");
    await page.waitForLoadState("domcontentloaded");

    await page.locator('[data-testid="join-meeting-btn-1"]').click();
    const micBtn = page.locator('[data-testid="toggle-mic-btn"]');
    await expect(micBtn).toBeVisible();

    // Toggle mute
    await micBtn.click();
    await expect(micBtn).toContainText("Bật mic");

    // Toggle unmute
    await micBtn.click();
    await expect(micBtn).toContainText("Tắt mic");
  });

  test("TC111: Toggle camera control updates state and avatar fallback", async ({ page }) => {
    const mockMeeting = {
      id: 1,
      projectId: 100,
      title: "Cam Test",
      status: "ACTIVE",
      roomName: "room-1",
      startedAt: new Date().toISOString(),
      hostName: DEFAULT_MOCK_USER.fullName,
      hostId: DEFAULT_MOCK_USER.id,
      recordingEnabled: false,
      activeParticipantsCount: 1,
      totalParticipantsCount: 1,
      isHost: true,
    };

    await setupWorkspaceMocks(page, { initialMeetings: [mockMeeting] });
    await page.goto("/projects/100/meetings");
    await page.waitForLoadState("domcontentloaded");

    await page.locator('[data-testid="join-meeting-btn-1"]').click();
    const camBtn = page.locator('[data-testid="toggle-cam-btn"]');
    await expect(camBtn).toBeVisible();

    // Toggle camera off
    await camBtn.click();
    await expect(camBtn).toContainText("Bật camera");
    await expect(page.locator("text=Camera đã tắt")).toBeVisible();

    // Toggle camera back on
    await camBtn.click();
    await expect(camBtn).toContainText("Tắt camera");
  });

  test("TC112: Toggle screen sharing button with visual feedback", async ({ page }) => {
    const mockMeeting = {
      id: 1,
      projectId: 100,
      title: "Screen Share Test",
      status: "ACTIVE",
      roomName: "room-1",
      startedAt: new Date().toISOString(),
      hostName: DEFAULT_MOCK_USER.fullName,
      hostId: DEFAULT_MOCK_USER.id,
      recordingEnabled: false,
      activeParticipantsCount: 1,
      totalParticipantsCount: 1,
      isHost: true,
    };

    await setupWorkspaceMocks(page, { initialMeetings: [mockMeeting] });
    await page.goto("/projects/100/meetings");
    await page.waitForLoadState("domcontentloaded");

    await page.locator('[data-testid="join-meeting-btn-1"]').click();
    const shareBtn = page.locator('[data-testid="toggle-screen-share-btn"]');
    await expect(shareBtn).toBeVisible();
    await shareBtn.click();
  });

  // --- AC-05 & AC-07: Side Drawers (Participants & In-Meeting Chat) ---
  test("TC113: Open and close participants drawer", async ({ page }) => {
    const mockMeeting = {
      id: 1,
      projectId: 100,
      title: "Drawer Test",
      status: "ACTIVE",
      roomName: "room-1",
      startedAt: new Date().toISOString(),
      hostName: DEFAULT_MOCK_USER.fullName,
      hostId: DEFAULT_MOCK_USER.id,
      recordingEnabled: false,
      activeParticipantsCount: 1,
      totalParticipantsCount: 1,
      isHost: true,
    };

    await setupWorkspaceMocks(page, { initialMeetings: [mockMeeting] });
    await page.goto("/projects/100/meetings");
    await page.waitForLoadState("domcontentloaded");

    await page.locator('[data-testid="join-meeting-btn-1"]').click();
    const drawerBtn = page.locator('[data-testid="toggle-participants-drawer-btn"]');

    // Open drawer
    await drawerBtn.click();
    await expect(page.locator('[data-testid="participants-drawer"]')).toBeVisible();

    // Close drawer
    await drawerBtn.click();
    await expect(page.locator('[data-testid="participants-drawer"]')).not.toBeVisible();
  });

  test("TC114: Participants drawer displays current member with Host badge", async ({ page }) => {
    const mockMeeting = {
      id: 1,
      projectId: 100,
      title: "Host Badge Test",
      status: "ACTIVE",
      roomName: "room-1",
      startedAt: new Date().toISOString(),
      hostName: DEFAULT_MOCK_USER.fullName,
      hostId: DEFAULT_MOCK_USER.id,
      recordingEnabled: false,
      activeParticipantsCount: 1,
      totalParticipantsCount: 1,
      isHost: true,
    };

    await setupWorkspaceMocks(page, { initialMeetings: [mockMeeting] });
    await page.goto("/projects/100/meetings");
    await page.waitForLoadState("domcontentloaded");

    await page.locator('[data-testid="join-meeting-btn-1"]').click();
    await page.locator('[data-testid="toggle-participants-drawer-btn"]').click();

    const drawer = page.locator('[data-testid="participants-drawer"]');
    await expect(drawer).toContainText(DEFAULT_MOCK_USER.fullName);
    await expect(drawer.locator("text=Host")).toBeVisible();
  });

  test("TC115: Open and close in-meeting chat drawer", async ({ page }) => {
    const mockMeeting = {
      id: 1,
      projectId: 100,
      title: "Chat Test",
      status: "ACTIVE",
      roomName: "room-1",
      startedAt: new Date().toISOString(),
      hostName: DEFAULT_MOCK_USER.fullName,
      hostId: DEFAULT_MOCK_USER.id,
      recordingEnabled: false,
      activeParticipantsCount: 1,
      totalParticipantsCount: 1,
      isHost: true,
    };

    await setupWorkspaceMocks(page, { initialMeetings: [mockMeeting] });
    await page.goto("/projects/100/meetings");
    await page.waitForLoadState("domcontentloaded");

    await page.locator('[data-testid="join-meeting-btn-1"]').click();
    const chatBtn = page.locator('[data-testid="toggle-in-meeting-chat-btn"]');

    await chatBtn.click();
    await expect(page.locator('[data-testid="in-meeting-chat-drawer"]')).toBeVisible();

    await chatBtn.click();
    await expect(page.locator('[data-testid="in-meeting-chat-drawer"]')).not.toBeVisible();
  });

  test("TC116: Send in-meeting chat message and verify it appears in chat stream", async ({ page }) => {
    const mockMeeting = {
      id: 1,
      projectId: 100,
      title: "Live Chat",
      status: "ACTIVE",
      roomName: "room-1",
      startedAt: new Date().toISOString(),
      hostName: DEFAULT_MOCK_USER.fullName,
      hostId: DEFAULT_MOCK_USER.id,
      recordingEnabled: false,
      activeParticipantsCount: 1,
      totalParticipantsCount: 1,
      isHost: true,
    };

    await setupWorkspaceMocks(page, { initialMeetings: [mockMeeting] });
    await page.goto("/projects/100/meetings");
    await page.waitForLoadState("domcontentloaded");

    await page.locator('[data-testid="join-meeting-btn-1"]').click();
    await page.locator('[data-testid="toggle-in-meeting-chat-btn"]').click();

    const input = page.locator('[data-testid="in-meeting-chat-input"]');
    await input.fill("Hello everyone, let's start the sprint review!");
    await page.locator('[data-testid="in-meeting-chat-send-btn"]').click();

    await expect(page.locator("text=Hello everyone, let's start the sprint review!")).toBeVisible();
  });

  // --- AC-05: Invite Link & Leaving ---
  test("TC117: Copy meeting invite link to clipboard with toast confirmation", async ({ page }) => {
    const mockMeeting = {
      id: 1,
      projectId: 100,
      title: "Copy Link Test",
      status: "ACTIVE",
      roomName: "room-1",
      startedAt: new Date().toISOString(),
      hostName: DEFAULT_MOCK_USER.fullName,
      hostId: DEFAULT_MOCK_USER.id,
      recordingEnabled: false,
      activeParticipantsCount: 1,
      totalParticipantsCount: 1,
      isHost: true,
    };

    await setupWorkspaceMocks(page, { initialMeetings: [mockMeeting] });
    await page.goto("/projects/100/meetings");
    await page.waitForLoadState("domcontentloaded");

    await page.locator('[data-testid="join-meeting-btn-1"]').click();
    const copyBtn = page.locator('[data-testid="copy-meeting-link-btn"]');
    await copyBtn.click();
    await expect(page.locator("text=Đã sao chép")).toBeVisible();
  });

  test("TC118: Leave meeting via Rời phòng button and return to Meetings list", async ({ page }) => {
    const mockMeeting = {
      id: 1,
      projectId: 100,
      title: "Leave Test",
      status: "ACTIVE",
      roomName: "room-1",
      startedAt: new Date().toISOString(),
      hostName: DEFAULT_MOCK_USER.fullName,
      hostId: DEFAULT_MOCK_USER.id,
      recordingEnabled: false,
      activeParticipantsCount: 1,
      totalParticipantsCount: 1,
      isHost: true,
    };

    await setupWorkspaceMocks(page, { initialMeetings: [mockMeeting] });
    await page.goto("/projects/100/meetings");
    await page.waitForLoadState("domcontentloaded");

    await page.locator('[data-testid="join-meeting-btn-1"]').click();
    await expect(page.locator('[data-testid="live-meeting-room"]')).toBeVisible();

    await page.locator('[data-testid="leave-meeting-btn"]').click();
    await expect(page.locator('[data-testid="project-meetings-tab"]')).toBeVisible();
  });

  // --- AC-04: Active Meeting Banner & Re-joining ---
  test("TC119: Active meeting appears in list as Đang diễn ra", async ({ page }) => {
    const mockMeeting = {
      id: 1,
      projectId: 100,
      title: "Active Status Test",
      status: "ACTIVE",
      roomName: "room-1",
      startedAt: new Date().toISOString(),
      hostName: DEFAULT_MOCK_USER.fullName,
      hostId: DEFAULT_MOCK_USER.id,
      recordingEnabled: false,
      activeParticipantsCount: 2,
      totalParticipantsCount: 2,
      isHost: true,
    };

    await setupWorkspaceMocks(page, { initialMeetings: [mockMeeting] });
    await page.goto("/projects/100/meetings");
    await page.waitForLoadState("domcontentloaded");

    const card = page.locator('[data-testid="meeting-card-1"]');
    await expect(card).toBeVisible();
    await expect(card).toContainText("Đang diễn ra");
  });

  test("TC120: Display Active Meeting banner at top of Meetings tab", async ({ page }) => {
    const mockMeeting = {
      id: 1,
      projectId: 100,
      title: "Banner Sync",
      status: "ACTIVE",
      roomName: "room-1",
      startedAt: new Date().toISOString(),
      hostName: DEFAULT_MOCK_USER.fullName,
      hostId: DEFAULT_MOCK_USER.id,
      recordingEnabled: false,
      activeParticipantsCount: 1,
      totalParticipantsCount: 1,
      isHost: true,
    };

    await setupWorkspaceMocks(page, { initialMeetings: [mockMeeting] });
    await page.goto("/projects/100/meetings");
    await page.waitForLoadState("domcontentloaded");

    const banner = page.locator('[data-testid="active-meeting-banner"]');
    await expect(banner).toBeVisible();
    await expect(banner.locator('[data-testid="active-banner-title"]')).toContainText("Banner Sync");
    await expect(page.locator('[data-testid="join-active-meeting-btn"]')).toBeVisible();
  });

  test("TC121: Re-join active meeting from banner", async ({ page }) => {
    const mockMeeting = {
      id: 1,
      projectId: 100,
      title: "Rejoin Test",
      status: "ACTIVE",
      roomName: "room-1",
      startedAt: new Date().toISOString(),
      hostName: DEFAULT_MOCK_USER.fullName,
      hostId: DEFAULT_MOCK_USER.id,
      recordingEnabled: false,
      activeParticipantsCount: 1,
      totalParticipantsCount: 1,
      isHost: true,
    };

    await setupWorkspaceMocks(page, { initialMeetings: [mockMeeting] });
    await page.goto("/projects/100/meetings");
    await page.waitForLoadState("domcontentloaded");

    await page.locator('[data-testid="join-active-meeting-btn"]').click();
    await expect(page.locator('[data-testid="live-meeting-room"]')).toBeVisible();
  });

  // --- AC-08: End Meeting & History ---
  test("TC122: End meeting for all by Host", async ({ page }) => {
    const mockMeeting = {
      id: 1,
      projectId: 100,
      title: "Host End Test",
      status: "ACTIVE",
      roomName: "room-1",
      startedAt: new Date().toISOString(),
      hostName: DEFAULT_MOCK_USER.fullName,
      hostId: DEFAULT_MOCK_USER.id,
      recordingEnabled: false,
      activeParticipantsCount: 1,
      totalParticipantsCount: 1,
      isHost: true,
    };

    await setupWorkspaceMocks(page, { initialMeetings: [mockMeeting] });
    await page.goto("/projects/100/meetings");
    await page.waitForLoadState("domcontentloaded");

    await page.locator('[data-testid="join-meeting-btn-1"]').click();

    // Auto-accept window.confirm if present
    page.on("dialog", (d) => d.accept());

    await page.locator('[data-testid="end-meeting-btn"]').click();
    const confirmBtn = page.locator('[data-testid="confirm-action-btn"]');
    if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await confirmBtn.click();
    }
    await expect(page.locator('[data-testid="project-meetings-tab"]')).toBeVisible();
  });

  test("TC123: Verify meeting updates to Đã kết thúc in history", async ({ page }) => {
    const mockMeeting = {
      id: 2,
      projectId: 100,
      title: "Retro Phase 3",
      status: "ENDED",
      roomName: "room-retro",
      startedAt: new Date(Date.now() - 3600000).toISOString(),
      endedAt: new Date().toISOString(),
      durationSeconds: 3600,
      hostName: DEFAULT_MOCK_USER.fullName,
      hostId: DEFAULT_MOCK_USER.id,
      recordingEnabled: false,
      activeParticipantsCount: 0,
      totalParticipantsCount: 4,
      isHost: true,
    };

    await setupWorkspaceMocks(page, { initialMeetings: [mockMeeting] });
    await page.goto("/projects/100/meetings");
    await page.waitForLoadState("domcontentloaded");

    const card = page.locator('[data-testid="meeting-card-2"]');
    await expect(card).toBeVisible();
    await expect(card).toContainText("Đã kết thúc");
    await expect(card).toContainText("1 giờ");
  });

  test("TC124: Filter meetings by status tabs", async ({ page }) => {
    const activeMeeting = {
      id: 1,
      projectId: 100,
      title: "Active Call",
      status: "ACTIVE",
      roomName: "room-active",
      startedAt: new Date().toISOString(),
      hostName: DEFAULT_MOCK_USER.fullName,
      hostId: DEFAULT_MOCK_USER.id,
      recordingEnabled: false,
      activeParticipantsCount: 1,
      totalParticipantsCount: 1,
      isHost: true,
    };
    const endedMeeting = {
      id: 2,
      projectId: 100,
      title: "Past Call",
      status: "ENDED",
      roomName: "room-past",
      startedAt: new Date().toISOString(),
      hostName: DEFAULT_MOCK_USER.fullName,
      hostId: DEFAULT_MOCK_USER.id,
      recordingEnabled: false,
      activeParticipantsCount: 0,
      totalParticipantsCount: 2,
      isHost: true,
    };

    await setupWorkspaceMocks(page, { initialMeetings: [activeMeeting, endedMeeting] });
    await page.goto("/projects/100/meetings");
    await page.waitForLoadState("domcontentloaded");

    // All: 2 items
    await expect(page.locator('[data-testid="meeting-card-1"]')).toBeVisible();
    await expect(page.locator('[data-testid="meeting-card-2"]')).toBeVisible();

    // Filter Active only
    await page.locator("text=Đang diễn ra (1)").click();
    await expect(page.locator('[data-testid="meeting-card-1"]')).toBeVisible();
    await expect(page.locator('[data-testid="meeting-card-2"]')).not.toBeVisible();

    // Filter Ended only
    await page.locator("text=Lịch sử đã họp (1)").click();
    await expect(page.locator('[data-testid="meeting-card-1"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="meeting-card-2"]')).toBeVisible();
  });

  test("TC125: Refresh meetings list with refresh button", async ({ page }) => {
    await setupWorkspaceMocks(page, { initialMeetings: [] });
    await page.goto("/projects/100/meetings");
    await page.waitForLoadState("domcontentloaded");

    const refreshBtn = page.locator('[data-testid="refresh-meetings-btn"]');
    await expect(refreshBtn).toBeVisible();
    await refreshBtn.click();
    await expect(refreshBtn).toBeEnabled();
  });

  test("TC126: Prevent creating meeting when project is archived", async ({ page }) => {
    await setupWorkspaceMocks(page, { isArchived: true, initialMeetings: [] });
    await page.goto("/projects/100/meetings");
    await page.waitForLoadState("domcontentloaded");

    const createBtn = page.locator('[data-testid="create-meeting-btn"]');
    await expect(createBtn).toBeDisabled();
  });

  test("TC127: Display meeting duration on ended meeting card", async ({ page }) => {
    const endedMeeting = {
      id: 5,
      projectId: 100,
      title: "Sprint 4 Demo",
      status: "ENDED",
      roomName: "room-demo",
      startedAt: new Date(Date.now() - 1800000).toISOString(),
      endedAt: new Date().toISOString(),
      durationSeconds: 1800, // 30 mins
      hostName: DEFAULT_MOCK_USER.fullName,
      hostId: DEFAULT_MOCK_USER.id,
      recordingEnabled: true,
      activeParticipantsCount: 0,
      totalParticipantsCount: 5,
      isHost: true,
    };

    await setupWorkspaceMocks(page, { initialMeetings: [endedMeeting] });
    await page.goto("/projects/100/meetings");
    await page.waitForLoadState("domcontentloaded");

    const card = page.locator('[data-testid="meeting-card-5"]');
    await expect(card).toContainText("30 phút");
  });

  test("TC128: Direct URL navigation with join query param", async ({ page }) => {
    const mockMeeting = {
      id: 8,
      projectId: 100,
      title: "Direct Join Meeting",
      status: "ACTIVE",
      roomName: "room-direct",
      startedAt: new Date().toISOString(),
      hostName: DEFAULT_MOCK_USER.fullName,
      hostId: DEFAULT_MOCK_USER.id,
      recordingEnabled: false,
      activeParticipantsCount: 1,
      totalParticipantsCount: 1,
      isHost: true,
    };

    await setupWorkspaceMocks(page, { initialMeetings: [mockMeeting] });
    await page.goto("/projects/100/meetings?join=8");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator('[data-testid="live-meeting-room"]')).toBeVisible({ timeout: 10000 });
  });

  test("TC129: Mobile viewport responsive layout for video room controls", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    const mockMeeting = {
      id: 9,
      projectId: 100,
      title: "Mobile Conference",
      status: "ACTIVE",
      roomName: "room-mob",
      startedAt: new Date().toISOString(),
      hostName: DEFAULT_MOCK_USER.fullName,
      hostId: DEFAULT_MOCK_USER.id,
      recordingEnabled: false,
      activeParticipantsCount: 1,
      totalParticipantsCount: 1,
      isHost: true,
    };

    await setupWorkspaceMocks(page, { initialMeetings: [mockMeeting] });
    await page.goto("/projects/100/meetings");
    await page.waitForLoadState("domcontentloaded");

    await page.locator('[data-testid="join-meeting-btn-9"]').click();
    await expect(page.locator('[data-testid="live-meeting-room"]')).toBeVisible();

    // Verify toolbar buttons are visible and accessible on mobile
    await expect(page.locator('[data-testid="toggle-mic-btn"]')).toBeVisible();
    await expect(page.locator('[data-testid="toggle-cam-btn"]')).toBeVisible();
    await expect(page.locator('[data-testid="leave-meeting-btn"]')).toBeVisible();
  });

  test("TC130: Full end-to-end meeting lifecycle flow", async ({ page }) => {
    await setupWorkspaceMocks(page, { initialMeetings: [] });
    await page.goto("/projects/100/meetings");
    await page.waitForLoadState("domcontentloaded");

    // 1. Create meeting
    await page.locator('[data-testid="create-meeting-btn"]').click();
    await page.locator('[data-testid="meeting-title-input"]').fill("E2E Lifecycle Review");
    await page.locator('[data-testid="submit-create-meeting-btn"]').click();

    // 2. Room loaded
    await expect(page.locator('[data-testid="live-meeting-room"]')).toBeVisible();

    // 3. Toggle audio & video
    await page.locator('[data-testid="toggle-mic-btn"]').click();
    await page.locator('[data-testid="toggle-cam-btn"]').click();

    // 4. Send chat message
    await page.locator('[data-testid="toggle-in-meeting-chat-btn"]').click();
    await page.locator('[data-testid="in-meeting-chat-input"]').fill("Wrapping up discussion");
    await page.locator('[data-testid="in-meeting-chat-send-btn"]').click();
    await expect(page.locator("text=Wrapping up discussion")).toBeVisible();

    // 5. Leave room
    await page.locator('[data-testid="leave-meeting-btn"]').click();
    await expect(page.locator('[data-testid="project-meetings-tab"]')).toBeVisible();
  });
});

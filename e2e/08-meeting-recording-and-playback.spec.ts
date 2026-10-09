import { test, expect } from "@playwright/test";
import { setupWorkspaceMocks, DEFAULT_MOCK_USER } from "./helpers/mock-setup";

test.describe("Phase 5: Meeting Recording Playback & Custom Dialogs E2E (TC201 - TC210)", () => {
  test.beforeEach(async ({ page }) => {
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  });

  // --- TC201: Completed meeting displays "Xem video ghi hình" button & REC badge ---
  test("TC201: Completed meeting displays watch recording button and REC badge in History tab", async ({ page }) => {
    const mockEndedMeeting = {
      id: 234,
      projectId: 100,
      title: "Sprint 14 Sync & Demo",
      status: "COMPLETED",
      roomName: "room-234",
      startedAt: new Date(Date.now() - 1800000).toISOString(),
      endedAt: new Date().toISOString(),
      durationSeconds: 120,
      hostName: DEFAULT_MOCK_USER.fullName,
      hostId: DEFAULT_MOCK_USER.id,
      recordingEnabled: true,
      activeParticipantsCount: 0,
      totalParticipantsCount: 3,
      isHost: true,
    };

    await setupWorkspaceMocks(page, { initialMeetings: [mockEndedMeeting] });
    await page.goto("/projects/100/meetings");
    await page.waitForLoadState("domcontentloaded");

    // Switch to Ended/History tab
    const endedTab = page.locator('button:has-text("Đã kết thúc"), button:has-text("Lịch sử"), [data-testid="filter-ended"]').first();
    if (await endedTab.isVisible()) {
      await endedTab.click();
    }

    const meetingCard = page.locator('[data-testid="meeting-card-234"]');
    await expect(meetingCard).toBeVisible({ timeout: 10000 });
    await expect(meetingCard).toContainText("REC");

    const watchBtn = page.locator('[data-testid="watch-recording-btn-234"]');
    await expect(watchBtn).toBeVisible();
    await expect(watchBtn).toContainText("Xem video ghi hình");
  });

  // --- TC202: Clicking watch recording button opens modal with metadata ---
  test("TC202: Clicking watch recording button opens MeetingRecordingModal with metadata", async ({ page }) => {
    const mockEndedMeeting = {
      id: 234,
      projectId: 100,
      title: "Sprint 14 Sync & Demo",
      status: "COMPLETED",
      roomName: "room-234",
      startedAt: new Date(Date.now() - 1800000).toISOString(),
      endedAt: new Date().toISOString(),
      durationSeconds: 120,
      hostName: DEFAULT_MOCK_USER.fullName,
      hostId: DEFAULT_MOCK_USER.id,
      recordingEnabled: true,
      activeParticipantsCount: 0,
      totalParticipantsCount: 3,
      isHost: true,
    };

    await setupWorkspaceMocks(page, { initialMeetings: [mockEndedMeeting] });
    await page.goto("/projects/100/meetings");
    await page.waitForLoadState("domcontentloaded");

    const watchBtn = page.locator('[data-testid="watch-recording-btn-234"]');
    await watchBtn.click();

    // Verify modal elements
    const videoPlayer = page.locator('[data-testid="recording-video-player"]');
    await expect(videoPlayer).toBeVisible({ timeout: 10000 });

    const downloadBtn = page.locator('[data-testid="download-recording-btn"]');
    await expect(downloadBtn).toBeVisible();
    await expect(downloadBtn).toContainText("Tải video");
  });

  // --- TC203: Video player loads authentic sample recording webm ---
  test("TC203: Video player loads authentic HD recording with sample badge", async ({ page }) => {
    const mockEndedMeeting = {
      id: 234,
      projectId: 100,
      title: "Sprint 14 Sync & Demo",
      status: "COMPLETED",
      roomName: "room-234",
      startedAt: new Date(Date.now() - 1800000).toISOString(),
      endedAt: new Date().toISOString(),
      durationSeconds: 120,
      hostName: DEFAULT_MOCK_USER.fullName,
      hostId: DEFAULT_MOCK_USER.id,
      recordingEnabled: true,
      activeParticipantsCount: 0,
      totalParticipantsCount: 3,
      isHost: true,
    };

    await setupWorkspaceMocks(page, { initialMeetings: [mockEndedMeeting] });
    await page.goto("/projects/100/meetings");
    await page.waitForLoadState("domcontentloaded");

    await page.locator('[data-testid="watch-recording-btn-234"]').click();

    const video = page.locator('[data-testid="recording-video-player"]');
    await expect(video).toBeVisible();

    // Check video source contains sample recording or valid url
    const src = await video.getAttribute("src");
    expect(src).toBeTruthy();
    expect(src).toMatch(/(sample-meeting-recording\.webm|blob:)/);

    // Verify sample badge is displayed
    const sampleBadge = page.locator('[data-testid="recording-sample-badge"]');
    await expect(sampleBadge).toBeVisible();
  });

  // --- TC204: Video download triggers .webm file download ---
  test("TC204: Video download triggers webm file download", async ({ page }) => {
    const mockEndedMeeting = {
      id: 234,
      projectId: 100,
      title: "Sprint 14 Sync & Demo",
      status: "COMPLETED",
      roomName: "room-234",
      startedAt: new Date(Date.now() - 1800000).toISOString(),
      endedAt: new Date().toISOString(),
      durationSeconds: 120,
      hostName: DEFAULT_MOCK_USER.fullName,
      hostId: DEFAULT_MOCK_USER.id,
      recordingEnabled: true,
      activeParticipantsCount: 0,
      totalParticipantsCount: 3,
      isHost: true,
    };

    await setupWorkspaceMocks(page, { initialMeetings: [mockEndedMeeting] });
    await page.goto("/projects/100/meetings");
    await page.waitForLoadState("domcontentloaded");

    await page.locator('[data-testid="watch-recording-btn-234"]').click();

    const downloadBtn = page.locator('[data-testid="download-recording-btn"]');
    await expect(downloadBtn).toBeVisible();

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      downloadBtn.click(),
    ]);

    expect(download.suggestedFilename()).toBe("meeting_234_recording.webm");
  });

  // --- TC205: Zero native browser dialogs on End Meeting (Custom Confirm Dialog) ---
  test("TC205: Host ending meeting opens custom ConfirmDialog with zero native alerts", async ({ page }) => {
    const mockActiveMeeting = {
      id: 501,
      projectId: 100,
      title: "Live Standup with Recording",
      status: "ACTIVE",
      roomName: "room-501",
      startedAt: new Date().toISOString(),
      hostName: DEFAULT_MOCK_USER.fullName,
      hostId: DEFAULT_MOCK_USER.id,
      recordingEnabled: true,
      activeParticipantsCount: 1,
      totalParticipantsCount: 1,
      isHost: true,
    };

    // Track if any native browser dialog was fired
    let nativeDialogFired = false;
    page.on("dialog", () => {
      nativeDialogFired = true;
    });

    await setupWorkspaceMocks(page, { initialMeetings: [mockActiveMeeting] });
    await page.goto("/projects/100/meetings");
    await page.waitForLoadState("domcontentloaded");

    // Join active meeting room
    await page.locator('[data-testid="join-meeting-btn-501"]').click();

    // Click End Meeting button
    const endBtn = page.locator('[data-testid="end-meeting-btn"]');
    await expect(endBtn).toBeVisible({ timeout: 10000 });
    await endBtn.click();

    // Verify custom ConfirmDialog rendered
    const confirmDialog = page.locator('[data-testid="confirm-dialog"]');
    await expect(confirmDialog).toBeVisible();
    await expect(confirmDialog).toContainText("Kết thúc cuộc họp");
    await expect(confirmDialog).toContainText("Bạn có chắc chắn muốn kết thúc cuộc họp này cho tất cả thành viên?");

    // Verify NO native dialog fired
    expect(nativeDialogFired).toBe(false);

    // Cancel first
    const cancelBtn = page.locator('[data-testid="confirm-cancel-btn"]');
    await cancelBtn.click();
    await expect(confirmDialog).toBeHidden();

    // Open again and confirm
    await endBtn.click();
    await expect(confirmDialog).toBeVisible();
    const actionBtn = page.locator('[data-testid="confirm-action-btn"]');
    await actionBtn.click();

    // Verify redirect back to meetings list
    await expect(page.locator('[data-testid="project-meetings-tab"]')).toBeVisible({ timeout: 10000 });
  });

  // --- TC206: Live Meeting Room toolbar has recording toggle button ---
  test("TC206: Live Meeting Room displays recording toggle button", async ({ page }) => {
    const mockActiveMeeting = {
      id: 502,
      projectId: 100,
      title: "Architecture Review",
      status: "ACTIVE",
      roomName: "room-502",
      startedAt: new Date().toISOString(),
      hostName: DEFAULT_MOCK_USER.fullName,
      hostId: DEFAULT_MOCK_USER.id,
      recordingEnabled: true,
      activeParticipantsCount: 1,
      totalParticipantsCount: 1,
      isHost: true,
    };

    await setupWorkspaceMocks(page, { initialMeetings: [mockActiveMeeting] });
    await page.goto("/projects/100/meetings");
    await page.waitForLoadState("domcontentloaded");

    await page.locator('[data-testid="join-meeting-btn-502"]').click();

    const recordBtn = page.locator('[data-testid="toggle-recording-btn"]');
    await expect(recordBtn).toBeVisible({ timeout: 10000 });
  });

  // --- TC207: Responsive Mobile View of Meeting Recording Modal ---
  test("TC207: Responsive Mobile View (393x852) of Meeting Recording Modal", async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 852 });

    const mockEndedMeeting = {
      id: 234,
      projectId: 100,
      title: "Sprint 14 Sync & Demo",
      status: "COMPLETED",
      roomName: "room-234",
      startedAt: new Date(Date.now() - 1800000).toISOString(),
      endedAt: new Date().toISOString(),
      durationSeconds: 120,
      hostName: DEFAULT_MOCK_USER.fullName,
      hostId: DEFAULT_MOCK_USER.id,
      recordingEnabled: true,
      activeParticipantsCount: 0,
      totalParticipantsCount: 3,
      isHost: true,
    };

    await setupWorkspaceMocks(page, { initialMeetings: [mockEndedMeeting] });
    await page.goto("/projects/100/meetings");
    await page.waitForLoadState("domcontentloaded");

    await page.locator('[data-testid="watch-recording-btn-234"]').click();

    const video = page.locator('[data-testid="recording-video-player"]');
    await expect(video).toBeVisible();

    const downloadBtn = page.locator('[data-testid="download-recording-btn"]');
    await expect(downloadBtn).toBeVisible();

    // Verify modal is contained within mobile viewport
    const box = await video.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.width).toBeLessThanOrEqual(393);
  });
});

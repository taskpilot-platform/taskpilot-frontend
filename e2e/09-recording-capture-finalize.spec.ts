import { test, expect } from "./helpers/isolated-test";
import { DEFAULT_MOCK_USER, TEAMMATE_USER, setupWorkspaceMocks } from "./helpers/mock-setup";

test("falls back from Egress to browser capture, uploads to B2, and plays from a second account", async ({ page }) => {
  const session = {
    id: 412, projectId: 100, title: "Recording acceptance fixture", status: "ACTIVE",
    roomName: "room-412", startedAt: new Date().toISOString(),
    hostName: DEFAULT_MOCK_USER.fullName, hostId: DEFAULT_MOCK_USER.id,
    recordingEnabled: true, activeParticipantsCount: 1, totalParticipantsCount: 1, isHost: true,
  };
  await setupWorkspaceMocks(page, { language: "vi", initialMeetings: [session] });
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, "getDisplayMedia", {
      configurable: true,
      value: async () => {
        const canvas = document.createElement("canvas");
        canvas.width = 96;
        canvas.height = 64;
        const renderer = canvas.getContext("2d")!;
        const stream = canvas.captureStream(20);
        let index = 0;
        const paint = () => {
          renderer.fillStyle = index++ % 2 === 0 ? "#05a66b" : "#2186ff";
          renderer.fillRect(0, 0, canvas.width, canvas.height);
        };
        paint();
        const timer = setInterval(() => {
          if (stream.getVideoTracks()[0].readyState === "ended") clearInterval(timer);
          else paint();
        }, 40);
        return stream;
      },
    });
  });

  let uploaded: Buffer | undefined;
  let completed = false;
  let presignedClientRecordingId: string | undefined;
  const mediaPath = "/api/isolated-b2/412.webm";
  const mediaUrl = new URL(mediaPath, "http://127.0.0.1:5173").href;
  await page.route(/\/projects\/100\/meetings\/412\/recording\/start$/, (route) =>
    route.fulfill({ status: 503, json: { message: "Egress unavailable in this fixture" } }));
  await page.route(/\/projects\/100\/meetings\/412\/recording\/presign-upload$/, async (route) => {
    const body = route.request().postDataJSON();
    expect(body.contentType).toBe("video/webm");
    expect(body.clientRecordingId).toMatch(/^[a-zA-Z0-9._:-]+$/);
    presignedClientRecordingId = body.clientRecordingId;
    await route.fulfill({ json: {
      uploadUrl: mediaUrl, uploadToken: "fixture-signed-upload", contentType: "video/webm",
      fileName: "meeting_412_fallback.webm", maxFileSizeBytes: 50 * 1024 * 1024,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    } });
  });
  await page.route("**" + mediaPath, async (route) => {
    expect(route.request().method()).toBe("PUT");
    expect(route.request().headers()["content-type"]).toBe("video/webm");
    uploaded = route.request().postDataBuffer()!;
    expect(uploaded.length).toBeGreaterThan(100);
    await route.fulfill({ status: 200, body: "" });
  });
  await page.route(/\/projects\/100\/meetings\/412\/recording\/complete-upload$/, async (route) => {
    expect(uploaded?.length).toBeGreaterThan(100);
    expect(route.request().postDataJSON()).toEqual({
      uploadToken: "fixture-signed-upload",
      durationSeconds: expect.any(Number),
      origin: "BROWSER",
      coverage: "SCREEN_ONLY",
      clientRecordingId: presignedClientRecordingId,
    });
    completed = true;
    await route.fulfill({ json: { ...session, recordingFileId: 888, recordingStatus: "COMPLETED" } });
  });

  await page.goto("/projects/100/meetings");
  await page.getByTestId("join-meeting-btn-412").click();
  const recordButton = page.getByTestId("toggle-recording-btn");
  await recordButton.click();
  await page.getByRole("button", { name: "Chỉ ghi hình" }).click();
  await expect(recordButton).toHaveText(/Dừng ghi/);
  await expect(page.getByTestId("meeting-fallback-recording-badge")).toBeVisible();
  // Let Chromium emit at least one timed frame before requesting finalization.
  await page.waitForTimeout(650);
  await recordButton.click();
  await expect.poll(() => completed).toBe(true);

  const guest = await page.context().newPage();
  try {
    await setupWorkspaceMocks(guest, {
      language: "vi", user: TEAMMATE_USER, isManager: false,
      initialMeetings: [{ ...session, status: "ENDED", recordingFileId: 888, isHost: false }],
    });
    const proxyStreamPath = "/api/v1/projects/100/files/888/stream?token=fixture-stream-token";
    await guest.route(/\/projects\/100\/meetings\/412\/recording\/playback-url(?:\?.*)?$/, (route) =>
      route.fulfill({ json: { url: proxyStreamPath, provider: "b2", contentType: "video/webm", recordingStatus: "COMPLETED",
        requiresAuthHeader: false, backupStorageUsed: false, recordingFileId: 888 } }));
    await guest.route(/\/projects\/100\/meetings\/412\/recordings$/, (route) =>
      route.fulfill({ json: [{ id: "rec-412-b2", state: "READY", version: 1, fileId: 888,
        mimeType: "video/webm", createdAt: new Date().toISOString(), origin: "BROWSER", coverage: "SCREEN_ONLY" }] }));
    await guest.route("**/api/v1/projects/100/files/888/stream*", (route) => {
      const range = route.request().headers()["range"];
      if (range && uploaded) {
        const match = /bytes=(\d+)-(\d*)/.exec(range);
        if (match) {
          const start = Number(match[1]);
          const end = match[2] ? Math.min(Number(match[2]), uploaded.length - 1) : uploaded.length - 1;
          const slice = uploaded.subarray(start, end + 1);
          return route.fulfill({
            status: 206,
            headers: {
              "Accept-Ranges": "bytes",
              "Content-Range": `bytes ${start}-${end}/${uploaded.length}`,
              "Content-Length": String(slice.length),
            },
            contentType: "video/webm",
            body: slice,
          });
        }
      }
      return route.fulfill({
        status: 200,
        headers: { "Accept-Ranges": "bytes", "Content-Length": String(uploaded?.length ?? 0) },
        contentType: "video/webm",
        body: uploaded,
      });
    });
    await guest.goto("/projects/100/meetings");
    await guest.getByTestId("watch-recording-btn-412").click();
    const video = guest.getByTestId("recording-video-player");
    await expect(video).toBeVisible();
    await expect.poll(() => video.evaluate((player: HTMLVideoElement) => player.videoWidth)).toBe(96);
  } finally {
    await guest.close();
  }
});

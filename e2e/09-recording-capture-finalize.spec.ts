import { createHash } from "node:crypto";
import { test, expect } from "./helpers/isolated-test";
import { DEFAULT_MOCK_USER, TEAMMATE_USER, setupWorkspaceMocks } from "./helpers/mock-setup";

test("captures browser media and plays the finalized project file from a second account", async ({ page }) => {
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
  let clip = { id: "", state: "REQUESTED", version: 0, origin: "BROWSER", coverage: "SCREEN_ONLY", fileId: 0 };
  await page.route(/\/projects\/100\/meetings\/412\/recordings$/, async (route) => {
    if (route.request().method() === "POST") {
      clip.id = route.request().postDataJSON().idempotencyKey;
      await route.fulfill({ json: clip });
    } else {
      await route.fulfill({ json: [clip] });
    }
  });
  await page.route(/\/projects\/100\/meetings\/412\/recordings\/[^/]+\/state$/, async (route) => {
    const data = route.request().postDataJSON();
    expect(data.expectedVersion).toBe(clip.version);
    clip = { ...clip, state: data.state, version: clip.version + 1 };
    await route.fulfill({ json: clip });
  });
  await page.route(/\/projects\/100\/files(\?.*)?$/, async (route) => {
    if (route.request().method() !== "POST") {
      await route.fulfill({ json: { data: { content: [] } } });
      return;
    }
    const type = route.request().headers()["content-type"];
    const boundary = type.split("boundary=")[1];
    const body = route.request().postDataBuffer()!;
    const start = body.indexOf("\r\n\r\n") + 4;
    uploaded = body.subarray(start, body.indexOf(`\r\n--${boundary}`, start));
    expect(uploaded.length).toBeGreaterThan(100);
    await route.fulfill({ json: { data: { id: 888 } } });
  });
  await page.route(/\/projects\/100\/meetings\/412\/recordings\/[^/]+\/finalize$/, async (route) => {
    expect(clip.state).toBe("UPLOADING");
    const data = route.request().postDataJSON();
    expect(data.projectFileId).toBe(888);
    expect(data.expectedVersion).toBe(clip.version);
    expect(data.byteLength).toBe(uploaded?.length);
    expect(data.checksum).toBe(createHash("sha256").update(uploaded!).digest("hex"));
    clip = { ...clip, fileId: 888, state: "READY", version: clip.version + 1 };
    await route.fulfill({ json: clip });
  });

  await page.goto("/projects/100/meetings");
  await page.getByTestId("join-meeting-btn-412").click();
  const recordButton = page.getByTestId("toggle-recording-btn");
  await recordButton.click();
  await page.getByRole("button", { name: "Chỉ ghi hình" }).click();
  await expect(recordButton).toHaveText(/Dừng ghi/);
  await expect.poll(() => clip.state).toBe("CAPTURING");
  await expect(page.getByText("Chỉ có hình ảnh.", { exact: false })).toBeVisible();
  // Let Chromium emit at least one timed frame before requesting finalization.
  await page.waitForTimeout(650);
  await recordButton.click();
  await expect.poll(() => clip.state).toBe("READY");

  const guest = await page.context().newPage();
  try {
    await setupWorkspaceMocks(guest, {
      language: "vi", user: TEAMMATE_USER, isManager: false,
      initialMeetings: [{ ...session, status: "ENDED", recordingFileId: 888, isHost: false }],
    });
    await guest.route(/\/projects\/100\/files\/888\/download$/, (route) =>
      route.fulfill({ contentType: "video/webm", body: uploaded }));
    await guest.goto("/projects/100/meetings");
    await guest.getByTestId("watch-recording-btn-412").click();
    const video = guest.getByTestId("recording-video-player");
    await expect(video).toBeVisible();
    await expect.poll(() => video.evaluate((player: HTMLVideoElement) => player.videoWidth)).toBe(96);
  } finally {
    await guest.close();
  }
});

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  VideoBackgroundBlurService,
  videoBackgroundBlurService,
  BLUR_PRESETS,
  type BlurPreset,
} from "@/services/videoBackgroundBlurService";
import { LiveMeetingRoom } from "@/components/meetings/LiveMeetingRoom";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import { meetingService } from "@/services/meeting.service";

// Mock services
vi.mock("@/services/meeting.service", () => ({
  meetingService: {
    getMeetings: vi.fn(),
    joinMeeting: vi.fn(),
    leaveMeeting: vi.fn(),
    endMeeting: vi.fn(),
  },
}));

vi.mock("@/services/project-files.service", () => ({
  projectFilesService: {
    uploadFile: vi.fn().mockResolvedValue({ data: { id: 999 } }),
    downloadFileUrl: vi.fn().mockReturnValue("/api/v1/projects/1/files/999/download"),
  },
}));

vi.mock("@mediapipe/selfie_segmentation", () => {
  return {
    SelfieSegmentation: class MockSelfieSegmentation {
      private onResultsCallback: any = null;
      setOptions = vi.fn();
      initialize = vi.fn().mockResolvedValue(undefined);
      close = vi.fn().mockResolvedValue(undefined);
      reset = vi.fn();
      onResults(callback: any) {
        this.onResultsCallback = callback;
      }
      send = vi.fn().mockImplementation(async ({ image }: any) => {
        if (this.onResultsCallback) {
          this.onResultsCallback({
            image,
            segmentationMask: image,
          });
        }
      });
    },
  };
});

// Mock HTMLMediaElement & Canvas captureStream
beforeEach(() => {
  vi.clearAllMocks();

  // Mock HTMLCanvasElement 2D context
  HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    ellipse: vi.fn(),
    clip: vi.fn(),
    filter: "none",
    globalCompositeOperation: "source-over",
  });

  // Mock getUserMedia
  if (typeof navigator !== "undefined") {
    const mockTrack = {
      kind: "video",
      stop: vi.fn(),
      readyState: "live",
      enabled: true,
    };
    const mockStream = {
      getTracks: () => [mockTrack],
      getVideoTracks: () => [mockTrack],
      getAudioTracks: () => [],
    } as unknown as MediaStream;

    Object.defineProperty(navigator, "mediaDevices", {
      value: {
        getUserMedia: vi.fn().mockResolvedValue(mockStream),
        getDisplayMedia: vi.fn().mockResolvedValue(mockStream),
      },
      writable: true,
      configurable: true,
    });
  }

  // Mock HTMLVideoElement.prototype.play
  HTMLVideoElement.prototype.play = vi.fn().mockResolvedValue(undefined);
  HTMLVideoElement.prototype.pause = vi.fn();

  // Mock HTMLCanvasElement.prototype.captureStream
  (HTMLCanvasElement.prototype as any).captureStream = vi.fn().mockReturnValue({
    getTracks: () => [{ kind: "video", stop: vi.fn(), readyState: "live" }],
    getVideoTracks: () => [{ kind: "video", stop: vi.fn(), readyState: "live" }],
  });
});

afterEach(() => {
  videoBackgroundBlurService.stop();
});

describe("VideoBackgroundBlurService Unit Tests", () => {
  it("initializes with off preset and handles preset changes", () => {
    const service = new VideoBackgroundBlurService();
    expect(service.getPreset()).toBe("off");
    expect(service.isBlurActive()).toBe(false);

    let notifiedPreset: BlurPreset = "off";
    const unsubscribe = service.subscribe((p) => {
      notifiedPreset = p;
    });

    service.setPreset("standard");
    expect(service.getPreset()).toBe("standard");
    expect(service.isBlurActive()).toBe(true);
    expect(notifiedPreset).toBe("standard");

    service.setPreset("deep");
    expect(service.getPreset()).toBe("deep");
    expect(notifiedPreset).toBe("deep");

    unsubscribe();
    service.setPreset("slight");
    // Notified preset should not change after unsubscribe
    expect(notifiedPreset).toBe("deep");
    expect(service.getPreset()).toBe("slight");

    service.stop();
    expect(service.getPreset()).toBe("off");
    expect(service.isBlurActive()).toBe(false);
  });

  it("exports correct blur presets configuration", () => {
    expect(BLUR_PRESETS).toHaveLength(4);
    const keys = BLUR_PRESETS.map((p) => p.key);
    expect(keys).toEqual(["off", "slight", "standard", "deep"]);

    const standard = BLUR_PRESETS.find((p) => p.key === "standard");
    expect(standard?.radius).toBe(16);

    const slight = BLUR_PRESETS.find((p) => p.key === "slight");
    expect(slight?.radius).toBe(8);

    const deep = BLUR_PRESETS.find((p) => p.key === "deep");
    expect(deep?.radius).toBe(24);
  });

  it("initializes video stream processing pipeline and stops cleanly", async () => {
    const service = new VideoBackgroundBlurService();
    const mockTrack = { kind: "video", stop: vi.fn(), readyState: "live" };
    const mockStream = {
      getTracks: () => [mockTrack],
      getVideoTracks: () => [mockTrack],
    } as unknown as MediaStream;

    const processed = await service.initialize(mockStream, "standard");
    expect(processed).toBeDefined();
    expect(service.getPreset()).toBe("standard");
    expect(service.isBlurActive()).toBe(true);

    service.stop();
    expect(service.getPreset()).toBe("off");
    expect(service.isBlurActive()).toBe(false);
    expect(service.getSourceStream()).toBeNull();
    expect(service.getProcessedStream()).toBeNull();
  });

  it("activates MediaPipe AI segmentation by default on supported environments", async () => {
    const service = new VideoBackgroundBlurService();
    const mockTrack = { kind: "video", stop: vi.fn(), readyState: "live" };
    const mockStream = {
      getTracks: () => [mockTrack],
      getVideoTracks: () => [mockTrack],
    } as unknown as MediaStream;

    await service.initialize(mockStream, "standard");
    expect(service.isUsingAi()).toBe(true);
    expect(service.isBlurActive()).toBe(true);
    service.stop();
  });

  it("handles MediaPipe failure by falling back gracefully without throwing", async () => {
    const service = new VideoBackgroundBlurService();
    const mockTrack = { kind: "video", stop: vi.fn(), readyState: "live" };
    const mockStream = {
      getTracks: () => [mockTrack],
      getVideoTracks: () => [mockTrack],
    } as unknown as MediaStream;

    const spy = vi.spyOn(service as any, "initMediaPipeModel").mockImplementationOnce(async () => {
      (service as any).isAiActive = false;
      (service as any).segmenter = null;
    });

    const processed = await service.initialize(mockStream, "deep");
    expect(processed).toBeDefined();
    expect(service.getPreset()).toBe("deep");
    expect(service.isUsingAi()).toBe(false);
    service.stop();
    spy.mockRestore();
  });
});

describe("LiveMeetingRoom Background Blur Integration Tests", () => {
  const mockTokenData = {
    token: "mock-jwt-token-blur-test",
    livekitUrl: "wss://test.livekit.cloud",
    participantName: "Tester Minh",
    identity: "user_tester",
    isHost: true,
    meeting: {
      id: 555,
      projectId: 10,
      title: "Daily Standup with Background Blur",
      roomName: "room-555",
      status: "ACTIVE",
      recordingEnabled: true,
      isHost: true,
    },
  };

  it("renders background blur toggle and menu buttons in meeting room", async () => {
    vi.mocked(meetingService.joinMeeting).mockResolvedValue(mockTokenData as any);

    render(
      <ConfirmProvider>
        <LiveMeetingRoom
          projectId={10}
          meetingId={555}
          currentUserId={1}
          onLeave={vi.fn()}
        />
      </ConfirmProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("toggle-blur-btn")).toBeInTheDocument();
      expect(screen.getByTestId("blur-menu-trigger-btn")).toBeInTheDocument();
    });
  });

  it("toggles blur on/off via quick button and displays active badge on local tile", async () => {
    vi.mocked(meetingService.joinMeeting).mockResolvedValue(mockTokenData as any);

    render(
      <ConfirmProvider>
        <LiveMeetingRoom
          projectId={10}
          meetingId={555}
          currentUserId={1}
          onLeave={vi.fn()}
        />
      </ConfirmProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("toggle-blur-btn")).toBeInTheDocument();
    });

    // Initially blur is off, so no blur badge
    expect(screen.queryByTestId("blur-active-badge")).not.toBeInTheDocument();

    // Click toggle button -> activates standard blur
    fireEvent.click(screen.getByTestId("toggle-blur-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("blur-active-badge")).toBeInTheDocument();
    });

    // Click toggle button again -> deactivates blur
    fireEvent.click(screen.getByTestId("toggle-blur-btn"));

    await waitFor(() => {
      expect(screen.queryByTestId("blur-active-badge")).not.toBeInTheDocument();
    });
  });

  it("opens blur preset menu and switches between slight, standard, and deep blur", async () => {
    vi.mocked(meetingService.joinMeeting).mockResolvedValue(mockTokenData as any);

    render(
      <ConfirmProvider>
        <LiveMeetingRoom
          projectId={10}
          meetingId={555}
          currentUserId={1}
          onLeave={vi.fn()}
        />
      </ConfirmProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("blur-menu-trigger-btn")).toBeInTheDocument();
    });

    // Menu should initially be closed
    expect(screen.queryByTestId("blur-preset-menu")).not.toBeInTheDocument();

    // Open menu
    fireEvent.click(screen.getByTestId("blur-menu-trigger-btn"));
    expect(screen.getByTestId("blur-preset-menu")).toBeInTheDocument();
    expect(screen.getByTestId("blur-preset-option-slight")).toBeInTheDocument();
    expect(screen.getByTestId("blur-preset-option-standard")).toBeInTheDocument();
    expect(screen.getByTestId("blur-preset-option-deep")).toBeInTheDocument();

    // Select slight blur (8px)
    fireEvent.click(screen.getByTestId("blur-preset-option-slight"));

    await waitFor(() => {
      expect(screen.getByTestId("blur-active-badge")).toBeInTheDocument();
      expect(screen.getByTestId("blur-active-badge")).toHaveTextContent("Mờ nhẹ");
    });

    // Reopen menu and select deep blur (24px)
    fireEvent.click(screen.getByTestId("blur-menu-trigger-btn"));
    fireEvent.click(screen.getByTestId("blur-preset-option-deep"));

    await waitFor(() => {
      expect(screen.getByTestId("blur-active-badge")).toHaveTextContent("Mờ sâu");
    });

    // Reopen menu and select off
    fireEvent.click(screen.getByTestId("blur-menu-trigger-btn"));
    fireEvent.click(screen.getByTestId("blur-preset-option-off"));

    await waitFor(() => {
      expect(screen.queryByTestId("blur-active-badge")).not.toBeInTheDocument();
    });
  });
});

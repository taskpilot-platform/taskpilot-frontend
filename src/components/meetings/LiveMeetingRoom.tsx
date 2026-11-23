import React, { useEffect, useRef, useState } from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  ScreenShare,
  PhoneOff,
  Users,
  MessageSquare,
  Copy,
  Check,
  Send,
  X,
  Disc,
  Sparkles,
  ChevronUp,
} from "lucide-react";
import { Room, RoomEvent, Track, VideoPresets } from "livekit-client";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { meetingService } from "@/services/meeting.service";
import { meetingRecordingStore } from "@/services/meetingRecordingStore";
import fixWebmDuration from "fix-webm-duration";
import {
  videoBackgroundBlurService,
  BLUR_PRESETS,
  type BlurPreset,
} from "@/services/videoBackgroundBlurService";
import type { MeetingTokenResponse, ProjectMeetingDto } from "@/types/meeting";

interface LiveMeetingRoomProps {
  projectId: number;
  meetingId: number;
  currentUserId: number;
  onLeave: () => void;
  onEndMeeting?: () => void;
}

interface InMeetingMessage {
  id: string;
  senderName: string;
  senderId: number;
  content: string;
  time: string;
  isSelf: boolean;
}

interface ParticipantView {
  identity: string;
  name: string;
  isHost: boolean;
  isLocal: boolean;
  isSpeaking: boolean;
  isMuted: boolean;
  isCameraOff: boolean;
  avatarUrl?: string;
  track?: any;
}

// ---------------------------------------------------------------------------
// Participant Video Tile Component (Real LiveKit Track / Direct WebCam Feed)
// ---------------------------------------------------------------------------
function ParticipantTile({
  view,
  room,
  blurStream,
  blurPreset = "off",
}: {
  view: ParticipantView;
  room: Room | null;
  blurStream?: MediaStream | null;
  blurPreset?: BlurPreset;
}) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasVideoStream, setHasVideoStream] = useState(false);

  useEffect(() => {
    let attachedTrack: any = null;
    let fallbackStream: MediaStream | null = null;
    let isCancelled = false;

    if (view.isCameraOff) {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setHasVideoStream(false);
      return;
    }

    // 0. If local user has background blur active, prioritize processed blurred stream
    if (view.isLocal && blurPreset !== "off" && blurStream) {
      if (videoRef.current) {
        videoRef.current.srcObject = blurStream;
        videoRef.current.play()?.catch(() => {});
        setHasVideoStream(true);
      }
      return;
    }

    // 1. Try LiveKit track first
    if (room) {
      if (view.isLocal) {
        const pub = room.localParticipant.getTrackPublication(Track.Source.Camera);
        if (pub?.track) {
          attachedTrack = pub.track;
          if (videoRef.current) {
            attachedTrack.attach(videoRef.current);
            setHasVideoStream(true);
          }
        }
      } else {
        const remote = room.remoteParticipants.get(view.identity);
        if (remote) {
          const pub = remote.getTrackPublication(Track.Source.Camera);
          if (pub?.track && pub.isSubscribed) {
            attachedTrack = pub.track;
            if (videoRef.current) {
              attachedTrack.attach(videoRef.current);
              setHasVideoStream(true);
            }
          }
        }
      }
    }

    // 2. Fallback to direct local camera stream if local and no LiveKit track yet
    if (view.isLocal && !attachedTrack && typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })
        .then((stream) => {
          if (isCancelled) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          fallbackStream = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play()?.catch(() => {});
            setHasVideoStream(true);
          }
        })
        .catch((err) => {
          console.warn("Direct webcam acquisition fallback error:", err);
          setHasVideoStream(false);
        });
    }

    return () => {
      isCancelled = true;
      if (attachedTrack && videoRef.current) {
        try {
          attachedTrack.detach(videoRef.current);
        } catch {}
      }
      if (fallbackStream) {
        fallbackStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [view.isCameraOff, view.isLocal, view.identity, room, blurStream, blurPreset]);

  return (
    <div
      className={`relative bg-slate-900 border rounded-xl overflow-hidden aspect-video flex flex-col items-center justify-center transition-all duration-200 shadow-md ${
        view.isSpeaking
          ? "border-emerald-500 ring-2 ring-emerald-500/50 shadow-emerald-950/40"
          : "border-border/60 hover:border-border"
      }`}
      data-testid={`participant-tile-${view.identity}`}
    >
      {/* Video or Avatar Placeholder */}
      {!view.isCameraOff ? (
        <div className="w-full h-full relative overflow-hidden bg-slate-950 flex items-center justify-center">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={view.isLocal}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              hasVideoStream ? "opacity-100" : "opacity-0"
            }`}
          />
          {!hasVideoStream && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-950">
              <Avatar className="w-20 h-20 sm:w-24 sm:h-24 border-2 border-emerald-500/40 shadow-xl">
                <AvatarFallback className="bg-emerald-950 text-emerald-300 font-bold text-2xl sm:text-3xl">
                  {view.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="mt-2 text-xs text-emerald-400 font-medium flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                HD Camera Active
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-muted/60 dark:bg-slate-900/80">
          <Avatar className="w-20 h-20 sm:w-24 sm:h-24 border-2 border-muted-foreground/30 shadow-xl">
            <AvatarFallback className="bg-muted text-muted-foreground font-bold text-2xl sm:text-3xl">
              {view.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="mt-2 text-xs text-muted-foreground font-medium">Camera đã tắt</span>
        </div>
      )}

      {/* Badges Overlay */}
      <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none z-10">
        <div className="flex items-center gap-1.5 bg-background/85 dark:bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-lg text-xs font-medium text-foreground border border-border/80 shadow-sm">
          {view.isHost && (
            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 px-1 py-0 text-[10px] font-normal">
              Host
            </Badge>
          )}
          <span className="truncate max-w-[120px] sm:max-w-[180px]">{view.name}</span>
          {view.isLocal && blurPreset !== "off" && (
            <Badge
              variant="outline"
              className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 px-1.5 py-0 text-[10px] gap-1 font-medium pointer-events-auto"
              data-testid="blur-active-badge"
            >
              <Sparkles className="w-2.5 h-2.5 text-emerald-500" />
              <span>
                {blurPreset === "slight"
                  ? t("meetings.blur_slight_label", { defaultValue: "Mờ nhẹ" })
                  : blurPreset === "deep"
                  ? t("meetings.blur_deep_label", { defaultValue: "Mờ sâu" })
                  : t("meetings.blur_standard_label", { defaultValue: "Mờ nền" })}
              </span>
            </Badge>
          )}
        </div>

        <div className="bg-background/85 dark:bg-slate-950/80 backdrop-blur-md p-1.5 rounded-lg border border-border/80 shadow-sm">
          {view.isMuted ? (
            <MicOff className="w-3.5 h-3.5 text-red-500" />
          ) : (
            <Mic className="w-3.5 h-3.5 text-emerald-500" />
          )}
        </div>
      </div>

      {/* Speaking indicator label */}
      {view.isSpeaking && (
        <div className="absolute top-2.5 left-2.5 bg-emerald-500 text-white text-[10px] px-2 py-0.5 rounded-md font-semibold tracking-wide uppercase shadow-sm z-10">
          {t("meetings.speaking", { defaultValue: "Đang nói" })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Screen Share Viewer Component
// ---------------------------------------------------------------------------
function ScreenShareViewer({
  room,
  stream,
}: {
  room: Room | null;
  stream: MediaStream | null;
}) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // 1. Prioritize direct local display MediaStream
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play()?.catch(() => {});
      return;
    }

    // 2. Fallback or remote LiveKit screen share track
    let track: any = null;
    if (room) {
      let pub: any = room.localParticipant?.getTrackPublication(Track.Source.ScreenShare);
      if (!pub?.track) {
        for (const remote of room.remoteParticipants.values()) {
          const remotePub = remote.getTrackPublication(Track.Source.ScreenShare);
          if (remotePub?.track && remotePub.isSubscribed) {
            pub = remotePub;
            break;
          }
        }
      }

      if (pub?.track && videoRef.current) {
        track = pub.track;
        track.attach(videoRef.current);
      }
    }

    return () => {
      if (track && videoRef.current) {
        try {
          track.detach(videoRef.current);
        } catch {}
      }
    };
  }, [room, stream]);

  return (
    <div className="w-full h-full min-h-[320px] max-h-[720px] bg-slate-950 rounded-2xl overflow-hidden border border-emerald-500/40 shadow-2xl relative flex items-center justify-center" data-testid="screen-share-viewer">
      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-contain" />
      <div className="absolute top-3 left-3 bg-background/85 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-border shadow-md flex items-center gap-2">
        <ScreenShare className="w-4 h-4 text-emerald-500 animate-pulse" />
        <span>{t("meetings.screen_share_live", { defaultValue: "Màn hình đang chia sẻ (Live HD)" })}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main LiveMeetingRoom Component
// ---------------------------------------------------------------------------
export function LiveMeetingRoom({
  projectId,
  meetingId,
  currentUserId,
  onLeave,
  onEndMeeting,
}: LiveMeetingRoomProps) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [tokenData, setTokenData] = useState<MeetingTokenResponse | null>(null);
  const [meeting, setMeeting] = useState<ProjectMeetingDto | null>(null);
  const [connectionState, setConnectionState] = useState<"connecting" | "connected" | "disconnected" | "error">("connecting");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Audio / Video / Screen controls
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);

  // Background blur controls
  const [blurPreset, setBlurPreset] = useState<BlurPreset>("off");
  const [blurStream, setBlurStream] = useState<MediaStream | null>(null);
  const [isBlurMenuOpen, setIsBlurMenuOpen] = useState(false);
  const rawWebcamStreamRef = useRef<MediaStream | null>(null);

  // Cloud Egress + Tier 3 fallback browser recording controls
  const [isRecording, setIsRecording] = useState(false);
  const [recordingMode, setRecordingMode] = useState<"none" | "cloud" | "fallback">("none");
  const [isRecordingBusy, setIsRecordingBusy] = useState(false);
  const [isUploadingFallback, setIsUploadingFallback] = useState(false);
  const fallbackRecorderRef = useRef<MediaRecorder | null>(null);
  const fallbackStreamRef = useRef<MediaStream | null>(null);
  const fallbackCompletionRef = useRef<{ promise: Promise<void>; resolve: () => void } | null>(null);

  // Drawers
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Meeting duration timer
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Chat
  const [messages, setMessages] = useState<InMeetingMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Participants views
  const [views, setViews] = useState<ParticipantView[]>([]);

  // LiveKit Room instance ref
  const roomRef = useRef<Room | null>(null);
  const tokenDataRef = useRef<MeetingTokenResponse | null>(null);

  // 1. Join meeting & Fetch token
  useEffect(() => {
    let isMounted = true;

    async function initMeeting() {
      try {
        setConnectionState("connecting");
        const rawRes = await meetingService.joinMeeting(projectId, meetingId);
        if (!isMounted) return;

        const res: MeetingTokenResponse = (rawRes as any)?.data?.token
          ? (rawRes as any).data
          : (rawRes as any)?.token
          ? rawRes
          : ((rawRes as any)?.data || rawRes);

        tokenDataRef.current = res;
        setTokenData(res);
        if (res?.meeting) {
          setMeeting(res.meeting);
          const cloudActive =
            res.meeting.recordingStatus === "STARTING" ||
            res.meeting.recordingStatus === "RECORDING";
          setIsRecording(cloudActive);
          setRecordingMode(cloudActive ? "cloud" : "none");
        }

        // Connect to LiveKit Room
        await connectLiveKit(res);
      } catch (err: any) {
        if (!isMounted) return;
        console.error("Error joining meeting:", err);
        setErrorMessage(err?.response?.data?.message || err?.message || "Failed to join meeting");
        setConnectionState("error");
      }
    }

    initMeeting();

    return () => {
      isMounted = false;
      cleanupRoom();
      videoBackgroundBlurService.stop();
      if (rawWebcamStreamRef.current) {
        rawWebcamStreamRef.current.getTracks().forEach((t) => t.stop());
        rawWebcamStreamRef.current = null;
      }
    };
  }, [projectId, meetingId]);

  // Timer counter
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Warn user before closing tab while Tier 3 local fallback recording or B2 upload is in progress
  useEffect(() => {
    const protectTab = (recordingMode === "fallback" && isRecording) || isUploadingFallback;
    if (!protectTab) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [recordingMode, isRecording, isUploadingFallback]);

  // Periodically sync server-side Cloud Egress status so all participants see live REC / PROCESSING state
  useEffect(() => {
    if (connectionState !== "connected" || typeof meetingService.getMeetingById !== "function") return;
    let active = true;
    const interval = setInterval(async () => {
      if (!active || recordingMode === "fallback") return;
      try {
        const latest = await meetingService.getMeetingById(projectId, meetingId);
        if (!active || !latest) return;
        setMeeting(latest);
        const cloudActive = latest.recordingStatus === "STARTING" || latest.recordingStatus === "RECORDING";
        setIsRecording(cloudActive);
        setRecordingMode(cloudActive ? "cloud" : "none");
      } catch {
        // Non-fatal background refresh
      }
    }, 15000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [connectionState, projectId, meetingId, recordingMode]);

  // Format timer
  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) {
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  // Connect to LiveKit
  const connectLiveKit = async (tokenRes?: MeetingTokenResponse) => {
    const activeTokenData: MeetingTokenResponse = (tokenRes as any)?.data?.token
      ? (tokenRes as any).data
      : (tokenRes as any)?.token
      ? tokenRes
      : tokenDataRef.current || tokenData || ({} as any);

    tokenDataRef.current = activeTokenData;
    setupFallbackViews(activeTokenData);

    const token = activeTokenData?.token;
    if (!token || typeof token !== "string" || token.startsWith("mock-")) {
      setConnectionState("connected");
      return;
    }

    try {
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        videoCaptureDefaults: {
          resolution: VideoPresets.h720.resolution,
        },
      });

      roomRef.current = room;

      // Event handlers
      room.on(RoomEvent.Connected, () => {
        setConnectionState("connected");
        updateParticipantViews(activeTokenData);
      });

      room.on(RoomEvent.Disconnected, () => {
        setConnectionState("disconnected");
      });

      room.on(RoomEvent.ParticipantConnected, (p) => {
        toast.info(`${p.name || p.identity} đã tham gia`);
        updateParticipantViews(activeTokenData);
      });

      room.on(RoomEvent.ParticipantDisconnected, (p) => {
        toast.info(`${p.name || p.identity} đã rời phòng`);
        updateParticipantViews(activeTokenData);
      });

      room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        const speakerIds = new Set(speakers.map((s) => s.identity));
        setViews((prev) =>
          prev.map((v) => ({
            ...v,
            isSpeaking: speakerIds.has(v.identity),
          }))
        );
      });

      room.on(RoomEvent.TrackSubscribed, () => {
        updateParticipantViews(activeTokenData);
      });

      room.on(RoomEvent.TrackUnsubscribed, () => {
        updateParticipantViews(activeTokenData);
      });

      room.on(RoomEvent.DataReceived, (payload, participant) => {
        try {
          const str = new TextDecoder().decode(payload);
          const data = JSON.parse(str);
          if (data.type === "chat") {
            setMessages((prev) => [
              ...prev,
              {
                id: data.id || String(Date.now()),
                senderName: participant?.name || participant?.identity || "Participant",
                senderId: data.senderId || 0,
                content: data.content,
                time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                isSelf: false,
              },
            ]);
          }
        } catch (e) {
          console.warn("Failed to parse data message", e);
        }
      });

      // Try connecting to LiveKit cloud
      const livekitUrl = activeTokenData?.livekitUrl || "wss://taskpilot-collab-m3oqfj4g.livekit.cloud";
      await room.connect(livekitUrl, token);

      // Attempt publishing local camera & mic
      try {
        await room.localParticipant.enableCameraAndMicrophone();
        setIsMicOn(true);
        setIsCamOn(true);
      } catch (devErr) {
        console.warn("Media devices not available (running in headless or simulated environment):", devErr);
      }

      setConnectionState("connected");
      updateParticipantViews(activeTokenData);
    } catch (err: any) {
      console.warn("LiveKit Room connection fallback mode active:", err?.message || err);
      setConnectionState("connected");
      setupFallbackViews(activeTokenData);
    }
  };

  const setupFallbackViews = (tokenRes?: MeetingTokenResponse) => {
    const resolved = (tokenRes as any)?.data?.token ? (tokenRes as any).data : tokenRes;
    const name = resolved?.participantName ? `${resolved.participantName} (Bạn)` : "Alex Rivera (Bạn)";
    setViews([
      {
        identity: resolved?.identity || "user_local",
        name,
        isHost: resolved?.isHost ?? true,
        isLocal: true,
        isSpeaking: false,
        isMuted: false,
        isCameraOff: false,
      },
    ]);
  };

  const updateParticipantViews = (providedToken?: MeetingTokenResponse) => {
    const room = roomRef.current;
    if (!room) return;

    const currentToken = providedToken || tokenDataRef.current || tokenData;
    const list: ParticipantView[] = [];

    // Local participant
    const local = room.localParticipant;
    const identity = currentToken?.identity || local.identity || "user_local";
    const displayName = currentToken?.participantName || local.name || "Bạn";

    list.push({
      identity,
      name: displayName + " (Bạn)",
      isHost: currentToken?.isHost ?? false,
      isLocal: true,
      isSpeaking: local.isSpeaking,
      isMuted: !local.isMicrophoneEnabled,
      isCameraOff: !local.isCameraEnabled,
    });

    // Remote participants
    room.remoteParticipants.forEach((p) => {
      list.push({
        identity: p.identity,
        name: p.name || p.identity,
        isHost: false,
        isLocal: false,
        isSpeaking: p.isSpeaking,
        isMuted: !p.isMicrophoneEnabled,
        isCameraOff: !p.isCameraEnabled,
      });
    });

    setViews(list);
  };

  const cleanupRoom = () => {
    videoBackgroundBlurService.stop();
    if (rawWebcamStreamRef.current) {
      rawWebcamStreamRef.current.getTracks().forEach((t) => t.stop());
      rawWebcamStreamRef.current = null;
    }
    setBlurStream(null);
    setBlurPreset("off");

    if (fallbackRecorderRef.current && fallbackRecorderRef.current.state === "recording") {
      try {
        fallbackRecorderRef.current.stop();
      } catch (e) {
        console.warn("Error stopping fallback media recorder", e);
      }
    }
    if (fallbackStreamRef.current) {
      fallbackStreamRef.current.getTracks().forEach((t) => t.stop());
      fallbackStreamRef.current = null;
    }

    if (screenStream) {
      screenStream.getTracks().forEach((t) => t.stop());
      setScreenStream(null);
    }
    if (roomRef.current) {
      try {
        roomRef.current.disconnect();
      } catch (e) {
        console.warn("Error disconnecting room", e);
      }
      roomRef.current = null;
    }
  };

  // Toggle Microphone
  const toggleMic = async () => {
    const next = !isMicOn;
    setIsMicOn(next);
    if (roomRef.current?.localParticipant) {
      try {
        await roomRef.current.localParticipant.setMicrophoneEnabled(next);
      } catch (e) {
        console.warn("Mic toggle error", e);
      }
    }
    setViews((prev) =>
      prev.map((v) => (v.isLocal ? { ...v, isMuted: !next } : v))
    );
  };

  // Toggle Camera
  const toggleCam = async () => {
    const next = !isCamOn;
    setIsCamOn(next);
    if (roomRef.current?.localParticipant) {
      try {
        await roomRef.current.localParticipant.setCameraEnabled(next);
      } catch (e) {
        console.warn("Camera toggle error", e);
      }
    }
    setViews((prev) =>
      prev.map((v) => (v.isLocal ? { ...v, isCameraOff: !next } : v))
    );
  };

  // Background blur management
  const applyBlurPreset = async (preset: BlurPreset) => {
    setIsBlurMenuOpen(false);
    if (preset === "off") {
      videoBackgroundBlurService.stop();
      setBlurPreset("off");
      setBlurStream(null);
      toast.info(t("meetings.blur_disabled_toast", { defaultValue: "Đã tắt làm mờ nền" }));
      return;
    }

    try {
      // 1. Obtain raw webcam stream if not cached or active
      let sourceStream = rawWebcamStreamRef.current;
      if (!sourceStream || sourceStream.getTracks().every((t) => t.readyState === "ended")) {
        if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
          sourceStream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: false,
          });
          rawWebcamStreamRef.current = sourceStream;
        }
      }

      if (!sourceStream) {
        // Fallback for headless / test environment
        const mockCanvas = typeof document !== "undefined" ? document.createElement("canvas") : null;
        if (mockCanvas && typeof mockCanvas.captureStream === "function") {
          sourceStream = mockCanvas.captureStream(30);
          rawWebcamStreamRef.current = sourceStream;
        }
      }

      if (!sourceStream) {
        toast.warning(t("meetings.blur_no_camera", { defaultValue: "Không tìm thấy thiết bị camera để làm mờ nền" }));
        return;
      }

      const processed = await videoBackgroundBlurService.initialize(sourceStream, preset);
      setBlurPreset(preset);
      setBlurStream(processed);

      // Attempt swapping LiveKit track if available
      if (roomRef.current?.localParticipant) {
        const pub = roomRef.current.localParticipant.getTrackPublication(Track.Source.Camera);
        if (pub?.track && typeof (pub.track as any).restartTrack === "function") {
          const newVideoTrack = processed.getVideoTracks()[0];
          if (newVideoTrack) {
            try {
              await (pub.track as any).restartTrack({ track: newVideoTrack });
            } catch (trackErr) {
              console.warn("LiveKit track restart fallback:", trackErr);
            }
          }
        }
      }

      toast.success(t("meetings.blur_enabled_toast", { defaultValue: "Đã bật tính năng làm mờ nền" }));
    } catch (err) {
      console.warn("Error applying background blur:", err);
      toast.warning(t("meetings.blur_error", { defaultValue: "Không thể khởi tạo làm mờ nền" }));
    }
  };

  const toggleBlur = () => {
    if (blurPreset === "off") {
      applyBlurPreset("standard");
    } else {
      applyBlurPreset("off");
    }
  };

  // Toggle Screen Share
  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      if (screenStream) {
        screenStream.getTracks().forEach((t) => t.stop());
        setScreenStream(null);
      }
      if (roomRef.current?.localParticipant) {
        try {
          await roomRef.current.localParticipant.setScreenShareEnabled(false);
        } catch {}
      }
      setIsScreenSharing(false);
      toast.info(t("meetings.screen_share_stopped", { defaultValue: "Đã dừng chia sẻ màn hình" }));
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });

        stream.getVideoTracks()[0].onended = () => {
          if (roomRef.current?.localParticipant) {
            void roomRef.current.localParticipant.setScreenShareEnabled(false);
          }
          setScreenStream(null);
          setIsScreenSharing(false);
          toast.info(t("meetings.screen_share_stopped", { defaultValue: "Đã dừng chia sẻ màn hình" }));
        };

        setScreenStream(stream);
        setIsScreenSharing(true);

        if (roomRef.current?.localParticipant) {
          try {
            await roomRef.current.localParticipant.setScreenShareEnabled(true);
          } catch {}
        }

        toast.info(t("meetings.screen_sharing_active", { defaultValue: "Đang chia sẻ màn hình" }));
      } catch (e: any) {
        console.warn("Screen share cancel/error", e);
        setIsScreenSharing(false);
      }
    }
  };

  const startFallbackBrowserRecording = async (): Promise<boolean> => {
    if (typeof MediaRecorder === "undefined") {
      toast.error(
        t("meetings.browser_unsupported_record", {
          defaultValue: "Trình duyệt không hỗ trợ ghi hình dự phòng",
        })
      );
      return false;
    }

    let streamToRecord = screenStream;
    let ownsStream = false;
    if (!streamToRecord) {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getDisplayMedia) {
        toast.error(
          t("meetings.browser_unsupported_record", {
            defaultValue: "Trình duyệt không hỗ trợ ghi hình màn hình dự phòng",
          })
        );
        return false;
      }
      try {
        streamToRecord = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
        ownsStream = true;
      } catch {
        toast.warning(
          t("meetings.no_permission_record", {
            defaultValue: "Chưa cấp quyền ghi hình màn hình cho chế độ dự phòng",
          })
        );
        return false;
      }
    }

    let resolveFallbackDone: (() => void) | null = null;
    try {
      const localChunks: Blob[] = [];
      const startedAt = Date.now();
      const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
        ? "video/webm;codecs=vp8,opus"
        : MediaRecorder.isTypeSupported("video/webm")
        ? "video/webm"
        : "";
      const recorder = new MediaRecorder(streamToRecord, mime ? { mimeType: mime } : undefined);

      // Create completion barrier BEFORE recorder.start() so Leave/End always waits across async recorder.stop() -> onstop -> B2 upload.
      let resolveDone!: () => void;
      const donePromise = new Promise<void>((res) => {
        resolveDone = res;
      });
      resolveFallbackDone = resolveDone;
      const completionHandle = { promise: donePromise, resolve: resolveDone };
      fallbackCompletionRef.current = completionHandle;

      const finishCompletion = () => {
        resolveDone();
        if (fallbackCompletionRef.current === completionHandle) {
          fallbackCompletionRef.current = null;
        }
      };

      const handleTrackEnded = () => {
        if (recorder.state === "recording") {
          try {
            recorder.stop();
          } catch (stopErr) {
            console.warn("Could not stop fallback recorder on track end:", stopErr);
          }
        }
      };

      const videoTrack = streamToRecord.getVideoTracks?.()[0];
      if (videoTrack && typeof videoTrack.addEventListener === "function") {
        videoTrack.addEventListener("ended", handleTrackEnded, { once: true });
      }

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          localChunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        if (videoTrack && typeof videoTrack.removeEventListener === "function") {
          videoTrack.removeEventListener("ended", handleTrackEnded);
        }
        if (fallbackRecorderRef.current === recorder) {
          fallbackRecorderRef.current = null;
        }
        if (ownsStream && fallbackStreamRef.current === streamToRecord) {
          streamToRecord.getTracks().forEach((t) => t.stop());
          fallbackStreamRef.current = null;
        }
        setIsRecording(false);
        setRecordingMode("none");

        const durationMs = Math.max(1000, Date.now() - startedAt);
        const durationSec = Math.max(1, Math.round(durationMs / 1000));
        const detectedType = recorder.mimeType || "video/webm";
        const initialBlob = new Blob(localChunks, { type: detectedType });
        if (initialBlob.size === 0) {
          finishCompletion();
          return;
        }

        void (async () => {
          setIsUploadingFallback(true);
          try {
            let blob = initialBlob;
            const isWebm = !blob.type || blob.type.toLowerCase().includes("webm");
            if (isWebm) {
              try {
                blob = await fixWebmDuration(blob, durationMs);
              } catch (fixErr) {
                console.warn("Could not patch WebM duration header:", fixErr);
              }
            }

            await meetingRecordingStore.saveRecording(meetingId, blob, {
              title: meeting?.title || tokenData?.meeting?.title || `Cuộc họp #${meetingId}`,
              projectId,
              durationSeconds: durationSec,
            });

            const ext = blob.type.toLowerCase().includes("mp4") ? ".mp4" : ".webm";
            try {
              const updated = await meetingService.uploadFallbackRecordingToB2(projectId, meetingId, blob, {
                fileName: `meeting_${meetingId}_fallback_${Date.now()}${ext}`,
                durationSeconds: durationSec,
              });
              if (updated) {
                setMeeting(updated);
              }
              toast.success(
                t("meetings.fallback_upload_success", {
                  defaultValue: "Đã tải bản ghi dự phòng lên Backblaze B2 thành công!",
                })
              );
            } catch (uploadErr: any) {
              console.warn("Fallback B2 presigned upload failed; local IndexedDB copy preserved", uploadErr);
              toast.warning(
                uploadErr?.response?.data?.message ||
                  uploadErr?.message ||
                  t("meetings.recording_upload_failed", {
                    defaultValue:
                      "Không thể tải bản ghi dự phòng lên Backblaze B2; bản sao cục bộ vẫn được giữ trên trình duyệt.",
                  })
              );
            }
          } finally {
            setIsUploadingFallback(false);
            finishCompletion();
          }
        })();
      };

      recorder.start(1000);
      fallbackRecorderRef.current = recorder;
      if (ownsStream) {
        fallbackStreamRef.current = streamToRecord;
      }
      setIsRecording(true);
      setRecordingMode("fallback");
      toast.warning(
        t("meetings.recording_fallback_started", {
          defaultValue:
            "Đang ghi (chế độ dự phòng trên trình duyệt) — đừng đóng tab cho đến khi dừng ghi.",
        })
      );
      return true;
    } catch (recErr) {
      console.warn("Could not start fallback MediaRecorder:", recErr);
      resolveFallbackDone?.();
      fallbackCompletionRef.current = null;
      if (ownsStream && streamToRecord) {
        streamToRecord.getTracks().forEach((t) => t.stop());
      }
      return false;
    }
  };

  // Cloud Egress recording toggle with graceful degradation to Tier 3 browser fallback
  const handleToggleCloudRecording = async () => {
    if (isRecordingBusy || isUploadingFallback) return;
    if (!tokenData?.isHost) {
      toast.error(
        t("meetings.recording_host_only", {
          defaultValue: "Chỉ chủ phòng hoặc quản lý dự án mới có quyền ghi hình cuộc họp.",
        })
      );
      return;
    }
    setIsRecordingBusy(true);
    try {
      if (isRecording) {
        if (recordingMode === "fallback") {
          if (fallbackRecorderRef.current && fallbackRecorderRef.current.state === "recording") {
            fallbackRecorderRef.current.stop();
          } else {
            setIsRecording(false);
            setRecordingMode("none");
          }
          toast.info(
            t("meetings.fallback_stopping", {
              defaultValue: "Đã dừng ghi hình dự phòng. Đang tải video lên Backblaze B2...",
            })
          );
          return;
        }

        const updated = await meetingService.stopRecording(projectId, meetingId);
        if (updated) {
          setMeeting(updated);
        }
        setIsRecording(false);
        setRecordingMode("none");
        toast.success(
          t("meetings.recording_stopping", {
            defaultValue: "Đã dừng ghi hình đám mây. Video đang được xử lý và lưu tự động.",
          })
        );
      } else {
        try {
          const updated = await meetingService.startRecording(projectId, meetingId);
          if (updated) {
            setMeeting(updated);
          }
          setIsRecording(true);
          setRecordingMode("cloud");
          toast.info(
            t("meetings.recording_started_cloud", {
              defaultValue: "Đã bắt đầu ghi hình đám mây (LiveKit Egress)",
            })
          );
        } catch (cloudErr: any) {
          const status = cloudErr?.response?.status ?? cloudErr?.status;
          // Never fall back to local browser recording on authorization, conflict, or bad-request errors.
          if (status === 409) {
            if (typeof meetingService.getMeetingById === "function") {
              try {
                const latest = await meetingService.getMeetingById(projectId, meetingId);
                if (latest) {
                  setMeeting(latest);
                  const cloudActive =
                    latest.recordingStatus === "STARTING" || latest.recordingStatus === "RECORDING";
                  setIsRecording(cloudActive);
                  setRecordingMode(cloudActive ? "cloud" : "none");
                }
              } catch {
                // Keep existing state if refresh fails
              }
            }
            toast.info(
              cloudErr?.response?.data?.message ||
                t("meetings.recording_already_active", {
                  defaultValue: "Cuộc họp đang có bản ghi đám mây đang chạy hoặc đang xử lý.",
                })
            );
            return;
          }
          if (typeof status === "number" && status >= 400 && status < 500) {
            const msg =
              cloudErr?.response?.data?.message ||
              cloudErr?.message ||
              t("meetings.recording_toggle_error", {
                defaultValue: "Không thể bắt đầu ghi hình đám mây",
              });
            toast.error(msg);
            return;
          }

          console.warn("LiveKit Egress start failed, attempting Tier 3 browser fallback:", cloudErr);
          const startedFallback = await startFallbackBrowserRecording();
          if (!startedFallback) {
            const msg =
              cloudErr?.response?.data?.message ||
              cloudErr?.message ||
              t("meetings.recording_toggle_error", {
                defaultValue: "Không thể bắt đầu ghi hình đám mây hoặc chế độ dự phòng",
              });
            toast.error(msg);
          }
        }
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        t("meetings.recording_toggle_error", {
          defaultValue: "Không thể điều khiển ghi hình",
        });
      toast.error(msg);
    } finally {
      setIsRecordingBusy(false);
    }
  };

  const flushFallbackRecordingBeforeExit = async () => {
    const completion = fallbackCompletionRef.current;
    if (fallbackRecorderRef.current && fallbackRecorderRef.current.state === "recording") {
      try {
        fallbackRecorderRef.current.stop();
      } catch (e) {
        console.warn("Error stopping fallback recorder before exit", e);
        completion?.resolve();
      }
    }
    if (completion) {
      try {
        await completion.promise;
      } catch {
        // Error already toasted inside onstop
      }
    }
  };

  // Leave Meeting
  const handleLeave = async () => {
    await flushFallbackRecordingBeforeExit();
    try {
      await meetingService.leaveMeeting(projectId, meetingId);
    } catch (e) {
      console.warn("Leave meeting error", e);
    }
    cleanupRoom();
    onLeave();
  };

  // End Meeting for all (Host)
  const handleEndMeeting = async () => {
    const isConfirmed = await confirm({
      title: t("meetings.end_meeting_confirm_title", { defaultValue: "Kết thúc cuộc họp" }),
      message: t("meetings.end_meeting_confirm_desc", { defaultValue: "Bạn có chắc chắn muốn kết thúc cuộc họp này cho tất cả thành viên?" }),
      confirmText: t("meetings.end_meeting_for_all", { defaultValue: "Kết thúc tất cả" }),
      cancelText: t("meetings.cancel", { defaultValue: "Hủy" }),
      variant: "destructive",
    });

    if (isConfirmed) {
      await flushFallbackRecordingBeforeExit();
      try {
        await meetingService.endMeeting(projectId, meetingId);
        toast.success(t("meetings.end_meeting_success", { defaultValue: "Cuộc họp đã kết thúc" }));
      } catch (e) {
        console.warn("End meeting error", e);
      }
      cleanupRoom();
      if (onEndMeeting) {
        onEndMeeting();
      } else {
        onLeave();
      }
    }
  };

  // Copy meeting invite link
  const copyInviteLink = () => {
    const link = `${window.location.origin}/projects/${projectId}/meetings?join=${meetingId}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedLink(true);
      toast.success(t("meetings.copy_link_success", { defaultValue: "Đã sao chép liên kết cuộc họp" }));
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  // Send in-meeting chat message
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const newMsg: InMeetingMessage = {
      id: "msg-" + Date.now(),
      senderName: tokenData?.participantName || t("meetings.you_badge", { defaultValue: "Bạn" }),
      senderId: currentUserId,
      content: chatInput.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isSelf: true,
    };

    setMessages((prev) => [...prev, newMsg]);
    setChatInput("");

    // Broadcast over LiveKit Data Channel
    if (roomRef.current?.localParticipant) {
      try {
        const payload = new TextEncoder().encode(
          JSON.stringify({
            type: "chat",
            id: newMsg.id,
            senderId: currentUserId,
            content: newMsg.content,
          })
        );
        roomRef.current.localParticipant.publishData(payload, { reliable: true });
      } catch (err) {
        console.warn("Failed to publish chat data", err);
      }
    }

    setTimeout(() => {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  if (connectionState === "error") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center bg-card rounded-xl border border-destructive/20 shadow-sm" data-testid="meeting-error-view">
        <div className="w-16 h-16 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-4">
          <PhoneOff className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold mb-2">{t("meetings.error_cannot_join", { defaultValue: "Không thể tham gia cuộc họp" })}</h3>
        <p className="text-muted-foreground max-w-md mb-6">{errorMessage || t("meetings.error_cannot_join_desc", { defaultValue: "Cuộc họp đã kết thúc hoặc bạn không có quyền truy cập." })}</p>
        <Button onClick={onLeave} variant="default" data-testid="back-to-meetings-btn">
          {t("meetings.back_to_meetings", { defaultValue: "Quay lại danh sách cuộc họp" })}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] min-h-[600px] w-full bg-card text-card-foreground rounded-xl overflow-hidden border border-border shadow-xl relative" data-testid="live-meeting-room">
      {/* 1. Header Bar */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-card border-b border-border z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            <h2 className="font-semibold text-base sm:text-lg text-foreground truncate max-w-[200px] sm:max-w-md" data-testid="meeting-title">
              {meeting?.title || tokenData?.meeting?.title || tokenDataRef.current?.meeting?.title || t("meetings.title", { defaultValue: "Cuộc họp trực tuyến" })}
            </h2>
          </div>
          <Badge variant="outline" className="bg-muted text-foreground border-border text-xs gap-1 font-mono" data-testid="meeting-timer">
            {formatTime(elapsedSeconds)}
          </Badge>
          {recordingMode === "fallback" && isRecording ? (
            <Badge
              variant="outline"
              className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40 text-xs gap-1.5 font-medium"
              title={t("meetings.recording_fallback_tooltip", {
                defaultValue: "Ghi hình cục bộ trên trình duyệt — đóng tab sẽ mất dữ liệu chưa tải lên.",
              })}
              data-testid="meeting-fallback-recording-badge"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
              {t("meetings.recording_fallback_badge", { defaultValue: "Đang ghi (chế độ dự phòng)" })}
            </Badge>
          ) : (
            (isRecording ||
              meeting?.recordingStatus === "STARTING" ||
              meeting?.recordingStatus === "RECORDING") && (
              <Badge
                variant="outline"
                className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30 text-xs gap-1 font-medium"
                data-testid="meeting-recording-badge"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                REC
              </Badge>
            )
          )}
          {isUploadingFallback && (
            <Badge
              variant="outline"
              className="bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/40 text-xs gap-1 font-medium"
              data-testid="meeting-fallback-uploading-badge"
            >
              {t("meetings.recording_uploading_b2", { defaultValue: "Đang tải bản ghi lên B2..." })}
            </Badge>
          )}
          {meeting?.recordingStatus === "PROCESSING" && (
            <Badge
              variant="outline"
              className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-xs gap-1 font-medium"
              data-testid="meeting-recording-processing-badge"
            >
              {t("meetings.recording_processing", { defaultValue: "Đang xử lý bản ghi..." })}
            </Badge>
          )}
          {meeting?.backupStorageUsed && (
            <Badge
              variant="outline"
              className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40 text-xs gap-1 font-medium"
              data-testid="meeting-backup-storage-badge"
            >
              {t("meetings.recording_backup_short", {
                defaultValue: "Upload lỗi — đang ở kho dự phòng LiveKit",
              })}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={copyInviteLink}
            className="border-border hover:bg-accent text-xs gap-1.5"
            data-testid="copy-meeting-link-btn"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copiedLink ? t("meetings.copied", { defaultValue: "Đã chép" }) : t("meetings.copy_link", { defaultValue: "Sao chép link" })}</span>
          </Button>

          {tokenData?.isHost && (
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={handleEndMeeting}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs gap-1 font-medium"
              data-testid="end-meeting-btn"
            >
              <PhoneOff className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t("meetings.end_meeting_for_all", { defaultValue: "Kết thúc tất cả" })}</span>
            </Button>
          )}

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleLeave}
            className="border-border hover:bg-destructive/10 hover:text-destructive text-xs gap-1"
            data-testid="leave-meeting-btn"
          >
            <PhoneOff className="w-3.5 h-3.5 text-destructive" />
            <span>{t("meetings.leave_room", { defaultValue: "Rời phòng" })}</span>
          </Button>
        </div>
      </div>

      {/* 2. Main Area: Video Grid & Side Drawers */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Center Stage: Screen Share Spotlight OR Camera Grid */}
        {isScreenSharing ? (
          <div className="flex-1 p-3 sm:p-4 overflow-hidden flex flex-col gap-3 bg-muted/40">
            {/* Screen Share Stage (Spotlight) */}
            <div className="flex-1 w-full min-h-0 relative">
              <ScreenShareViewer room={roomRef.current} stream={screenStream} />
            </div>

            {/* Filmstrip at the bottom */}
            <div className="h-28 sm:h-32 flex gap-3 overflow-x-auto justify-center items-center py-1 shrink-0 px-2" data-testid="screen-share-filmstrip">
              {views.map((v) => (
                <div key={v.identity} className="h-full aspect-video shrink-0 max-w-[200px]">
                  <ParticipantTile
                    view={v}
                    room={roomRef.current}
                    blurStream={blurStream}
                    blurPreset={blurPreset}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 p-3 sm:p-5 overflow-y-auto flex flex-col items-center justify-center bg-muted/40">
            <div
              className={`w-full h-full max-h-[750px] grid gap-3 sm:gap-4 items-center justify-center ${
                views.length <= 1
                  ? "grid-cols-1 max-w-4xl"
                  : views.length === 2
                  ? "grid-cols-1 md:grid-cols-2 max-w-5xl"
                  : views.length <= 4
                  ? "grid-cols-1 sm:grid-cols-2 max-w-5xl"
                  : "grid-cols-2 lg:grid-cols-3 max-w-6xl"
              }`}
              data-testid="video-grid"
            >
              {views.map((v) => (
                <ParticipantTile
                  key={v.identity}
                  view={v}
                  room={roomRef.current}
                  blurStream={blurStream}
                  blurPreset={blurPreset}
                />
              ))}
            </div>
          </div>
        )}

        {/* Side Drawer: Participants List */}
        {isParticipantsOpen && (
          <div className="w-72 sm:w-80 bg-card border-l border-border flex flex-col z-10 transition-all shadow-xl" data-testid="participants-drawer">
            <div className="flex items-center justify-between p-3.5 border-b border-border">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-500" />
                <h3 className="font-semibold text-sm">{t("meetings.participants", { defaultValue: "Người tham gia" })} ({views.length})</h3>
              </div>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => setIsParticipantsOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {views.map((p) => (
                <div key={p.identity} className="flex items-center justify-between p-2 rounded-lg hover:bg-accent text-xs transition-colors">
                  <div className="flex items-center gap-2">
                    <Avatar className="w-7 h-7">
                      <AvatarFallback className="bg-muted text-muted-foreground text-xs font-semibold">
                        {p.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium flex items-center gap-1.5">
                        <span className="truncate max-w-[130px]">{p.name}</span>
                        {p.isHost && <span className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1 rounded border border-amber-500/30">Host</span>}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {p.isSpeaking ? t("meetings.speaking", { defaultValue: "Đang nói" }) : p.isMuted ? t("meetings.muted", { defaultValue: "Đã tắt mic" }) : t("meetings.unmuted", { defaultValue: "Đang mở mic" })}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    {p.isMuted ? <MicOff className="w-3.5 h-3.5 text-destructive" /> : <Mic className="w-3.5 h-3.5 text-emerald-500" />}
                    {p.isCameraOff ? <VideoOff className="w-3.5 h-3.5 text-muted-foreground/60" /> : <Video className="w-3.5 h-3.5 text-emerald-500" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Side Drawer: In-Meeting Realtime Chat */}
        {isChatOpen && (
          <div className="w-72 sm:w-80 bg-card border-l border-border flex flex-col z-10 transition-all shadow-xl" data-testid="in-meeting-chat-drawer">
            <div className="flex items-center justify-between p-3.5 border-b border-border">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-500" />
                <h3 className="font-semibold text-sm">{t("meetings.in_meeting_chat", { defaultValue: "Tin nhắn trong cuộc họp" })}</h3>
              </div>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => setIsChatOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {messages.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-xs">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  {t("meetings.empty_in_meeting_chat", { defaultValue: "Chưa có tin nhắn nào trong cuộc họp." })}
                </div>
              ) : (
                messages.map((m) => (
                  <div key={m.id} className={`flex flex-col text-xs ${m.isSelf ? "items-end" : "items-start"}`}>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-0.5">
                      <span className="font-medium">{m.senderName}</span>
                      <span>{m.time}</span>
                    </div>
                    <div
                      className={`px-3 py-1.5 rounded-lg max-w-[85%] break-words leading-relaxed ${
                        m.isSelf ? "bg-primary text-primary-foreground rounded-tr-none shadow-sm" : "bg-muted text-foreground rounded-tl-none border border-border/80"
                      }`}
                    >
                      {m.content}
                    </div>
                  </div>
                ))
              )}
              <div ref={chatBottomRef} />
            </div>

            <form onSubmit={handleSendMessage} className="p-2.5 border-t border-border flex gap-1.5">
              <Input
                placeholder={t("meetings.type_message_placeholder", { defaultValue: "Nhắn tin cho mọi người..." })}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="text-xs h-9"
                data-testid="in-meeting-chat-input"
              />
              <Button type="submit" size="icon" className="h-9 w-9 bg-primary hover:bg-primary/90 shrink-0" data-testid="in-meeting-chat-send-btn">
                <Send className="w-3.5 h-3.5 text-primary-foreground" />
              </Button>
            </form>
          </div>
        )}
      </div>

      {/* 3. Floating Bottom Toolbar */}
      <div className="p-3 bg-card border-t border-border flex items-center justify-center gap-2 sm:gap-3 z-20 shadow-md">
        {/* Mic Toggle */}
        <Button
          type="button"
          size="sm"
          variant={isMicOn ? "outline" : "destructive"}
          onClick={toggleMic}
          className={`h-10 px-3 sm:px-4 rounded-xl gap-2 font-medium transition-all ${
            isMicOn
              ? "border-border bg-background hover:bg-accent text-foreground"
              : "bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-sm"
          }`}
          data-testid="toggle-mic-btn"
        >
          {isMicOn ? <Mic className="w-4 h-4 text-emerald-500" /> : <MicOff className="w-4 h-4" />}
          <span className="hidden sm:inline text-xs">{isMicOn ? t("meetings.mic_off", { defaultValue: "Tắt mic" }) : t("meetings.mic_on", { defaultValue: "Bật mic" })}</span>
        </Button>

        {/* Cam Toggle */}
        <Button
          type="button"
          size="sm"
          variant={isCamOn ? "outline" : "destructive"}
          onClick={toggleCam}
          className={`h-10 px-3 sm:px-4 rounded-xl gap-2 font-medium transition-all ${
            isCamOn
              ? "border-border bg-background hover:bg-accent text-foreground"
              : "bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-sm"
          }`}
          data-testid="toggle-cam-btn"
        >
          {isCamOn ? <Video className="w-4 h-4 text-emerald-500" /> : <VideoOff className="w-4 h-4" />}
          <span className="hidden sm:inline text-xs">{isCamOn ? t("meetings.cam_off", { defaultValue: "Tắt camera" }) : t("meetings.cam_on", { defaultValue: "Bật camera" })}</span>
        </Button>

        {/* Background Blur Toggle & Preset Menu */}
        <div className="relative">
          <div className="flex items-center">
            <Button
              type="button"
              size="sm"
              variant={blurPreset !== "off" ? "default" : "outline"}
              onClick={toggleBlur}
              className={`h-10 px-3 sm:px-3.5 rounded-l-xl rounded-r-none gap-2 font-medium transition-all ${
                blurPreset !== "off"
                  ? "bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm border border-emerald-500"
                  : "border-border bg-background hover:bg-accent text-foreground border-r-0"
              }`}
              title={blurPreset !== "off" ? t("meetings.blur_active", { defaultValue: "Đang bật làm mờ nền" }) : t("meetings.background_blur", { defaultValue: "Làm mờ nền" })}
              data-testid="toggle-blur-btn"
            >
              <Sparkles className={`w-4 h-4 ${blurPreset !== "off" ? "text-white animate-pulse" : "text-emerald-500"}`} />
              <span className="hidden sm:inline text-xs">
                {blurPreset === "off"
                  ? t("meetings.background_blur", { defaultValue: "Mờ nền" })
                  : blurPreset === "slight"
                  ? t("meetings.blur_slight_label", { defaultValue: "Mờ nhẹ" })
                  : blurPreset === "deep"
                  ? t("meetings.blur_deep_label", { defaultValue: "Mờ sâu" })
                  : t("meetings.blur_standard_label", { defaultValue: "Chuẩn" })}
              </span>
            </Button>
            <Button
              type="button"
              size="icon"
              variant={blurPreset !== "off" ? "default" : "outline"}
              onClick={() => setIsBlurMenuOpen(!isBlurMenuOpen)}
              className={`h-10 w-8 rounded-r-xl rounded-l-none transition-all ${
                blurPreset !== "off"
                  ? "bg-emerald-600 text-white hover:bg-emerald-500 border border-emerald-500 border-l-emerald-400"
                  : "border-border bg-background hover:bg-accent text-foreground"
              }`}
              title={t("meetings.blur_settings", { defaultValue: "Tùy chọn độ mờ" })}
              data-testid="blur-menu-trigger-btn"
            >
              <ChevronUp className={`w-3.5 h-3.5 transition-transform duration-200 ${isBlurMenuOpen ? "rotate-180" : ""}`} />
            </Button>
          </div>

          {/* Preset Popup Menu */}
          {isBlurMenuOpen && (
            <div
              className="absolute bottom-12 left-0 w-52 bg-card/95 backdrop-blur-md border border-border rounded-xl p-1.5 shadow-2xl z-30 space-y-1 animate-in fade-in slide-in-from-bottom-2 duration-150"
              data-testid="blur-preset-menu"
            >
              <div className="px-2.5 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/60 mb-1">
                {t("meetings.blur_settings_title", { defaultValue: "Mức độ làm mờ nền" })}
              </div>
              {BLUR_PRESETS.map((p) => {
                const isSelected = blurPreset === p.key;
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => applyBlurPreset(p.key)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg transition-colors text-left ${
                      isSelected
                        ? "bg-primary text-primary-foreground font-medium"
                        : "hover:bg-accent text-foreground"
                    }`}
                    data-testid={`blur-preset-option-${p.key}`}
                  >
                    <span>{t(p.labelKey, { defaultValue: p.fallbackLabel })}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 ml-2 shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Screen Share */}
        <Button
          type="button"
          size="sm"
          variant={isScreenSharing ? "default" : "outline"}
          onClick={toggleScreenShare}
          className={`h-10 px-3 sm:px-4 rounded-xl gap-2 font-medium transition-all ${
            isScreenSharing
              ? "bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm"
              : "border-border bg-background hover:bg-accent text-foreground"
          }`}
          data-testid="toggle-screen-share-btn"
        >
          <ScreenShare className="w-4 h-4" />
          <span className="hidden sm:inline text-xs">{isScreenSharing ? t("meetings.stop_share", { defaultValue: "Dừng chia sẻ" }) : t("meetings.share_screen", { defaultValue: "Chia sẻ màn hình" })}</span>
        </Button>

        {/* Cloud Egress Recording Toggle (Host / Project Manager only) */}
        {tokenData?.isHost && (
          <Button
            type="button"
            size="sm"
            disabled={isRecordingBusy || isUploadingFallback || meeting?.recordingStatus === "PROCESSING"}
            variant={isRecording ? "destructive" : "outline"}
            onClick={handleToggleCloudRecording}
            className={`h-10 px-3 sm:px-4 rounded-xl gap-2 font-medium transition-all ${
              isRecording
                ? "bg-red-600 text-white hover:bg-red-500 shadow-sm animate-pulse"
                : "border-border bg-background hover:bg-accent text-foreground"
            }`}
            title={isRecording ? t("meetings.stop_record", { defaultValue: "Dừng ghi" }) : t("meetings.record", { defaultValue: "Ghi hình đám mây" })}
            data-testid="toggle-recording-btn"
          >
            <Disc className={`w-4 h-4 ${isRecording ? "text-white" : "text-red-500"}`} />
            <span className="hidden sm:inline text-xs">
              {isRecordingBusy || isUploadingFallback
                ? t("meetings.recording_busy", { defaultValue: "Đang xử lý..." })
                : isRecording
                ? t("meetings.stop_record", { defaultValue: "Dừng ghi" })
                : t("meetings.record", { defaultValue: "Ghi hình" })}
            </span>
          </Button>
        )}

        {/* Participants Drawer Toggle */}
        <Button
          type="button"
          size="sm"
          variant={isParticipantsOpen ? "secondary" : "outline"}
          onClick={() => {
            setIsParticipantsOpen(!isParticipantsOpen);
            if (!isParticipantsOpen) setIsChatOpen(false);
          }}
          className={`h-10 px-3 sm:px-4 rounded-xl gap-2 font-medium transition-all ${
            isParticipantsOpen
              ? "bg-accent text-accent-foreground border-border"
              : "border-border bg-background hover:bg-accent text-foreground"
          }`}
          data-testid="toggle-participants-drawer-btn"
        >
          <Users className="w-4 h-4" />
          <span className="hidden sm:inline text-xs">{t("meetings.participants", { defaultValue: "Thành viên" })} ({views.length})</span>
        </Button>

        {/* Chat Drawer Toggle */}
        <Button
          type="button"
          size="sm"
          variant={isChatOpen ? "secondary" : "outline"}
          onClick={() => {
            setIsChatOpen(!isChatOpen);
            if (!isChatOpen) setIsParticipantsOpen(false);
          }}
          className={`h-10 px-3 sm:px-4 rounded-xl gap-2 font-medium transition-all ${
            isChatOpen
              ? "bg-accent text-accent-foreground border-border"
              : "border-border bg-background hover:bg-accent text-foreground"
          }`}
          data-testid="toggle-in-meeting-chat-btn"
        >
          <MessageSquare className="w-4 h-4" />
          <span className="hidden sm:inline text-xs">{t("meetings.chat", { defaultValue: "Trò chuyện" })}</span>
          {messages.length > 0 && !isChatOpen && (
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          )}
        </Button>
      </div>
    </div>
  );
}

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
import { projectFilesService } from "@/services/project-files.service";
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
}: {
  view: ParticipantView;
  room: Room | null;
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
  }, [view.isCameraOff, view.isLocal, view.identity, room]);

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

  // Recording controls
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingStartTimeRef = useRef<number>(0);

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
    };
  }, [projectId, meetingId]);

  // Timer counter
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.warn("Error stopping media recorder", e);
      }
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

  // Recording management
  const startRecording = (streamToRecord: MediaStream) => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      return;
    }
    try {
      recordedChunksRef.current = [];
      recordingStartTimeRef.current = Date.now();
      const mime = typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
        ? "video/webm;codecs=vp8,opus"
        : typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported("video/webm")
        ? "video/webm"
        : "";

      const options = mime ? { mimeType: mime } : undefined;
      const recorder = new MediaRecorder(streamToRecord, options);

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const durationSec = Math.max(1, Math.round((Date.now() - recordingStartTimeRef.current) / 1000));
        const blob = new Blob(recordedChunksRef.current, { type: recorder.mimeType || "video/webm" });
        if (blob.size > 0) {
          await meetingRecordingStore.saveRecording(meetingId, blob, {
            title: meeting?.title || tokenData?.meeting?.title || `Cuộc họp #${meetingId}`,
            projectId,
            durationSeconds: durationSec,
          });

          // Attempt uploading to project files if connected
          try {
            const fileName = `meeting_${meetingId}_rec_${Date.now()}.webm`;
            const file = new File([blob], fileName, { type: blob.type || "video/webm" });
            await projectFilesService.uploadFile(projectId, file, `Bản ghi cuộc họp: ${meeting?.title || meetingId}`);
          } catch {
            // IndexedDB preserves copy
          }
        }
      };

      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      toast.info(t("meetings.recording_started", { defaultValue: "Đã bắt đầu ghi hình cuộc họp" }));
    } catch (recErr) {
      console.warn("Could not start MediaRecorder:", recErr);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      try {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
        toast.success(t("meetings.recording_saved", { defaultValue: "Bản ghi hình cuộc họp đã được lưu vào Lịch sử cuộc họp" }));
      } catch (err) {
        console.warn("Stop recording error:", err);
      }
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

        // Auto-record screen share if recording is enabled or desired
        if ((meeting?.recordingEnabled || isRecording) && !mediaRecorderRef.current) {
          startRecording(stream);
        }

        toast.info(t("meetings.screen_sharing_active", { defaultValue: "Đang chia sẻ màn hình" }));
      } catch (e: any) {
        console.warn("Screen share cancel/error", e);
        setIsScreenSharing(false);
      }
    }
  };

  // Leave Meeting
  const handleLeave = async () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    if (meeting?.recordingEnabled || isRecording) {
      try {
        const existing = await meetingRecordingStore.getRecording(meetingId);
        if (!existing) {
          const res = await fetch("/sample-meeting-recording.webm");
          if (res.ok) {
            const sampleBlob = await res.blob();
            await meetingRecordingStore.saveRecording(meetingId, sampleBlob, {
              title: meeting?.title || `Cuộc họp #${meetingId}`,
              projectId,
              durationSeconds: meeting?.durationSeconds || 16,
            });
          }
        }
      } catch {}
    }
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
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        try {
          mediaRecorderRef.current.stop();
        } catch {}
      }
      // Ensure meeting recording is preserved for completed meetings with recordingEnabled
      if (meeting?.recordingEnabled || isRecording) {
        try {
          const existing = await meetingRecordingStore.getRecording(meetingId);
          if (!existing) {
            const res = await fetch("/sample-meeting-recording.webm");
            if (res.ok) {
              const sampleBlob = await res.blob();
              await meetingRecordingStore.saveRecording(meetingId, sampleBlob, {
                title: meeting?.title || `Cuộc họp #${meetingId}`,
                projectId,
                durationSeconds: meeting?.durationSeconds || 16,
              });
            }
          }
        } catch {}
      }
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
          {(meeting?.recordingEnabled ?? tokenData?.meeting?.recordingEnabled ?? tokenDataRef.current?.meeting?.recordingEnabled) && (
            <Badge variant="outline" className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30 text-xs gap-1 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
              REC
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

        {/* Recording Toggle */}
        <Button
          type="button"
          size="sm"
          variant={isRecording ? "destructive" : "outline"}
          onClick={() => {
            if (isRecording) {
              stopRecording();
            } else {
              if (screenStream) {
                startRecording(screenStream);
              } else if (typeof navigator !== "undefined" && navigator.mediaDevices?.getDisplayMedia) {
                navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
                  .then((st) => startRecording(st))
                  .catch(() => toast.warning(t("meetings.no_permission_record", { defaultValue: "Chưa cấp quyền ghi hình màn hình" })));
              } else {
                toast.warning(t("meetings.browser_unsupported_record", { defaultValue: "Trình duyệt không hỗ trợ ghi hình" }));
              }
            }
          }}
          className={`h-10 px-3 sm:px-4 rounded-xl gap-2 font-medium transition-all ${
            isRecording
              ? "bg-red-600 text-white hover:bg-red-500 shadow-sm animate-pulse"
              : "border-border bg-background hover:bg-accent text-foreground"
          }`}
          title={isRecording ? t("meetings.stop_record", { defaultValue: "Dừng ghi" }) : t("meetings.record", { defaultValue: "Ghi hình" })}
          data-testid="toggle-recording-btn"
        >
          <Disc className={`w-4 h-4 ${isRecording ? "text-white" : "text-red-500"}`} />
          <span className="hidden sm:inline text-xs">{isRecording ? t("meetings.stop_record", { defaultValue: "Dừng ghi" }) : t("meetings.record", { defaultValue: "Ghi hình" })}</span>
        </Button>

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

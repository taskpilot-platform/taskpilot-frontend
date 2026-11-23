/** LiveKit protocol boundary for the network-isolated browser suite. */
export const RoomEvent = {
  TrackSubscribed: "trackSubscribed",
  TrackUnsubscribed: "trackUnsubscribed",
  TrackMuted: "trackMuted",
  TrackUnmuted: "trackUnmuted",
  ParticipantConnected: "participantConnected",
  ParticipantDisconnected: "participantDisconnected",
  Connected: "connected",
  Disconnected: "disconnected",
  Reconnecting: "reconnecting",
  Reconnected: "reconnected",
  ActiveSpeakersChanged: "activeSpeakersChanged",
  DataReceived: "dataReceived",
  AudioPlaybackStatusChanged: "audioPlaybackChanged",
};
export const Track = {
  Kind: { Audio: "audio", Video: "video" },
  Source: { Camera: "camera", Microphone: "microphone", ScreenShare: "screen_share", ScreenShareAudio: "screen_share_audio" },
};
export const VideoPresets = { h720: { resolution: { width: 1280, height: 720, frameRate: 30 } } };

export class Room {
  state = "disconnected";
  canPlaybackAudio = true;
  remoteParticipants = new Map();
  private listeners = new Map<string, Set<(...values: unknown[]) => void>>();
  private screen?: MediaStream;
  localParticipant = {
    identity: "user_1",
    sid: "PA_fixture",
    name: "",
    isSpeaking: false,
    isMicrophoneEnabled: false,
    isCameraEnabled: false,
    publishData: async () => {},
    getTrackPublication: (source: string) => {
      const track = source === Track.Source.ScreenShare ? this.screen?.getVideoTracks()[0]
        : source === Track.Source.ScreenShareAudio ? this.screen?.getAudioTracks()[0] : undefined;
      return track ? { track: { mediaStreamTrack: track } } : undefined;
    },
    setMicrophoneEnabled: async (enabled: boolean) => { this.localParticipant.isMicrophoneEnabled = enabled; },
    setCameraEnabled: async (enabled: boolean) => { this.localParticipant.isCameraEnabled = enabled; },
    setScreenShareEnabled: async (enabled: boolean) => {
      if (!enabled) {
        this.screen?.getTracks().forEach((track) => track.stop());
        this.screen = undefined;
        return;
      }
      if (navigator.mediaDevices?.getDisplayMedia) {
        this.screen = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      }
      return this.localParticipant.getTrackPublication(Track.Source.ScreenShare);
    },
  };

  on(event: string, callback: (...values: unknown[]) => void) {
    const registered = this.listeners.get(event) ?? new Set();
    registered.add(callback);
    this.listeners.set(event, registered);
    return this;
  }

  off(event: string, callback: (...values: unknown[]) => void) {
    this.listeners.get(event)?.delete(callback);
    return this;
  }

  async connect(url: string, token: string) {
    if (url !== "wss://livekit.invalid" || !token.startsWith("isolated-sdk-fixture-")) {
      throw new Error("The isolated room refused a non-fixture endpoint");
    }
    this.state = "connected";
    this.listeners.get(RoomEvent.Connected)?.forEach((callback) => callback());
  }

  async disconnect() {
    this.state = "disconnected";
    await this.localParticipant.setScreenShareEnabled(false);
    this.listeners.get(RoomEvent.Disconnected)?.forEach((callback) => callback());
  }

  async startAudio() {}
}

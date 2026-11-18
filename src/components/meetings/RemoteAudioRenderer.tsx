import { useEffect, useState } from "react";
import { RoomEvent, Track, type Room } from "livekit-client";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

export function RemoteAudioRenderer({ room }: { room: Room }) {
  const { t } = useTranslation();
  const [blocked, setBlocked] = useState(!room.canPlaybackAudio);

  useEffect(() => {
    const elements = new Map<string, { track: Track; audio: HTMLAudioElement }>();
    let active = true;
    const detach = (key: string, attached: { track: Track; audio: HTMLAudioElement }) => {
      attached.track.detach(attached.audio);
      attached.audio.remove();
      elements.delete(key);
    };
    const reconcile = () => {
      const desired = new Map<string, Track>();
      for (const participant of room.remoteParticipants.values()) {
        for (const publication of participant.audioTrackPublications.values()) {
          if (publication.isSubscribed && publication.track?.kind === Track.Kind.Audio) {
            desired.set(publication.trackSid, publication.track);
          }
        }
      }
      for (const [key, attached] of elements) {
        if (desired.get(key) !== attached.track) detach(key, attached);
      }
      for (const [key, track] of desired) {
        if (elements.has(key)) continue;
        const audio = document.createElement("audio");
        audio.autoplay = true;
        audio.hidden = true;
        document.body.appendChild(audio);
        track.attach(audio);
        elements.set(key, { track, audio });
      }
    };
    const onPlayback = () => { if (active) setBlocked(!room.canPlaybackAudio); };
    const events = [
      RoomEvent.TrackSubscribed, RoomEvent.TrackUnsubscribed, RoomEvent.ParticipantConnected,
      RoomEvent.ParticipantDisconnected, RoomEvent.Reconnected,
    ] as const;
    for (const event of events) room.on(event, reconcile);
    room.on(RoomEvent.AudioPlaybackStatusChanged, onPlayback);
    reconcile();
    onPlayback();

    return () => {
      active = false;
      for (const event of events) room.off(event, reconcile);
      room.off(RoomEvent.AudioPlaybackStatusChanged, onPlayback);
      for (const [key, attached] of elements) detach(key, attached);
    };
  }, [room]);

  return blocked && (
    <Button variant="secondary" size="sm" onClick={() => {
      void room.startAudio().then(() => setBlocked(!room.canPlaybackAudio)).catch(() => setBlocked(true));
    }}>
      {t("meetings.enable_audio", { defaultValue: "Bật âm thanh cuộc họp" })}
    </Button>
  );
}

/**
 * IndexedDB storage for meeting recordings.
 * Supports persistent local storage and instant playback of meeting screen/audio recordings.
 */

const DB_NAME = "taskpilot_recordings_db";
const STORE_NAME = "recordings";
const DB_VERSION = 1;

export interface MeetingRecordingRecord {
  meetingId: number;
  projectId?: number;
  title: string;
  blob: Blob;
  mimeType: string;
  recordedAt: string;
  durationSeconds?: number;
}

// In-memory fallback if IndexedDB is not supported or during test runs
const memoryStore = new Map<number, MeetingRecordingRecord>();

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      return reject(new Error("IndexedDB is not supported in this environment"));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "meetingId" });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export const meetingRecordingStore = {
  /**
   * Save a recorded meeting video blob.
   */
  async saveRecording(
    meetingId: number,
    blob: Blob,
    metadata: { title: string; durationSeconds?: number; projectId?: number }
  ): Promise<void> {
    const record: MeetingRecordingRecord = {
      meetingId,
      projectId: metadata.projectId,
      title: metadata.title,
      blob,
      mimeType: blob.type || "video/webm",
      recordedAt: new Date().toISOString(),
      durationSeconds: metadata.durationSeconds,
    };

    try {
      const db = await openDatabase();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(record);

        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
        tx.oncomplete = () => db.close();
      });
    } catch {
      // Fallback to in-memory store
      memoryStore.set(meetingId, record);
    }
  },

  /**
   * Retrieve a recorded meeting record.
   */
  async getRecording(meetingId: number): Promise<MeetingRecordingRecord | null> {
    try {
      const db = await openDatabase();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(meetingId);

        req.onsuccess = () => {
          resolve(req.result || null);
        };
        req.onerror = () => reject(req.error);
        tx.oncomplete = () => db.close();
      });
    } catch {
      return memoryStore.get(meetingId) || null;
    }
  },

  /**
   * Check if a recording exists for the meeting.
   */
  async hasRecording(meetingId: number): Promise<boolean> {
    const rec = await this.getRecording(meetingId);
    return Boolean(rec && rec.blob && rec.blob.size > 0);
  },

  /**
   * Delete a recording.
   */
  async deleteRecording(meetingId: number): Promise<void> {
    try {
      const db = await openDatabase();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(meetingId);

        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
        tx.oncomplete = () => db.close();
      });
    } catch {
      memoryStore.delete(meetingId);
    }
  },
};

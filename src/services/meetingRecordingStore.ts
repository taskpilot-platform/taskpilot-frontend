const databaseName = "taskpilot_recordings_db";
const recordingsStore = "recordings-v2";
const chunksStore = "recording-chunks-v2";

export interface MeetingRecordingScope {
  userId: number;
  projectId: number;
  meetingId: number;
}

export interface MeetingRecordingRecord extends MeetingRecordingScope {
  recordingId: string;
  title: string;
  mimeType: string;
  recordedAt: string;
  origin: "BROWSER" | "IMPORT";
  coverage: string;
  uploadState: "CAPTURING" | "LOCAL_ONLY" | "UPLOADING" | "READY";
  fileId?: number;
  uploadTarget?: "B2";
  durationMs?: number;
  blob?: Blob;
}

function scopeKey(scope: MeetingRecordingScope) {
  if (![scope.userId, scope.projectId, scope.meetingId].every((id) => Number.isSafeInteger(id) && id > 0)) {
    throw new Error("Invalid recording scope");
  }
  return [scope.userId, scope.projectId, scope.meetingId];
}

async function transact<T>(
  storeName: string,
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(databaseName, 2);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(recordingsStore)) {
        database.createObjectStore(recordingsStore, { keyPath: ["userId", "projectId", "meetingId", "recordingId"] });
      }
      if (!database.objectStoreNames.contains(chunksStore)) {
        database.createObjectStore(chunksStore, {
          keyPath: ["userId", "projectId", "meetingId", "recordingId", "index"],
        });
      }
    };
    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("Close other TaskPilot tabs to enable recording storage"));
  });

  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const request = run(tx.objectStore(storeName));
      tx.oncomplete = () => resolve(request.result);
      tx.onabort = () => reject(tx.error ?? request.error ?? new Error("Recording storage transaction aborted"));
    });
  } finally {
    db.close();
  }
}

function recordingKey(record: MeetingRecordingScope & { recordingId: string }) {
  return [...scopeKey(record), record.recordingId];
}

function chunkRange(record: MeetingRecordingRecord) {
  const prefix = recordingKey(record);
  return IDBKeyRange.bound([...prefix, 0], [...prefix, Number.MAX_SAFE_INTEGER]);
}

export const meetingRecordingStore = {
  save(record: MeetingRecordingRecord) {
    recordingKey(record);
    return transact(recordingsStore, "readwrite", (store) => store.put(record));
  },

  async list(scope: MeetingRecordingScope): Promise<MeetingRecordingRecord[]> {
    const prefix = scopeKey(scope);
    const range = IDBKeyRange.bound([...prefix, ""], [...prefix, "\uffff"]);
    return transact(recordingsStore, "readonly", (store) => store.getAll(range));
  },

  appendChunk(record: MeetingRecordingRecord, index: number, blob: Blob) {
    recordingKey(record);
    const { userId, projectId, meetingId, recordingId } = record;
    return transact(chunksStore, "readwrite", (store) =>
      store.put({ userId, projectId, meetingId, recordingId, index, blob })
    );
  },

  async recoverChunks(record: MeetingRecordingRecord): Promise<Blob> {
    const chunks: { blob: Blob }[] = await transact(chunksStore, "readonly", (store) =>
      store.getAll(chunkRange(record))
    );
    return new Blob(chunks.map(({ blob }) => blob), { type: record.mimeType });
  },

  clearChunks(record: MeetingRecordingRecord) {
    return transact(chunksStore, "readwrite", (store) => store.delete(chunkRange(record)));
  },
};

export interface ProjectFile {
  id: number;
  projectId: number;
  uploaderId: number;
  uploaderName: string;
  uploaderEmail?: string;
  fileName: string;
  originalName: string;
  fileSize: number;
  contentType?: string;
  storageKey: string;
  storageBucket: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectChatMessage {
  id: number;
  projectId: number;
  senderId: number;
  senderName: string;
  senderEmail?: string;
  senderAvatarUrl?: string;
  content: string;
  messageType: "TEXT" | "FILE" | "SYSTEM";
  fileId?: number;
  fileName?: string;
  createdAt: string;
}

export interface SendChatMessagePayload {
  content: string;
  messageType?: "TEXT" | "FILE" | "SYSTEM";
  fileId?: number;
}

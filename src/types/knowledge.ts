export type DocumentStatus = "UPLOADING" | "PROCESSING" | "READY" | "FAILED";

export interface ProjectDocument {
  id: number;
  projectId: number;
  originalFilename: string;
  contentType: string;
  fileSize: number;
  status: DocumentStatus;
  errorMessage: string | null;
  chunkCount: number;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

export interface ScoredChunk {
  chunkId: number;
  documentId: number;
  projectId: number;
  chunkIndex: number;
  content: string;
  similarity: number;
}

export interface SearchKnowledgeParams {
  query: string;
  limit?: number;
  minScore?: number;
}

import { api, http } from "@/lib/http";
import type { ApiResponse } from "@/types/api";
import type {
  ProjectDocument,
  ScoredChunk,
  SearchKnowledgeParams,
} from "@/types/knowledge";

export const knowledgeService = {
  /**
   * List all documents for a project with their processing status and chunk counts.
   */
  getDocuments: (projectId: number): Promise<ApiResponse<ProjectDocument[]>> =>
    api.get<ProjectDocument[]>(`/v1/projects/${projectId}/documents`),

  /**
   * Get single document details.
   */
  getDocument: (
    projectId: number,
    documentId: number
  ): Promise<ApiResponse<ProjectDocument>> =>
    api.get<ProjectDocument>(`/v1/projects/${projectId}/documents/${documentId}`),

  /**
   * Upload a document to S3 and trigger asynchronous RAG chunking and vector indexing.
   */
  uploadDocument: (
    projectId: number,
    file: File
  ): Promise<ApiResponse<ProjectDocument>> => {
    const formData = new FormData();
    formData.append("file", file);

    return http
      .post<ApiResponse<ProjectDocument>>(
        `/v1/projects/${projectId}/documents`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      )
      .then((r) => r.data);
  },

  /**
   * Delete a document, its S3 storage object, and all associated pgvector embeddings.
   */
  deleteDocument: (
    projectId: number,
    documentId: number
  ): Promise<ApiResponse<null>> =>
    api.del<null>(`/v1/projects/${projectId}/documents/${documentId}`),

  /**
   * Trigger re-ingestion / retry for a document that failed or needs re-embedding.
   */
  retryIngestion: (
    projectId: number,
    documentId: number
  ): Promise<ApiResponse<ProjectDocument>> =>
    api.post<ProjectDocument>(
      `/v1/projects/${projectId}/documents/${documentId}/retry`
    ),

  /**
   * Direct semantic search against project knowledge base using pgvector cosine similarity.
   */
  searchKnowledge: (
    projectId: number,
    params: SearchKnowledgeParams
  ): Promise<ApiResponse<ScoredChunk[]>> =>
    api.get<ScoredChunk[]>(`/v1/projects/${projectId}/documents/search`, {
      query: params.query.trim(),
      limit: params.limit ?? 5,
      minScore: params.minScore ?? 0.4,
    }),
};

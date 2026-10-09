import { api, http } from "@/lib/http";
import type { ApiResponse } from "@/types/api";
import type { ProjectFile } from "@/types/collab";

export interface PaginatedResult<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export const projectFilesService = {
  /**
   * Get paginated files for a project with optional search keyword.
   */
  getFiles: (
    projectId: number,
    keyword?: string,
    page: number = 0,
    size: number = 20
  ): Promise<ApiResponse<PaginatedResult<ProjectFile>>> =>
    api.get<PaginatedResult<ProjectFile>>(`/v1/projects/${projectId}/files`, {
      ...(keyword ? { keyword: keyword.trim() } : {}),
      page,
      size,
    }),

  /**
   * Upload a file to project storage.
   */
  uploadFile: (
    projectId: number,
    file: File,
    description?: string
  ): Promise<ApiResponse<ProjectFile>> => {
    const formData = new FormData();
    formData.append("file", file);
    if (description) {
      formData.append("description", description);
    }

    return http
      .post<ApiResponse<ProjectFile>>(
        `/v1/projects/${projectId}/files`,
        formData
      )
      .then((r) => r.data);
  },

  /**
   * Download a project file blob.
   */
  downloadFileUrl: (projectId: number, fileId: number): string =>
    `/api/v1/projects/${projectId}/files/${fileId}/download`,

  /**
   * Delete a project file (uploader or manager only).
   */
  deleteFile: (
    projectId: number,
    fileId: number
  ): Promise<ApiResponse<null>> =>
    api.del<null>(`/v1/projects/${projectId}/files/${fileId}`),
};

import { http } from "@/lib/http";
import type { ApiResponse, PaginatedResponse } from "@/types/api";
import type { CommentSearchParams, CommentSearchResult } from "@/types/comment";

function compactParams(params: CommentSearchParams) {
  return {
    page: params.page ?? 0,
    size: params.size ?? 20,
    ...(params.keyword?.trim() ? { keyword: params.keyword.trim() } : {}),
    ...(params.projectId ? { projectId: params.projectId } : {}),
    ...(params.taskId ? { taskId: params.taskId } : {}),
    ...(params.authorId ? { authorId: params.authorId } : {}),
    ...(params.mentionedMe ? { mentionedMe: true } : {}),
  };
}

export const commentService = {
  async searchComments(
    params: CommentSearchParams,
  ): Promise<ApiResponse<PaginatedResponse<CommentSearchResult>>> {
    const response = await http.get<ApiResponse<PaginatedResponse<CommentSearchResult>>>(
      "/v1/comments",
      { params: compactParams(params) },
    );
    return response.data;
  },
};

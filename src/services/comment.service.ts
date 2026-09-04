import { api } from "@/lib/http";
import type { PaginatedResponse } from "@/types/api";
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
  searchComments: (params: CommentSearchParams) =>
    api.get<PaginatedResponse<CommentSearchResult>>("/v1/comments", compactParams(params)),
};

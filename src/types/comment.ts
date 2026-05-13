import type { UserProfileLiteDto } from "@/types/task";

export interface CommentSearchResult {
  id: number;
  projectId: number | null;
  projectName: string;
  taskId: number;
  taskTitle: string;
  parentCommentId: number | null;
  author: UserProfileLiteDto;
  content: string | null;
  mentions: UserProfileLiteDto[];
  deleted: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CommentSearchParams {
  page?: number;
  size?: number;
  keyword?: string;
  projectId?: number;
  taskId?: number;
  authorId?: number;
  mentionedMe?: boolean;
}

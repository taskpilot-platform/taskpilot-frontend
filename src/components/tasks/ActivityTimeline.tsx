import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchEventSource } from "@microsoft/fetch-event-source";
import {
  AtSign,
  Loader2,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Reply,
  Send,
  Trash2,
  WifiOff,
  X,
} from "lucide-react";
import { toast } from "react-toastify";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { getApiErrorMessage } from "@/lib/http";
import { authStorage } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { taskService } from "@/services/task.service";
import type {
  TaskCommentDeletedEvent,
  TaskCommentDto,
  UserProfileLiteDto,
} from "@/types/task";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim() || "";
const MENTION_DEBOUNCE_MS = 250;
const HIGHLIGHT_DURATION_MS = 2400;
const MAX_INDENT_DEPTH = 4;

interface ActivityTimelineProps {
  taskId: number;
  currentUserId: number | null;
  isManager: boolean;
  isReadOnly: boolean;
  focusedCommentId?: number | null;
}

interface CommentEditorProps {
  taskId: number;
  submitLabel: string;
  placeholder: string;
  initialContent?: string;
  initialMentions?: UserProfileLiteDto[];
  autoFocus?: boolean;
  resetAfterSubmit?: boolean;
  onCancel?: () => void;
  onSubmit: (content: string, mentions: UserProfileLiteDto[]) => Promise<void>;
}

interface MentionToken {
  query: string;
  start: number;
  end: number;
}

interface CommentTreeNode {
  comment: TaskCommentDto;
  replies: CommentTreeNode[];
}

type ActiveEditor =
  | { type: "edit"; commentId: number }
  | { type: "reply"; commentId: number }
  | null;

function sortComments(comments: TaskCommentDto[]) {
  return [...comments].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

function upsertComment(comments: TaskCommentDto[], nextComment: TaskCommentDto) {
  const existingIndex = comments.findIndex((comment) => comment.id === nextComment.id);
  if (existingIndex === -1) {
    return sortComments([...comments, nextComment]);
  }

  const nextComments = [...comments];
  nextComments[existingIndex] = nextComment;
  return sortComments(nextComments);
}

function markCommentDeleted(comments: TaskCommentDto[], event: TaskCommentDeletedEvent) {
  const existing = comments.find((comment) => comment.id === event.commentId);
  if (!existing) {
    return comments;
  }

  return upsertComment(comments, {
    ...existing,
    parentCommentId: event.parentCommentId,
    content: null,
    mentions: [],
    deleted: true,
    deletedAt: existing.deletedAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

function buildCommentTree(comments: TaskCommentDto[]) {
  const sortedComments = sortComments(comments);
  const nodesById = new Map<number, CommentTreeNode>();
  const roots: CommentTreeNode[] = [];

  for (const comment of sortedComments) {
    nodesById.set(comment.id, { comment, replies: [] });
  }

  for (const comment of sortedComments) {
    const node = nodesById.get(comment.id);
    if (!node) {
      continue;
    }

    const parentNode = comment.parentCommentId ? nodesById.get(comment.parentCommentId) : null;
    if (parentNode) {
      parentNode.replies.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function formatTimestamp(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const timestamp = date.getTime();

  if (Number.isNaN(timestamp)) {
    return "";
  }

  const diffSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSeconds < 60) {
    return "Just now";
  }

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  return date.toLocaleString();
}

function findMentionToken(value: string, caretPosition: number): MentionToken | null {
  const beforeCaret = value.slice(0, caretPosition);
  const match = /(^|\s)@([^\s@]*)$/.exec(beforeCaret);

  if (!match) {
    return null;
  }

  const query = match[2] ?? "";
  return {
    query,
    start: caretPosition - query.length - 1,
    end: caretPosition,
  };
}

function isSameUser(left: UserProfileLiteDto, right: UserProfileLiteDto) {
  return left.id === right.id;
}

function CommentEditor({
  taskId,
  submitLabel,
  placeholder,
  initialContent = "",
  initialMentions = [],
  autoFocus = false,
  resetAfterSubmit = false,
  onCancel,
  onSubmit,
}: CommentEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [content, setContent] = useState(initialContent);
  const [selectedMentions, setSelectedMentions] = useState<UserProfileLiteDto[]>(initialMentions);
  const [mentionToken, setMentionToken] = useState<MentionToken | null>(null);
  const [mentionCandidates, setMentionCandidates] = useState<UserProfileLiteDto[]>([]);
  const [isLoadingMentions, setIsLoadingMentions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (autoFocus) {
      textareaRef.current?.focus();
    }
  }, [autoFocus]);

  useEffect(() => {
    if (!mentionToken) {
      setMentionCandidates([]);
      setIsLoadingMentions(false);
      return;
    }

    let isActive = true;
    const timeoutId = window.setTimeout(async () => {
      setIsLoadingMentions(true);
      try {
        const response = await taskService.getCommentMentionCandidates(taskId, mentionToken.query);
        if (isActive) {
          setMentionCandidates(response.data);
        }
      } catch (error) {
        if (isActive) {
          setMentionCandidates([]);
          console.error("Failed to load mention candidates", error);
        }
      } finally {
        if (isActive) {
          setIsLoadingMentions(false);
        }
      }
    }, MENTION_DEBOUNCE_MS);

    return () => {
      isActive = false;
      window.clearTimeout(timeoutId);
    };
  }, [mentionToken, taskId]);

  const updateMentionToken = (value: string, caretPosition: number) => {
    setMentionToken(findMentionToken(value, caretPosition));
  };

  const handleContentChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextContent = event.target.value;
    setContent(nextContent);
    updateMentionToken(nextContent, event.target.selectionStart);
  };

  const handleCursorMove = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      updateMentionToken(content, textarea.selectionStart);
    }
  };

  const handleMentionSelect = (profile: UserProfileLiteDto) => {
    if (!mentionToken) {
      return;
    }

    const mentionText = `@${profile.fullName}`;
    const nextContent =
      content.slice(0, mentionToken.start) +
      mentionText +
      " " +
      content.slice(mentionToken.end);
    const nextCaretPosition = mentionToken.start + mentionText.length + 1;

    setContent(nextContent);
    setMentionToken(null);
    setMentionCandidates([]);
    setSelectedMentions((current) =>
      current.some((mention) => isSameUser(mention, profile)) ? current : [...current, profile],
    );

    window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(nextCaretPosition, nextCaretPosition);
    });
  };

  const removeMention = (profileId: number) => {
    setSelectedMentions((current) => current.filter((mention) => mention.id !== profileId));
  };

  const handleSubmit = async () => {
    const trimmedContent = content.trim();
    if (!trimmedContent || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(trimmedContent, selectedMentions);
      if (resetAfterSubmit) {
        setContent("");
        setSelectedMentions([]);
        setMentionToken(null);
        setMentionCandidates([]);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const showMentionList = mentionToken !== null;

  return (
    <div className="relative space-y-3">
      <Textarea
        ref={textareaRef}
        value={content}
        placeholder={placeholder}
        className="min-h-[92px] resize-none bg-background text-sm"
        onChange={handleContentChange}
        onClick={handleCursorMove}
        onKeyUp={handleCursorMove}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setMentionToken(null);
          }
        }}
      />

      {showMentionList && (
        <div className="absolute left-0 right-0 top-[92px] z-20 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md">
          <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-muted-foreground">
            <AtSign className="h-3.5 w-3.5" />
            Mention a project member
          </div>
          <div className="max-h-48 overflow-y-auto">
            {isLoadingMentions ? (
              <div className="flex items-center gap-2 px-2 py-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </div>
            ) : mentionCandidates.length > 0 ? (
              mentionCandidates.map((profile) => (
                <button
                  key={profile.id}
                  type="button"
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    handleMentionSelect(profile);
                  }}
                >
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="text-[10px] font-semibold">
                      {getInitials(profile.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate">{profile.fullName}</span>
                </button>
              ))
            ) : (
              <div className="px-2 py-2 text-sm text-muted-foreground">No matches</div>
            )}
          </div>
        </div>
      )}

      {selectedMentions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedMentions.map((mention) => (
            <Badge key={mention.id} variant="secondary" className="gap-1 rounded-full px-2 py-1">
              @{mention.fullName}
              <button
                type="button"
                className="rounded-full text-muted-foreground hover:text-foreground"
                onClick={() => removeMention(mention.id)}
                aria-label={`Remove ${mention.fullName}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <div className="flex items-center justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        )}
        <Button type="button" size="sm" onClick={handleSubmit} disabled={!content.trim() || isSubmitting}>
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}

interface CommentThreadItemProps {
  node: CommentTreeNode;
  depth: number;
  taskId: number;
  currentUserId: number | null;
  isManager: boolean;
  isReadOnly: boolean;
  activeEditor: ActiveEditor;
  highlightedCommentId: number | null;
  registerCommentRef: (commentId: number, element: HTMLDivElement | null) => void;
  onStartEdit: (commentId: number) => void;
  onStartReply: (commentId: number) => void;
  onCancelEditor: () => void;
  onUpdate: (commentId: number, content: string, mentions: UserProfileLiteDto[]) => Promise<void>;
  onReply: (parentCommentId: number, content: string, mentions: UserProfileLiteDto[]) => Promise<void>;
  onDelete: (commentId: number) => Promise<void>;
}

function CommentThreadItem({
  node,
  depth,
  taskId,
  currentUserId,
  isManager,
  isReadOnly,
  activeEditor,
  highlightedCommentId,
  registerCommentRef,
  onStartEdit,
  onStartReply,
  onCancelEditor,
  onUpdate,
  onReply,
  onDelete,
}: CommentThreadItemProps) {
  const { comment, replies } = node;
  const isDeleted = comment.deleted;
  const isAuthor = currentUserId === comment.author.id;
  const canEdit = !isReadOnly && !isDeleted && isAuthor;
  const canDelete = !isReadOnly && !isDeleted && (isAuthor || isManager);
  const canReply = !isReadOnly && !isDeleted;
  const showActions = canEdit || canDelete;
  const isEdited = !isDeleted && comment.updatedAt !== comment.createdAt;
  const isEditing = activeEditor?.type === "edit" && activeEditor.commentId === comment.id;
  const isReplying = activeEditor?.type === "reply" && activeEditor.commentId === comment.id;
  const indent = depth > 0 ? Math.min(depth, MAX_INDENT_DEPTH) * 16 : 0;

  return (
    <div className={depth === 0 ? "pt-4 first:pt-0" : "pt-3"}>
      <div
        id={`comment-${comment.id}`}
        ref={(element) => registerCommentRef(comment.id, element)}
        className={cn(
          "rounded-lg transition-colors duration-500",
          highlightedCommentId === comment.id && "bg-primary/10 ring-1 ring-primary/30",
          depth > 0 && "border-l border-border/60 pl-3",
        )}
        style={{ marginLeft: indent }}
      >
        <div className="flex gap-3 px-2 py-3">
          <Avatar className={cn("h-9 w-9 border border-border/60", isDeleted && "opacity-60")}>
            <AvatarFallback className="text-xs font-semibold">
              {getInitials(comment.author.fullName)}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span
                    className={cn(
                      "truncate text-sm font-semibold text-foreground",
                      isDeleted && "text-muted-foreground",
                    )}
                  >
                    {comment.author.fullName}
                  </span>
                  <span className="text-xs text-muted-foreground">{formatTimestamp(comment.createdAt)}</span>
                  {isEdited && <span className="text-xs text-muted-foreground">(edited)</span>}
                  {isDeleted && comment.deletedAt && (
                    <span className="text-xs text-muted-foreground">
                      deleted {formatTimestamp(comment.deletedAt)}
                    </span>
                  )}
                </div>
              </div>

              {showActions && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Comment actions</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {canEdit && (
                      <DropdownMenuItem onClick={() => onStartEdit(comment.id)}>
                        <Pencil className="h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                    )}
                    {canDelete && (
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => {
                          void onDelete(comment.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {isEditing ? (
              <div className="mt-3">
                <CommentEditor
                  taskId={taskId}
                  submitLabel="Save"
                  placeholder="Write a comment..."
                  initialContent={comment.content ?? ""}
                  initialMentions={comment.mentions}
                  autoFocus
                  onCancel={onCancelEditor}
                  onSubmit={(content, mentions) => onUpdate(comment.id, content, mentions)}
                />
              </div>
            ) : (
              <>
                <div
                  className={cn(
                    "mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/90",
                    isDeleted && "italic text-muted-foreground",
                  )}
                >
                  {isDeleted ? "Deleted comment" : comment.content}
                </div>
                {!isDeleted && comment.mentions.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {comment.mentions.map((mention) => (
                      <Badge key={mention.id} variant="outline" className="rounded-full text-[11px]">
                        @{mention.fullName}
                      </Badge>
                    ))}
                  </div>
                )}
              </>
            )}

            {canReply && !isEditing && (
              <div className="mt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => onStartReply(comment.id)}
                >
                  <Reply className="h-3.5 w-3.5" />
                  Reply
                </Button>
              </div>
            )}

            {isReplying && (
              <div className="mt-3 rounded-lg border border-border/50 bg-muted/5 p-3">
                <CommentEditor
                  taskId={taskId}
                  submitLabel="Reply"
                  placeholder={`Reply to ${comment.author.fullName}...`}
                  autoFocus
                  onCancel={onCancelEditor}
                  onSubmit={(content, mentions) => onReply(comment.id, content, mentions)}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {replies.length > 0 && (
        <div className="space-y-1">
          {replies.map((reply) => (
            <CommentThreadItem
              key={reply.comment.id}
              node={reply}
              depth={depth + 1}
              taskId={taskId}
              currentUserId={currentUserId}
              isManager={isManager}
              isReadOnly={isReadOnly}
              activeEditor={activeEditor}
              highlightedCommentId={highlightedCommentId}
              registerCommentRef={registerCommentRef}
              onStartEdit={onStartEdit}
              onStartReply={onStartReply}
              onCancelEditor={onCancelEditor}
              onUpdate={onUpdate}
              onReply={onReply}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function ActivityTimeline({
  taskId,
  currentUserId,
  isManager,
  isReadOnly,
  focusedCommentId,
}: ActivityTimelineProps) {
  const commentRefs = useRef(new Map<number, HTMLDivElement>());
  const [comments, setComments] = useState<TaskCommentDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeEditor, setActiveEditor] = useState<ActiveEditor>(null);
  const [highlightedCommentId, setHighlightedCommentId] = useState<number | null>(null);

  const commentTree = useMemo(() => buildCommentTree(comments), [comments]);
  const activeCommentCount = useMemo(
    () => comments.filter((comment) => !comment.deleted).length,
    [comments],
  );

  const registerCommentRef = useCallback((commentId: number, element: HTMLDivElement | null) => {
    if (element) {
      commentRefs.current.set(commentId, element);
    } else {
      commentRefs.current.delete(commentId);
    }
  }, []);

  const loadComments = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const response = await taskService.getTaskComments(taskId);
      setComments(sortComments(response.data));
    } catch (error) {
      setLoadError(getApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    void loadComments();
  }, [loadComments]);

  useEffect(() => {
    if (!focusedCommentId || comments.length === 0) {
      return;
    }

    const targetExists = comments.some((comment) => comment.id === focusedCommentId);
    if (!targetExists) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const target = commentRefs.current.get(focusedCommentId);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        setHighlightedCommentId(focusedCommentId);
      }
    }, 120);

    const clearTimeoutId = window.setTimeout(() => {
      setHighlightedCommentId((current) => (current === focusedCommentId ? null : current));
    }, HIGHLIGHT_DURATION_MS);

    return () => {
      window.clearTimeout(timeoutId);
      window.clearTimeout(clearTimeoutId);
    };
  }, [comments, focusedCommentId]);

  useEffect(() => {
    const accessToken = authStorage.getAccessToken();
    if (!accessToken) {
      return;
    }

    const controller = new AbortController();

    void fetchEventSource(`${API_BASE_URL}/v1/tasks/${taskId}/comments/stream`, {
      signal: controller.signal,
      openWhenHidden: true,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "text/event-stream",
      },
      async onopen(response) {
        if (response.status === 401) {
          authStorage.clear();
          window.location.href = "/login";
          throw new Error("Unauthorized");
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("text/event-stream")) {
          throw new Error("Invalid SSE response");
        }
      },
      onmessage(event) {
        try {
          if (event.event === "comment.created" || event.event === "comment.updated") {
            const nextComment = JSON.parse(event.data) as TaskCommentDto;
            if (nextComment.taskId === taskId) {
              setComments((current) => upsertComment(current, nextComment));
            }
          }

          if (event.event === "comment.deleted") {
            const deletedComment = JSON.parse(event.data) as TaskCommentDeletedEvent;
            if (deletedComment.taskId === taskId) {
              setComments((current) => markCommentDeleted(current, deletedComment));
              setActiveEditor((current) =>
                current?.commentId === deletedComment.commentId ? null : current,
              );
            }
          }
        } catch (error) {
          console.error("Failed to process comment event", error);
        }
      },
      onerror(error) {
        throw error;
      },
    }).catch((error) => {
      const isAbortError = error instanceof DOMException && error.name === "AbortError";
      if (!controller.signal.aborted && !isAbortError) {
        console.error("Comment stream disconnected", error);
      }
    });

    return () => {
      controller.abort();
    };
  }, [taskId]);

  const handleCreateComment = async (
    content: string,
    mentions: UserProfileLiteDto[],
    parentCommentId: number | null,
  ) => {
    if (isReadOnly) {
      return;
    }

    try {
      const response = await taskService.createTaskComment(taskId, {
        content,
        parentCommentId,
        mentionedUserIds: mentions.map((mention) => mention.id),
      });
      setComments((current) => upsertComment(current, response.data));
      if (parentCommentId !== null) {
        setActiveEditor(null);
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error));
      throw error;
    }
  };

  const handleUpdateComment = async (
    commentId: number,
    content: string,
    mentions: UserProfileLiteDto[],
  ) => {
    try {
      const response = await taskService.updateTaskComment(taskId, commentId, {
        content,
        mentionedUserIds: mentions.map((mention) => mention.id),
      });
      setComments((current) => upsertComment(current, response.data));
      setActiveEditor(null);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
      throw error;
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!window.confirm("Delete this comment?")) {
      return;
    }

    try {
      const response = await taskService.deleteTaskComment(taskId, commentId);
      setComments((current) => upsertComment(current, response.data));
      setActiveEditor((current) => (current?.commentId === commentId ? null : current));
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  return (
    <div className="space-y-5 pt-8 mt-8 border-t border-border/40">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <MessageSquare className="h-4 w-4" />
          Comments
        </h3>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {activeCommentCount}
        </span>
      </div>

      {!isReadOnly && (
        <div className="rounded-lg border border-border/50 bg-muted/5 p-3">
          <CommentEditor
            taskId={taskId}
            submitLabel="Send"
            placeholder="Write a comment..."
            resetAfterSubmit
            onSubmit={(content, mentions) => handleCreateComment(content, mentions, null)}
          />
        </div>
      )}

      {isReadOnly && (
        <div className="rounded-lg border border-border/50 bg-muted/10 px-3 py-2 text-xs text-muted-foreground">
          This project is archived. Comments are read-only.
        </div>
      )}

      <div className="rounded-lg border border-border/40 bg-background/60">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading comments...
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
            <WifiOff className="h-8 w-8 text-muted-foreground/40" />
            <div>
              <p className="text-sm font-medium text-foreground">Unable to load comments</p>
              <p className="mt-1 text-xs text-muted-foreground">{loadError}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => void loadComments()}>
              Retry
            </Button>
          </div>
        ) : comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <MessageSquare className="mb-3 h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm font-medium text-foreground/80">No comments yet</p>
          </div>
        ) : (
          <div className="space-y-1 p-3">
            {commentTree.map((node) => (
              <CommentThreadItem
                key={node.comment.id}
                node={node}
                depth={0}
                taskId={taskId}
                currentUserId={currentUserId}
                isManager={isManager}
                isReadOnly={isReadOnly}
                activeEditor={activeEditor}
                highlightedCommentId={highlightedCommentId}
                registerCommentRef={registerCommentRef}
                onStartEdit={(commentId) => setActiveEditor({ type: "edit", commentId })}
                onStartReply={(commentId) => setActiveEditor({ type: "reply", commentId })}
                onCancelEditor={() => setActiveEditor(null)}
                onUpdate={handleUpdateComment}
                onReply={(parentCommentId, content, mentions) =>
                  handleCreateComment(content, mentions, parentCommentId)
                }
                onDelete={handleDeleteComment}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

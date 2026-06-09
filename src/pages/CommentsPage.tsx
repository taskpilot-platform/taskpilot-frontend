import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  AtSign,
  Filter,
  FolderKanban,
  ListChecks,
  Loader2,
  MessageSquare,
  Reply,
  Search,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import { UserAvatar } from "@/components/ui/user-avatar";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getApiErrorMessage } from "@/lib/http";
import { commentService } from "@/services/comment.service";
import { projectService } from "@/services/project.service";
import type { CommentSearchParams, CommentSearchResult } from "@/types/comment";
import type { MyProject } from "@/types/project";

const PAGE_SIZE = 20;

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString();
}

function parsePositiveInteger(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const parsed = Number(trimmed);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function mergeById(current: CommentSearchResult[], incoming: CommentSearchResult[]) {
  const byId = new Map<number, CommentSearchResult>();
  for (const item of current) {
    byId.set(item.id, item);
  }
  for (const item of incoming) {
    byId.set(item.id, item);
  }
  return Array.from(byId.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

interface CommentResultItemProps {
  item: CommentSearchResult;
  onOpen: (item: CommentSearchResult) => void;
}

function CommentResultItem({ item, onOpen }: CommentResultItemProps) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      className="w-full rounded-lg border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-accent/20"
      onClick={() => onOpen(item)}
    >
      <div className="flex items-start gap-3">
        <UserAvatar
          avatarUrl={item.author.avatarUrl}
          name={item.author.fullName}
          className="h-9 w-9 border border-border/60"
        />

        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{item.author.fullName}</span>
                {item.parentCommentId && (
                  <Badge variant="secondary" className="gap-1">
                    <Reply className="h-3 w-3" />
                    {t("comments.reply", { defaultValue: "Reply" })}
                  </Badge>
                )}
                {item.deleted && <Badge variant="outline">{t("comments.deleted", { defaultValue: "Deleted" })}</Badge>}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <FolderKanban className="h-3.5 w-3.5" />
                  {item.projectName}
                </span>
                <span className="inline-flex items-center gap-1">
                  <ListChecks className="h-3.5 w-3.5" />
                  TP-{item.taskId}: {item.taskTitle}
                </span>
              </div>
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">{formatTimestamp(item.createdAt)}</span>
          </div>

          <p className={`line-clamp-3 whitespace-pre-wrap text-sm leading-relaxed ${
            item.deleted ? "italic text-muted-foreground" : "text-foreground/90"
          }`}
          >
            {item.deleted ? t("comments.deleted_content", { defaultValue: "Deleted comment" }) : item.content}
          </p>

          {!item.deleted && item.mentions.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {item.mentions.map((mention) => (
                <Badge key={mention.id} variant="outline" className="rounded-full text-[11px]">
                  @{mention.fullName}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

export default function CommentsPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [projects, setProjects] = useState<MyProject[]>([]);
  const [comments, setComments] = useState<CommentSearchResult[]>([]);
  const [keyword, setKeyword] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [taskIdInput, setTaskIdInput] = useState("");
  const [authorIdInput, setAuthorIdInput] = useState("");
  const [mentionedMe, setMentionedMe] = useState(false);
  const [page, setPage] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const filters = useMemo<CommentSearchParams>(() => ({
    keyword,
    projectId: selectedProjectId === "all" ? undefined : Number(selectedProjectId),
    taskId: parsePositiveInteger(taskIdInput),
    authorId: parsePositiveInteger(authorIdInput),
    mentionedMe,
  }), [authorIdInput, keyword, mentionedMe, selectedProjectId, taskIdInput]);

  const loadComments = useCallback(async (targetPage: number, append = false) => {
    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }

    try {
      const response = await commentService.searchComments({
        ...filters,
        page: targetPage,
        size: PAGE_SIZE,
      });
      const pageData = response.data;
      const incoming = pageData.content ?? [];
      setComments((current) => (append ? mergeById(current, incoming) : incoming));
      setPage(pageData.number);
      setTotalElements(pageData.totalElements);
      setTotalPages(pageData.totalPages);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [filters]);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const response = await projectService.getMyProjects(0, 100);
        setProjects(response.data.content);
      } catch (error) {
        console.error("Failed to load project filter options", error);
      }
    };

    void loadProjects();
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadComments(0, false);
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [loadComments]);

  const resetFilters = () => {
    setKeyword("");
    setSelectedProjectId("all");
    setTaskIdInput("");
    setAuthorIdInput("");
    setMentionedMe(false);
  };

  const openComment = (item: CommentSearchResult) => {
    navigate(`/tasks?taskId=${item.taskId}&commentId=${item.id}`);
  };

  const hasNextPage = page + 1 < totalPages;

  return (
    <div className="min-h-screen space-y-6 p-6 md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            <MessageSquare className="h-7 w-7 text-primary" />
            {t("comments.title", { defaultValue: "Comments" })}
          </h1>
          <p className="text-muted-foreground">
            {t("comments.desc", { defaultValue: "Search and review task comments across projects you can access." })}
          </p>
        </div>
        <Badge variant="secondary" className="w-fit">
          {totalElements} {t("comments.total", { defaultValue: "total" })}
        </Badge>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_220px_150px_150px_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder={t("comments.search_placeholder", { defaultValue: "Search comments, tasks, projects, authors..." })}
              className="pl-9"
            />
          </div>

          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger>
              <SelectValue placeholder="Project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("comments.all_projects", { defaultValue: "All projects" })}</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id.toString()}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            value={taskIdInput}
            onChange={(event) => setTaskIdInput(event.target.value)}
            inputMode="numeric"
            placeholder={t("comments.task_id", { defaultValue: "Task ID" })}
          />

          <Input
            value={authorIdInput}
            onChange={(event) => setAuthorIdInput(event.target.value)}
            inputMode="numeric"
            placeholder={t("comments.author_id", { defaultValue: "Author ID" })}
          />

          <Button variant="outline" className="gap-2" onClick={resetFilters}>
            <X className="h-4 w-4" />
            {t("comments.reset", { defaultValue: "Reset" })}
          </Button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="mentioned-me"
              checked={mentionedMe}
              onCheckedChange={(checked) => setMentionedMe(checked === true)}
            />
            <Label htmlFor="mentioned-me" className="flex cursor-pointer items-center gap-1.5 text-sm">
              <AtSign className="h-3.5 w-3.5" />
              {t("comments.mentioned_me", { defaultValue: "Mentioned me" })}
            </Label>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Filter className="h-3.5 w-3.5" />
            {t("comments.info_text", { defaultValue: "Results open the original task and focus the selected comment." })}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 rounded-lg border bg-card p-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("comments.loading", { defaultValue: "Loading comments..." })}
        </div>
      ) : comments.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-card p-10 text-center">
          <MessageSquare className="mb-3 h-9 w-9 text-muted-foreground/40" />
          <p className="font-medium">{t("comments.empty_title", { defaultValue: "No comments found" })}</p>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            {t("comments.empty_desc", { defaultValue: "Adjust the filters or search text to find comments across your projects." })}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map((item) => (
            <CommentResultItem key={item.id} item={item} onOpen={openComment} />
          ))}
        </div>
      )}

      {!isLoading && hasNextPage && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => void loadComments(page + 1, true)}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
            {t("comments.load_more", { defaultValue: "Load more" })}
          </Button>
        </div>
      )}

      {!isLoading && comments.length > 0 && (
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <UserRound className="h-3.5 w-3.5" />
          {t("comments.showing", { count: comments.length, total: totalElements, defaultValue: "Showing {{count}} of {{total}} comments" })}
        </div>
      )}
    </div>
  );
}

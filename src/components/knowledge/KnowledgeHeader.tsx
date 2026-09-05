import React from "react";
import { BookOpen, RefreshCw, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ProjectDocument } from "@/types/knowledge";

interface KnowledgeHeaderProps {
  documents: ProjectDocument[];
  isRefreshing: boolean;
  isPolling: boolean;
  onRefresh: () => void;
}

export const KnowledgeHeader: React.FC<KnowledgeHeaderProps> = ({
  documents,
  isRefreshing,
  isPolling,
  onRefresh,
}) => {
  const readyCount = documents.filter((d) => d.status === "READY").length;
  const processingCount = documents.filter(
    (d) => d.status === "PROCESSING" || d.status === "UPLOADING"
  ).length;
  const failedCount = documents.filter((d) => d.status === "FAILED").length;
  const totalChunks = documents.reduce(
    (acc, d) => acc + (d.chunkCount || 0),
    0
  );

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-border/60">
      <div className="space-y-1">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <BookOpen className="h-5 w-5" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Kho Tri Thức Dự Án (Project Knowledge & RAG)
          </h2>
        </div>
        <p className="text-xs text-muted-foreground max-w-2xl">
          Hệ thống lưu trữ tài liệu dự án trên S3, trích xuất và phân đoạn văn bản, tạo vector embedding 768 chiều vào PostgreSQL pgvector phục vụ hỏi đáp thông minh qua AI Copilot.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Statistics Badges */}
        <div className="flex items-center gap-1.5 text-xs">
          <Badge variant="outline" className="font-mono bg-muted/30">
            {documents.length} tài liệu
          </Badge>
          {totalChunks > 0 && (
            <Badge variant="secondary" className="font-mono gap-1 text-primary">
              <Layers className="h-3 w-3" />
              {totalChunks} chunks
            </Badge>
          )}
          {processingCount > 0 && (
            <Badge
              variant="outline"
              className="font-mono border-blue-500/40 text-blue-600 bg-blue-50 dark:bg-blue-950/30 animate-pulse"
            >
              {processingCount} đang xử lý
            </Badge>
          )}
          {failedCount > 0 && (
            <Badge
              variant="outline"
              className="font-mono border-rose-500/40 text-rose-600 bg-rose-50 dark:bg-rose-950/30"
            >
              {failedCount} lỗi
            </Badge>
          )}
          {readyCount > 0 && processingCount === 0 && failedCount === 0 && (
            <Badge
              variant="outline"
              className="font-mono border-emerald-500/40 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30"
            >
              {readyCount} sẵn sàng
            </Badge>
          )}
        </div>

        {/* Refresh button */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="h-8 gap-1.5 text-xs shadow-sm"
          title="Làm mới danh sách tài liệu"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${
              isRefreshing || isPolling ? "animate-spin text-primary" : ""
            }`}
          />
          <span className="hidden sm:inline">Làm mới</span>
        </Button>
      </div>
    </div>
  );
};

import React from "react";
import {
  FileText,
  FileCode,
  FileSpreadsheet,
  File,
  RotateCw,
  Trash2,
  AlertCircle,
  Layers,
  Calendar,
  HardDrive,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DocumentStatusBadge } from "./DocumentStatusBadge";
import type { ProjectDocument } from "@/types/knowledge";

interface DocumentListItemProps {
  document: ProjectDocument;
  isArchived?: boolean;
  isRetrying: boolean;
  isDeleting: boolean;
  onRetry: (doc: ProjectDocument) => void;
  onDeleteRequest: (doc: ProjectDocument) => void;
}

function getFileIcon(filename: string) {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".pdf")) {
    return <FileText className="h-5 w-5 text-rose-500" />;
  }
  if (lower.endsWith(".docx") || lower.endsWith(".doc")) {
    return <FileText className="h-5 w-5 text-blue-500" />;
  }
  if (lower.endsWith(".csv")) {
    return <FileSpreadsheet className="h-5 w-5 text-emerald-500" />;
  }
  if (lower.endsWith(".md") || lower.endsWith(".txt")) {
    return <FileCode className="h-5 w-5 text-purple-500" />;
  }
  return <File className="h-5 w-5 text-muted-foreground" />;
}

function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

export const DocumentListItem: React.FC<DocumentListItemProps> = ({
  document,
  isArchived = false,
  isRetrying,
  isDeleting,
  onRetry,
  onDeleteRequest,
}) => {
  return (
    <div className="group flex flex-col gap-3 rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-sm">
      <div className="flex items-start justify-between gap-4">
        {/* File icon + Name & Metadata */}
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted/60 border border-muted">
            {getFileIcon(document.originalFilename)}
          </div>

          <div className="min-w-0 flex-1">
            <h4
              className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors"
              title={document.originalFilename}
            >
              {document.originalFilename}
            </h4>

            {/* Metadata badges */}
            <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <HardDrive className="h-3.5 w-3.5 text-muted-foreground/70" />
                {formatFileSize(document.fileSize)}
              </span>

              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground/70" />
                {formatDate(document.createdAt)}
              </span>

              {document.status === "READY" && (
                <span className="inline-flex items-center gap-1 text-primary font-medium">
                  <Layers className="h-3.5 w-3.5" />
                  {document.chunkCount || 0} chunks
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Status + Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <DocumentStatusBadge status={document.status} />

          {document.status === "FAILED" && !isArchived && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onRetry(document)}
              disabled={isRetrying || isDeleting}
              className="h-8 gap-1.5 text-xs text-amber-600 border-amber-500/30 hover:bg-amber-500/10 hover:text-amber-700 dark:text-amber-400"
              title="Thử lập chỉ mục lại"
            >
              <RotateCw
                className={`h-3.5 w-3.5 ${isRetrying ? "animate-spin" : ""}`}
              />
              <span>Thử lại</span>
            </Button>
          )}

          {!isArchived && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onDeleteRequest(document)}
              disabled={isDeleting || isRetrying}
              className="h-8 w-8 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 transition-colors"
              title="Xóa tài liệu"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Error message box if FAILED */}
      {document.status === "FAILED" && document.errorMessage && (
        <div className="flex items-start gap-2 rounded-md bg-rose-50/70 dark:bg-rose-950/30 border border-rose-500/20 p-2.5 text-xs text-rose-700 dark:text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
          <div className="flex-1 break-words">
            <span className="font-semibold">Chi tiết lỗi: </span>
            <span>{document.errorMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
};

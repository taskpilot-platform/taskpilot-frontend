import React, { useRef } from "react";
import {
  UploadCloud,
  FileCheck,
  X,
  Loader2,
  HardDrive,
  Info,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useDocumentUpload,
  SUPPORTED_EXTENSIONS,
} from "@/hooks/useDocumentUpload";
import type { ProjectDocument } from "@/types/knowledge";

interface DocumentUploadCardProps {
  projectId: number;
  isArchived?: boolean;
  onUploadSuccess?: (doc: ProjectDocument) => void;
}

function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export const DocumentUploadCard: React.FC<DocumentUploadCardProps> = ({
  projectId,
  isArchived = false,
  onUploadSuccess,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    isUploading,
    isDragging,
    selectedFile,
    validationError,
    selectFile,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    uploadSelectedFile,
    clearSelection,
  } = useDocumentUpload(projectId, onUploadSuccess);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      selectFile(e.target.files[0]);
    }
    // Reset file input value so selecting the same file triggers change
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Card className="shadow-sm border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <UploadCloud className="h-5 w-5 text-primary" />
          Tải Lên Tài Liệu Dự Án
        </CardTitle>
        <CardDescription className="text-xs">
          Tài liệu được tự động tải lên Supabase S3, trích xuất văn bản qua Apache Tika, chia nhỏ 700/100 ký tự và nhúng vector 768 chiều bằng mô hình Gemini canonical.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Drop zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isArchived && !isUploading && fileInputRef.current?.click()}
          className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-all ${
            isDragging
              ? "border-primary bg-primary/5 scale-[0.99]"
              : "border-border hover:border-primary/50 hover:bg-muted/30"
          } ${isArchived || isUploading ? "opacity-60 cursor-not-allowed pointer-events-none" : ""}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.doc,.txt,.md,.csv"
            onChange={handleFileInputChange}
            className="hidden"
            disabled={isArchived || isUploading}
          />

          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
            <UploadCloud className="h-6 w-6" />
          </div>

          <div className="text-sm font-medium text-foreground">
            Kéo thả tệp vào đây hoặc{" "}
            <span className="text-primary hover:underline">chọn từ thiết bị</span>
          </div>

          {/* Supported format tags */}
          <div className="mt-2.5 flex flex-wrap items-center justify-center gap-1.5">
            {SUPPORTED_EXTENSIONS.map((ext) => (
              <Badge
                key={ext}
                variant="secondary"
                className="text-[10px] font-mono uppercase px-1.5 py-0"
              >
                {ext.replace(".", "")}
              </Badge>
            ))}
            <span className="text-[11px] text-muted-foreground ml-1.5 inline-flex items-center gap-1">
              <HardDrive className="h-3 w-3" /> Tối đa 25MB
            </span>
          </div>
        </div>

        {/* Selected File Box */}
        {selectedFile && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <FileCheck className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-foreground truncate" title={selectedFile.name}>
                  {selectedFile.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatFileSize(selectedFile.size)}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  void uploadSelectedFile();
                }}
                disabled={isUploading}
                className="h-8 gap-1.5 text-xs font-medium"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Đang tải lên...
                  </>
                ) : (
                  <>
                    <UploadCloud className="h-3.5 w-3.5" />
                    Bắt đầu nạp tri thức
                  </>
                )}
              </Button>

              {!isUploading && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearSelection();
                  }}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Validation error */}
        {validationError && (
          <div className="flex items-start gap-2 rounded-md bg-rose-50 dark:bg-rose-950/40 p-2.5 text-xs text-rose-700 dark:text-rose-300 border border-rose-500/20">
            <Info className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
            <span>{validationError}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

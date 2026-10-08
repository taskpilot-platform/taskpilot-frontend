import React, { useState, useEffect, useCallback } from "react";
import {
  FileText,
  Upload,
  Download,
  Trash2,
  Search,
  RefreshCw,
  FolderOpen,
  FileCode,
  FileImage,
  FileArchive,
  FileSpreadsheet,
  File as FileIcon,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { projectFilesService } from "@/services/project-files.service";
import type { ProjectFile } from "@/types/collab";

interface ProjectFilesTabProps {
  projectId: number;
  isArchived?: boolean;
  isManager?: boolean;
}

export const ProjectFilesTab: React.FC<ProjectFilesTabProps> = ({
  projectId,
  isArchived = false,
  isManager = false,
}) => {
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [keyword, setKeyword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchFiles = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await projectFilesService.getFiles(projectId, keyword);
      if (res.data?.content) {
        setFiles(res.data.content);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load project files";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, keyword]);

  useEffect(() => {
    void fetchFiles();
  }, [fetchFiles]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setIsUploading(true);
    setError(null);
    try {
      await projectFilesService.uploadFile(projectId, selectedFile);
      e.target.value = "";
      void fetchFiles();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setError(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (fileId: number) => {
    if (!window.confirm("Are you sure you want to delete this file?")) return;
    setDeletingId(fileId);
    try {
      await projectFilesService.deleteFile(projectId, fileId);
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Delete failed";
      setError(msg);
    } finally {
      setDeletingId(null);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const getFileIcon = (fileName: string, _mime?: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (["png", "jpg", "jpeg", "svg", "webp", "gif"].includes(ext || "")) {
      return <FileImage className="h-6 w-6 text-purple-500" />;
    }
    if (["zip", "tar", "gz", "rar", "7z"].includes(ext || "")) {
      return <FileArchive className="h-6 w-6 text-amber-500" />;
    }
    if (["csv", "xlsx", "xls"].includes(ext || "")) {
      return <FileSpreadsheet className="h-6 w-6 text-emerald-500" />;
    }
    if (["pdf"].includes(ext || "")) {
      return <FileText className="h-6 w-6 text-rose-500" />;
    }
    if (["ts", "tsx", "js", "jsx", "java", "py", "json", "html", "css"].includes(ext || "")) {
      return <FileCode className="h-6 w-6 text-blue-500" />;
    }
    return <FileIcon className="h-6 w-6 text-muted-foreground" />;
  };

  return (
    <div className="space-y-6 py-4">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FolderOpen className="h-6 w-6 text-primary" />
            Project Files
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Store, share, and manage project documents and assets
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchFiles()}
            disabled={isLoading}
            className="gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          {!isArchived && (
            <label className="cursor-pointer">
              <input
                type="file"
                className="hidden"
                onChange={handleFileUpload}
                disabled={isUploading}
              />
              <span className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors">
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Upload File
                  </>
                )}
              </span>
            </label>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Search and filters */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search files by name..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="pl-9 bg-background/50 border-muted"
        />
      </div>

      {/* File List */}
      <Card className="border-muted/60 shadow-sm">
        <CardHeader className="pb-3 border-b border-border/40 bg-muted/10">
          <CardTitle className="text-sm font-semibold flex items-center justify-between">
            <span>All Documents ({files.length})</span>
            <span className="text-xs font-normal text-muted-foreground">Max 50MB per file</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && files.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Loading files...
            </div>
          ) : files.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
              <FolderOpen className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-base font-medium">No files in this project yet</p>
              <p className="text-xs text-muted-foreground/80 mt-1 max-w-sm">
                Upload architecture specs, design files, or assets to share with team members.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-4 hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-muted/40 shrink-0">
                      {getFileIcon(file.originalName, file.contentType)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {file.originalName}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span>{formatFileSize(file.fileSize)}</span>
                        <span>•</span>
                        <span>{file.uploaderName || "Member"}</span>
                        <span>•</span>
                        <time>{new Date(file.createdAt).toLocaleDateString("en-GB")}</time>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 ml-4">
                    <a
                      href={projectFilesService.downloadFileUrl(projectId, file.id)}
                      download={file.originalName}
                      className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </a>

                    {(isManager || !isArchived) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(file.id)}
                        disabled={deletingId === file.id}
                        title="Delete"
                      >
                        {deletingId === file.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

import { useCallback, useState } from "react";
import { toast } from "react-toastify";
import { knowledgeService } from "@/services/knowledge.service";
import { getApiErrorMessage } from "@/lib/http";
import type { ProjectDocument } from "@/types/knowledge";

export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

export const SUPPORTED_EXTENSIONS = [
  ".pdf",
  ".docx",
  ".txt",
  ".md",
  ".csv",
] as const;

export const SUPPORTED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
  "text/csv",
] as const;

export function validateFile(file: File): string | null {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `Kích thước file vượt quá giới hạn 25MB (${(file.size / (1024 * 1024)).toFixed(1)}MB).`;
  }

  const name = file.name.toLowerCase();
  const isExtensionValid = SUPPORTED_EXTENSIONS.some((ext) =>
    name.endsWith(ext)
  );

  if (!isExtensionValid) {
    return `Định dạng file không được hỗ trợ. Vui lòng tải lên file: ${SUPPORTED_EXTENSIONS.join(", ")}.`;
  }

  return null;
}

export function useDocumentUpload(
  projectId: number,
  onUploadSuccess?: (doc: ProjectDocument) => void
) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const selectFile = useCallback((file: File | null) => {
    if (!file) {
      setSelectedFile(null);
      setValidationError(null);
      return;
    }

    const error = validateFile(file);
    if (error) {
      setValidationError(error);
      setSelectedFile(null);
      toast.warn(error);
    } else {
      setValidationError(null);
      setSelectedFile(file);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        selectFile(file);
      }
    },
    [selectFile]
  );

  const uploadSelectedFile = useCallback(async (): Promise<boolean> => {
    if (!selectedFile) {
      toast.warn("Vui lòng chọn tài liệu để tải lên.");
      return false;
    }

    const err = validateFile(selectedFile);
    if (err) {
      setValidationError(err);
      toast.error(err);
      return false;
    }

    setIsUploading(true);
    setValidationError(null);

    try {
      const res = await knowledgeService.uploadDocument(projectId, selectedFile);
      toast.success(
        `Tài liệu "${selectedFile.name}" đã được tải lên và đang được lập chỉ mục vector tự động.`
      );
      setSelectedFile(null);
      onUploadSuccess?.(res.data);
      return true;
    } catch (apiErr) {
      const msg = getApiErrorMessage(apiErr);
      setValidationError(msg);
      toast.error(msg);
      return false;
    } finally {
      setIsUploading(false);
    }
  }, [projectId, selectedFile, onUploadSuccess]);

  const clearSelection = useCallback(() => {
    setSelectedFile(null);
    setValidationError(null);
  }, []);

  return {
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
  };
}

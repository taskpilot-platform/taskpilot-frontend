import React, { useState } from "react";
import { FolderOpen } from "lucide-react";
import { DocumentListItem } from "./DocumentListItem";
import { DeleteDocumentDialog } from "./DeleteDocumentDialog";
import type { ProjectDocument } from "@/types/knowledge";

interface DocumentListProps {
  documents: ProjectDocument[];
  isLoading: boolean;
  isArchived?: boolean;
  onDeleteDocument: (documentId: number) => Promise<boolean>;
  onRetryDocument: (documentId: number) => Promise<boolean>;
  isDeleting: (id: number) => boolean;
  isRetrying: (id: number) => boolean;
}

export const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  isLoading,
  isArchived = false,
  onDeleteDocument,
  onRetryDocument,
  isDeleting,
  isRetrying,
}) => {
  const [docToDelete, setDocToDelete] = useState<ProjectDocument | null>(null);

  const handleConfirmDelete = async () => {
    if (!docToDelete) return;
    const success = await onDeleteDocument(docToDelete.id);
    if (success) {
      setDocToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 py-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center gap-4 rounded-lg border border-border/60 bg-card p-4 animate-pulse"
          >
            <div className="h-10 w-10 rounded-lg bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/3 rounded bg-muted" />
              <div className="h-3 w-1/4 rounded bg-muted/60" />
            </div>
            <div className="h-6 w-20 rounded-full bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-muted/20 py-12 px-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
          <FolderOpen className="h-7 w-7" />
        </div>
        <h4 className="text-base font-semibold text-foreground">
          Chưa có tài liệu nào trong dự án
        </h4>
        <p className="mt-1.5 max-w-sm text-xs text-muted-foreground leading-relaxed">
          Hãy tải lên tài liệu dự án (PDF, DOCX, TXT, MD, CSV) để hệ thống RAG tự động phân đoạn và lập chỉ mục tri thức vào cơ sở dữ liệu vector.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        {documents.map((doc) => (
          <DocumentListItem
            key={doc.id}
            document={doc}
            isArchived={isArchived}
            isRetrying={isRetrying(doc.id)}
            isDeleting={isDeleting(doc.id)}
            onRetry={(d) => void onRetryDocument(d.id)}
            onDeleteRequest={(d) => setDocToDelete(d)}
          />
        ))}
      </div>

      <DeleteDocumentDialog
        document={docToDelete}
        isOpen={docToDelete !== null}
        isDeleting={docToDelete ? isDeleting(docToDelete.id) : false}
        onClose={() => setDocToDelete(null)}
        onConfirm={() => void handleConfirmDelete()}
      />
    </>
  );
};

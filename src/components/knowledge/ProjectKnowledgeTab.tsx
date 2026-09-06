import React from "react";
import { ShieldAlert, Info, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { KnowledgeHeader } from "./KnowledgeHeader";
import { DocumentUploadCard } from "./DocumentUploadCard";
import { DocumentList } from "./DocumentList";
import { KnowledgeSearchCard } from "./KnowledgeSearchCard";
import { useProjectDocuments } from "@/hooks/useProjectDocuments";

interface ProjectKnowledgeTabProps {
  projectId: number;
  isArchived?: boolean;
}

export const ProjectKnowledgeTab: React.FC<ProjectKnowledgeTabProps> = ({
  projectId,
  isArchived = false,
}) => {
  const { t } = useTranslation();
  const {
    documents,
    isLoading,
    isPolling,
    error,
    refetch,
    deleteDocument,
    retryDocument,
    isDeleting,
    isRetrying,
  } = useProjectDocuments(projectId);

  const isForbidden =
    error &&
    (error.includes("403") ||
      error.toLowerCase().includes("không có quyền") ||
      error.toLowerCase().includes("forbidden") ||
      error.toLowerCase().includes("not authorized"));

  if (isForbidden) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-rose-500/30 bg-rose-50/40 dark:bg-rose-950/20 p-12 text-center my-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400 mb-4">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h3 className="text-lg font-bold text-rose-800 dark:text-rose-300">
          {t("knowledge.forbidden_title")}
        </h3>
        <p className="mt-2 max-w-md text-sm text-muted-foreground leading-relaxed">
          {t("knowledge.forbidden_desc")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-4">
      {/* Header with stats and refresh */}
      <KnowledgeHeader
        documents={documents}
        isRefreshing={isLoading}
        isPolling={isPolling}
        onRefresh={refetch}
      />

      {/* Main Content Grid: Search + Upload */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Semantic Search (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <KnowledgeSearchCard projectId={projectId} />

          {/* Document List Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                {t("knowledge.doc_list_title", { count: documents.length })}
              </h3>
              {isPolling && (
                <span className="text-[11px] text-blue-600 dark:text-blue-400 animate-pulse font-medium">
                  {t("knowledge.syncing_status")}
                </span>
              )}
            </div>

            <DocumentList
              documents={documents}
              isLoading={isLoading}
              isArchived={isArchived}
              onDeleteDocument={deleteDocument}
              onRetryDocument={retryDocument}
              isDeleting={isDeleting}
              isRetrying={isRetrying}
            />
          </div>
        </div>

        {/* Right Column: Upload Document & Instructions (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <DocumentUploadCard
            projectId={projectId}
            isArchived={isArchived}
            onUploadSuccess={() => void refetch()}
          />

          {/* RAG Workflow Info Banner */}
          <div className="rounded-lg border border-border/80 bg-muted/30 p-4 text-xs space-y-2 text-muted-foreground leading-relaxed">
            <div className="font-semibold text-foreground flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 text-primary" />
              {t("knowledge.how_it_works_title")}
            </div>
            <p>{t("knowledge.how_it_works_step1")}</p>
            <p>{t("knowledge.how_it_works_step2")}</p>
            <p>{t("knowledge.how_it_works_step3")}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

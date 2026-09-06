import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import i18n from "@/lib/i18n";
import { knowledgeService } from "@/services/knowledge.service";
import { getApiErrorMessage } from "@/lib/http";
import type { ProjectDocument } from "@/types/knowledge";

const POLLING_INTERVAL_MS = 2500;
const MAX_POLLING_DURATION_MS = 300000; // 5 minutes max
const TERMINAL_STATUSES: Set<string> = new Set(["READY", "FAILED"]);

export function useProjectDocuments(projectId: number) {
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryingIds, setRetryingIds] = useState<Set<number>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());

  const pollingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollingStartRef = useRef<number | null>(null);

  const fetchDocuments = useCallback(
    async (isBackgroundRefresh = false) => {
      if (!projectId) return;
      if (!isBackgroundRefresh) {
        setIsLoading(true);
      }
      setError(null);

      try {
        const res = await knowledgeService.getDocuments(projectId);
        const docs = res.data || [];
        setDocuments(docs);

        // Determine if polling is needed: poll whenever any document is non-terminal (QUEUED, PROCESSING, RETRY_WAIT, UPLOADING)
        const hasPending = docs.some((d) => !TERMINAL_STATUSES.has(d.status));

        if (hasPending) {
          if (!pollingStartRef.current) {
            pollingStartRef.current = Date.now();
          }

          const elapsed = Date.now() - pollingStartRef.current;
          if (elapsed < MAX_POLLING_DURATION_MS) {
            setIsPolling(true);
            if (pollingTimerRef.current) {
              clearTimeout(pollingTimerRef.current);
            }
            pollingTimerRef.current = setTimeout(() => {
              void fetchDocuments(true);
            }, POLLING_INTERVAL_MS);
          } else {
            setIsPolling(false);
          }
        } else {
          setIsPolling(false);
          pollingStartRef.current = null;
          if (pollingTimerRef.current) {
            clearTimeout(pollingTimerRef.current);
            pollingTimerRef.current = null;
          }
        }
      } catch (err) {
        const msg = getApiErrorMessage(err);
        setError(msg);
        if (!isBackgroundRefresh) {
          toast.error(msg);
        }
        setIsPolling(false);
      } finally {
        if (!isBackgroundRefresh) {
          setIsLoading(false);
        }
      }
    },
    [projectId]
  );

  useEffect(() => {
    void fetchDocuments(false);

    return () => {
      if (pollingTimerRef.current) {
        clearTimeout(pollingTimerRef.current);
      }
    };
  }, [fetchDocuments]);

  const deleteDocument = useCallback(
    async (documentId: number): Promise<boolean> => {
      setDeletingIds((prev) => new Set(prev).add(documentId));
      try {
        await knowledgeService.deleteDocument(projectId, documentId);
        setDocuments((prev) => prev.filter((doc) => doc.id !== documentId));
        toast.success(
          i18n.t("knowledge.toast_delete_success", {
            defaultValue: "Đã xóa tài liệu và dữ liệu vector liên quan thành công.",
          })
        );
        return true;
      } catch (err) {
        toast.error(getApiErrorMessage(err));
        return false;
      } finally {
        setDeletingIds((prev) => {
          const next = new Set(prev);
          next.delete(documentId);
          return next;
        });
      }
    },
    [projectId]
  );

  const retryDocument = useCallback(
    async (documentId: number): Promise<boolean> => {
      setRetryingIds((prev) => new Set(prev).add(documentId));
      try {
        const res = await knowledgeService.retryIngestion(projectId, documentId);
        const updated = res.data;
        setDocuments((prev) =>
          prev.map((doc) => (doc.id === documentId ? updated : doc))
        );
        toast.info(
          i18n.t("knowledge.toast_retry_success", {
            defaultValue: "Đã kích hoạt lại quá trình lập chỉ mục vector.",
          })
        );
        // Trigger polling immediately
        pollingStartRef.current = Date.now();
        setIsPolling(true);
        if (pollingTimerRef.current) {
          clearTimeout(pollingTimerRef.current);
        }
        pollingTimerRef.current = setTimeout(() => {
          void fetchDocuments(true);
        }, 1500);
        return true;
      } catch (err) {
        toast.error(getApiErrorMessage(err));
        return false;
      } finally {
        setRetryingIds((prev) => {
          const next = new Set(prev);
          next.delete(documentId);
          return next;
        });
      }
    },
    [projectId, fetchDocuments]
  );

  return {
    documents,
    isLoading,
    isPolling,
    error,
    refetch: () => fetchDocuments(false),
    deleteDocument,
    retryDocument,
    isDeleting: (id: number) => deletingIds.has(id),
    isRetrying: (id: number) => retryingIds.has(id),
  };
}

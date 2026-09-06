import React from "react";
import { CheckCircle2, Loader2, AlertCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
import type { DocumentStatus } from "@/types/knowledge";

interface DocumentStatusBadgeProps {
  status: DocumentStatus;
  className?: string;
}

export const DocumentStatusBadge: React.FC<DocumentStatusBadgeProps> = ({
  status,
  className = "",
}) => {
  const { t } = useTranslation();

  switch (status) {
    case "READY":
      return (
        <Badge
          variant="outline"
          className={`border-emerald-500/40 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 gap-1.5 font-medium ${className}`}
        >
          <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
          <span>{t("knowledge.status_ready")}</span>
        </Badge>
      );

    case "PROCESSING":
      return (
        <Badge
          variant="outline"
          className={`border-blue-500/40 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 gap-1.5 font-medium animate-pulse ${className}`}
        >
          <Loader2 className="h-3 w-3 animate-spin text-blue-600 dark:text-blue-400" />
          <span>{t("knowledge.status_processing")}</span>
        </Badge>
      );

    case "UPLOADING":
      return (
        <Badge
          variant="outline"
          className={`border-amber-500/40 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 gap-1.5 font-medium ${className}`}
        >
          <Clock className="h-3 w-3 text-amber-600 dark:text-amber-400" />
          <span>{t("knowledge.status_uploading")}</span>
        </Badge>
      );

    case "FAILED":
      return (
        <Badge
          variant="outline"
          className={`border-rose-500/40 bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 gap-1.5 font-medium ${className}`}
        >
          <AlertCircle className="h-3 w-3 text-rose-600 dark:text-rose-400" />
          <span>{t("knowledge.status_failed")}</span>
        </Badge>
      );

    default:
      return (
        <Badge variant="secondary" className={className}>
          {status}
        </Badge>
      );
  }
};

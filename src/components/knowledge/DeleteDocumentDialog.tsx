import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle } from "lucide-react";
import type { ProjectDocument } from "@/types/knowledge";

interface DeleteDocumentDialogProps {
  document: ProjectDocument | null;
  isOpen: boolean;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteDocumentDialog: React.FC<DeleteDocumentDialogProps> = ({
  document,
  isOpen,
  isDeleting,
  onClose,
  onConfirm,
}) => {
  const { t } = useTranslation();
  if (!document) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isDeleting && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>{t("knowledge.dialog_delete_title")}</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                {t("knowledge.dialog_delete_subtitle")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-3 text-sm text-muted-foreground leading-relaxed">
          {t("knowledge.dialog_delete_confirm_desc", {
            filename: document.originalFilename,
            count: document.chunkCount || 0,
          })}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
          >
            {t("knowledge.dialog_delete_cancel")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
            className="gap-2"
          >
            {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("knowledge.dialog_delete_confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

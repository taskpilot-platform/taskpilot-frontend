import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { Loader2, RotateCcw, XCircle } from "lucide-react";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/stores/auth.store";
import { getApiErrorMessage } from "@/lib/http";
import { Button } from "@/components/ui/button";

interface RestoreLocationState {
  ticket?: string;
  email?: string;
  provider?: string;
}

export default function RestoreAccountPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const confirmRestore = useAuthStore((s) => s.confirmRestore);
  const state = (location.state as RestoreLocationState | null) ?? null;

  const [isConfirming, setIsConfirming] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  if (!state?.ticket) {
    return <Navigate to="/login" replace />;
  }

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await confirmRestore(state.ticket!);
      toast.success(
        t("auth.p2.restore_success", { defaultValue: "Your account has been restored!" }),
      );
      navigate("/dashboard", { replace: true });
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsConfirming(false);
    }
  };

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      await authService.cancelRestore({ ticket: state.ticket! });
      toast.info(
        t("auth.p2.restore_cancelled", {
          defaultValue: "Restoration cancelled. Your account remains deactivated.",
        }),
      );
      navigate("/login", { replace: true });
    } catch (error) {
      toast.error(getApiErrorMessage(error));
      navigate("/login", { replace: true });
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
          <RotateCcw className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-semibold">
          {t("auth.p2.restore_title", { defaultValue: "Restore Deactivated Account" })}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("auth.p2.restore_subtitle", {
            defaultValue: "The account {{email}} is currently self-deactivated. Would you like to reactivate it and sign in?",
            email: state.email ?? "",
          })}
        </p>
      </div>

      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200">
        {t("auth.p2.restore_notice", {
          defaultValue: "This confirmation ticket expires in 5 minutes and can only be used once.",
        })}
      </div>

      <div className="space-y-3">
        <Button
          type="button"
          className="w-full"
          disabled={isConfirming || isCancelling}
          onClick={handleConfirm}
        >
          {isConfirming ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RotateCcw className="mr-2 h-4 w-4" />
          )}
          {t("auth.p2.restore_confirm_btn", { defaultValue: "Confirm Restore & Sign In" })}
        </Button>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={isConfirming || isCancelling}
          onClick={handleCancel}
        >
          {isCancelling ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <XCircle className="mr-2 h-4 w-4" />
          )}
          {t("auth.p2.restore_cancel_btn", { defaultValue: "Cancel & Keep Deactivated" })}
        </Button>
      </div>
    </div>
  );
}

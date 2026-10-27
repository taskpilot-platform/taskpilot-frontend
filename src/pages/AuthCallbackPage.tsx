import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { useAuthStore } from "@/stores/auth.store";
import { getApiErrorMessage } from "@/lib/http";
import AuthShell from "@/components/auth/AuthShell";

export default function AuthCallbackPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const loginWithOAuthCode = useAuthStore((state) => state.loginWithOAuthCode);
  const [statusMessage, setStatusMessage] = useState<string>(
    t("auth.oauth.processing", { defaultValue: "Đang hoàn tất đăng nhập..." })
  );

  const hasExecutedRef = useRef(false);

  useEffect(() => {
    if (hasExecutedRef.current) return;
    hasExecutedRef.current = true;

    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
      let errorMessage = t("auth.oauth.error_provider", {
        defaultValue: "Đăng nhập bên thứ ba thất bại. Vui lòng thử lại.",
      });
      if (error === "access_denied") {
        errorMessage = t("auth.oauth.error_access_denied", {
          defaultValue: "Bạn đã hủy yêu cầu đăng nhập.",
        });
      } else if (error === "email_unverified") {
        errorMessage = t("auth.oauth.error_email_unverified", {
          defaultValue: "Email của tài khoản liên kết chưa được xác minh.",
        });
      } else if (error === "invalid_state") {
        errorMessage = t("auth.oauth.error_invalid_state", {
          defaultValue: "Phiên đăng nhập đã hết hạn. Vui lòng thử lại.",
        });
      } else if (error === "account_disabled") {
        errorMessage = t("auth.oauth.error_account_disabled", {
          defaultValue: "Tài khoản của bạn hiện đang bị vô hiệu hóa.",
        });
      }

      toast.error(errorMessage);
      navigate("/login", { replace: true });
      return;
    }

    if (!code) {
      toast.error(
        t("auth.oauth.error_missing_code", {
          defaultValue: "Không tìm thấy mã xác thực hợp lệ.",
        })
      );
      navigate("/login", { replace: true });
      return;
    }

    // Tiêu thụ mã trao đổi 1 lần
    loginWithOAuthCode(code)
      .then(() => {
        // Xóa query string khỏi URL thanh địa chỉ trình duyệt
        if (window.history.replaceState) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
        toast.success(
          t("auth.oauth.login_success", { defaultValue: "Đăng nhập thành công!" })
        );
        navigate("/dashboard", { replace: true });
      })
      .catch((err) => {
        setStatusMessage(
          t("auth.oauth.exchange_failed", {
            defaultValue: "Không thể hoàn tất đăng nhập. Vui lòng thử lại.",
          })
        );
        toast.error(getApiErrorMessage(err));
        navigate("/login", { replace: true });
      });
  }, [searchParams, loginWithOAuthCode, navigate, t]);

  return (
    <AuthShell
      title={t("auth.oauth.callback_title", { defaultValue: "Xác thực danh tính" })}
      description={statusMessage}
    >
      <div className="flex flex-col items-center justify-center py-8 space-y-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {t("auth.oauth.redirecting", { defaultValue: "Vui lòng đợi trong giây lát..." })}
        </p>
      </div>
    </AuthShell>
  );
}

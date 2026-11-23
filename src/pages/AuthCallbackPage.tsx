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
      const isAlreadySignedIn = useAuthStore.getState().isAuthenticated;
      const isLinkOrReauthError =
        error === "provider_already_bound" ||
        error === "provider_already_linked" ||
        error === "provider_reauth_mismatch" ||
        error === "invalid_link_state" ||
        error === "invalid_reauth_state" ||
        error === "link_conflict" ||
        error === "reauth_mismatch";

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
      } else if (error === "account_disabled" || error === "account_inactive") {
        errorMessage = t("auth.oauth.error_account_disabled", {
          defaultValue: "Tài khoản của bạn hiện đang bị vô hiệu hóa.",
        });
      } else if (error === "oauth_email_collision") {
        errorMessage = t("auth.p2.oauth_collision", {
          defaultValue:
            "An account with this email already exists. Sign in first and explicitly link this provider from Profile Settings.",
        });
      } else if (error === "provider_verification_unavailable") {
        errorMessage = t("auth.p2.provider_verification_unavailable", {
          defaultValue: "Unable to verify email ownership with the OAuth provider. Please try again later.",
        });
      } else if (error === "provider_already_bound") {
        errorMessage = t("auth.p2.provider_already_bound", {
          defaultValue: "This social identity is already linked to another TaskPilot account.",
        });
      } else if (error === "provider_already_linked" || error === "link_conflict") {
        errorMessage = t("auth.p2.link_conflict", {
          defaultValue: "This social identity or provider cannot be linked due to an ownership mismatch.",
        });
      } else if (error === "provider_reauth_mismatch" || error === "reauth_mismatch") {
        errorMessage = t("auth.p2.reauth_mismatch", {
          defaultValue: "Social re-authentication did not match your signed-in account.",
        });
      } else if (error === "invalid_link_state" || error === "invalid_reauth_state") {
        errorMessage = t("auth.p2.invalid_link_state", {
          defaultValue: "Your provider verification request expired or is invalid. Please try again from Profile Settings.",
        });
      }

      toast.error(errorMessage);
      navigate(isLinkOrReauthError || isAlreadySignedIn ? "/profile" : "/login", { replace: true });
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
      .then((outcome) => {
        // Xóa query string khỏi URL thanh địa chỉ trình duyệt
        if (window.history.replaceState) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
        if (outcome.outcome === "RESTORE_REQUIRED" && outcome.restoreTicket) {
          navigate("/restore-account", {
            replace: true,
            state: {
              ticket: outcome.restoreTicket,
              email: outcome.email,
              provider: outcome.provider,
            },
          });
          return;
        }
        if (outcome.outcome === "EMAIL_VERIFICATION_REQUIRED") {
          toast.info(
            outcome.message ||
              t("auth.p2.verify_required_toast", {
                defaultValue: "Please verify your email address before signing in.",
              }),
          );
          const verifyTarget = outcome.email
            ? `/verify-email?email=${encodeURIComponent(outcome.email)}`
            : "/verify-email";
          navigate(verifyTarget, { replace: true });
          return;
        }
        if (outcome.outcome === "OAUTH_EMAIL_COLLISION") {
          toast.error(
            outcome.message ||
              t("auth.p2.oauth_collision", {
                defaultValue:
                  "An account with this email already exists. Sign in first and explicitly link this provider from Profile Settings.",
              }),
          );
          navigate("/login", { replace: true });
          return;
        }
        if (outcome.outcome === "LINK_COMPLETED") {
          toast.success(
            outcome.message ||
              t("auth.p2.link_completed", { defaultValue: "Provider linked to your account." }),
          );
          navigate("/profile", { replace: true });
          return;
        }
        if (outcome.outcome === "REAUTH_COMPLETED") {
          toast.success(
            outcome.message ||
              t("auth.p2.reauth_completed", { defaultValue: "Identity re-authentication verified." }),
          );
          navigate("/profile", {
            replace: true,
            state: {
              reauthTicket: outcome.reauthTicket,
              reauthProvider: outcome.provider,
            },
          });
          return;
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

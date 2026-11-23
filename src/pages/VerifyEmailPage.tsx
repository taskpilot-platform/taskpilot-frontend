import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { CheckCircle2, Loader2, MailCheck } from "lucide-react";
import { authService } from "@/services/auth.service";
import { validatePassword } from "@/lib/password-policy";
import { getApiErrorMessage } from "@/lib/http";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function VerifyEmailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resendEmail, setResendEmail] = useState(searchParams.get("email") ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [verified, setVerified] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast.error(t("auth.p2.verify_missing_token", { defaultValue: "Verification token is missing." }));
      return;
    }
    const pwdErr = validatePassword(newPassword);
    if (pwdErr === "too_short") {
      toast.error(t("auth.password_min_length", { defaultValue: "Password must be at least 8 characters." }));
      return;
    }
    if (pwdErr === "too_long_bytes") {
      toast.error(t("auth.p2.password_max_bytes", { defaultValue: "Password exceeds maximum 72 UTF-8 bytes." }));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t("auth.passwords_mismatch", { defaultValue: "Passwords do not match." }));
      return;
    }

    setIsSubmitting(true);
    try {
      await authService.verifyEmail({ token, newPassword });
      setVerified(true);
      toast.success(
        t("auth.p2.verify_success", {
          defaultValue: "Email verified and password set. You can now sign in.",
        }),
      );
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail.trim()) return;
    setIsResending(true);
    try {
      await authService.resendVerification({ email: resendEmail.trim() });
      toast.success(
        t("auth.p2.verify_resent", {
          defaultValue: "If an unverified account exists for this email, a new verification link has been sent.",
        }),
      );
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsResending(false);
    }
  };

  if (verified) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-semibold">
          {t("auth.p2.verify_done_title", { defaultValue: "Email Verified" })}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("auth.p2.verify_done_desc", {
            defaultValue: "Your account is active with the password you chose.",
          })}
        </p>
        <Button className="w-full" onClick={() => navigate("/login")}>
          {t("auth.login_btn", { defaultValue: "Sign In" })}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
          <MailCheck className="h-5 w-5" />
        </div>
        <h1 className="text-xl font-semibold">
          {t("auth.p2.verify_title", { defaultValue: "Verify Email & Choose Password" })}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("auth.p2.verify_subtitle", {
            defaultValue: "Verify your mailbox ownership by choosing your final account password (8 characters min, 72 UTF-8 bytes max).",
          })}
        </p>
      </div>

      {token ? (
        <form onSubmit={handleVerify} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="verify-password">
              {t("auth.new_password", { defaultValue: "New Password" })}
            </Label>
            <Input
              id="verify-password"
              type="password"
              required
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="verify-confirm-password">
              {t("auth.confirm_password", { defaultValue: "Confirm Password" })}
            </Label>
            <Input
              id="verify-confirm-password"
              type="password"
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("auth.p2.verify_submit", { defaultValue: "Verify & Activate Account" })}
          </Button>
        </form>
      ) : (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-300">
          {t("auth.p2.verify_check_inbox", {
            defaultValue: "Open the verification link from your email, or request a new link below.",
          })}
        </div>
      )}

      <form onSubmit={handleResend} className="space-y-3 border-t pt-4">
        <Label htmlFor="resend-email" className="text-xs uppercase tracking-wide text-muted-foreground">
          {t("auth.p2.resend_label", { defaultValue: "Need another verification email?" })}
        </Label>
        <div className="flex gap-2">
          <Input
            id="resend-email"
            type="email"
            placeholder="you@example.com"
            value={resendEmail}
            onChange={(e) => setResendEmail(e.target.value)}
          />
          <Button type="submit" variant="outline" disabled={isResending || !resendEmail.trim()}>
            {isResending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("auth.p2.resend_btn", { defaultValue: "Resend" })}
          </Button>
        </div>
      </form>

      <div className="text-center text-sm">
        <Link to="/login" className="text-primary hover:underline">
          {t("auth.back_to_login", { defaultValue: "Back to Sign In" })}
        </Link>
      </div>
    </div>
  );
}

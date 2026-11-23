import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { KeyRound, Loader2 } from "lucide-react";
import { authService } from "@/services/auth.service";
import { validatePassword } from "@/lib/password-policy";
import { getApiErrorMessage } from "@/lib/http";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function PasswordSetupPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast.error(t("auth.p2.setup_missing_token", { defaultValue: "Password setup token is missing." }));
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
      await authService.completePasswordSetup({ token, newPassword });
      toast.success(
        t("auth.p2.setup_success", {
          defaultValue: "Password created successfully! Existing sessions have been revoked; please sign in.",
        }),
      );
      navigate("/login");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
          <KeyRound className="h-5 w-5" />
        </div>
        <h1 className="text-xl font-semibold">
          {t("auth.p2.setup_title", { defaultValue: "Set Account Password" })}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("auth.p2.setup_subtitle", {
            defaultValue: "Add a local password to your social login account (8 characters min, 72 UTF-8 bytes max).",
          })}
        </p>
      </div>

      {!token ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
          {t("auth.p2.setup_missing_token", { defaultValue: "Password setup token is missing or invalid." })}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="setup-password">
              {t("auth.new_password", { defaultValue: "New Password" })}
            </Label>
            <Input
              id="setup-password"
              type="password"
              required
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="setup-confirm-password">
              {t("auth.confirm_password", { defaultValue: "Confirm Password" })}
            </Label>
            <Input
              id="setup-confirm-password"
              type="password"
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("auth.p2.setup_submit", { defaultValue: "Save Password" })}
          </Button>
        </form>
      )}

      <div className="text-center text-sm">
        <Link to="/login" className="text-primary hover:underline">
          {t("auth.back_to_login", { defaultValue: "Back to Sign In" })}
        </Link>
      </div>
    </div>
  );
}

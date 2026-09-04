import AuthShell from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordField } from "@/components/auth/PasswordField";
import { getApiErrorMessage } from "@/lib/http";
import { authService } from "@/services/auth.service";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = (searchParams.get("token") || "").trim();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [touchedPassword, setTouchedPassword] = useState(false);
  const [touchedConfirm, setTouchedConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isPasswordInvalid = touchedPassword && newPassword.length > 0 && newPassword.length < 8;
  const isConfirmInvalid = touchedConfirm && confirmPassword.length > 0 && newPassword !== confirmPassword;
  const hasToken = token.length > 0;
  const isFormValid = newPassword.length >= 8 && newPassword === confirmPassword && hasToken;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setIsSubmitting(true);
    try {
      const response = await authService.resetPassword({ token, newPassword });
      toast.success(response.message || t("auth.reset_success"));
      navigate("/login");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!hasToken) {
    return (
      <AuthShell
        title={t("auth.reset_invalid_title", { defaultValue: "Invalid reset link" })}
        description={t("auth.reset_invalid_desc", {
          defaultValue: "This page can only be opened from the password reset email link.",
        })}
        footer={
          <Link to="/login" className="font-medium text-primary hover:underline">
            {t("auth.back_to_login")}
          </Link>
        }
      >
        <Link to="/forgot-password" className="block text-center font-medium text-primary hover:underline">
          {t("auth.reset_request_new_link", { defaultValue: "Request a new reset link" })}
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={t("auth.reset_title")}
      description={t("auth.reset_desc")}
      footer={
        <Link to="/login" className="font-medium text-primary hover:underline">
          {t("auth.back_to_login")}
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="newPassword">{t("auth.password")}</Label>
          <PasswordField
            id="newPassword"
            placeholder={t("auth.password_min_placeholder")}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            onBlur={() => setTouchedPassword(true)}
            error={isPasswordInvalid ? t("auth.password_min_invalid") : undefined}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">{t("auth.confirm_password")}</Label>
          <PasswordField
            id="confirmPassword"
            placeholder={t("auth.confirm_password_placeholder")}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            onBlur={() => setTouchedConfirm(true)}
            error={isConfirmInvalid ? t("auth.confirm_password_invalid") : undefined}
            required
          />
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting || !isFormValid}>
          {isSubmitting ? t("auth.reset_btn_loading") : t("auth.reset_btn")}
        </Button>
      </form>
    </AuthShell>
  );
}

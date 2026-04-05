import AuthShell from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getApiErrorMessage } from "@/lib/http";
import { authService } from "@/services/auth.service";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [touchedPassword, setTouchedPassword] = useState(false);
  const [touchedConfirm, setTouchedConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isPasswordInvalid = touchedPassword && newPassword.length > 0 && newPassword.length < 8;
  const isConfirmInvalid = touchedConfirm && confirmPassword.length > 0 && newPassword !== confirmPassword;
  const isFormValid = newPassword.length >= 8 && newPassword === confirmPassword && token !== "";

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
          <div className="relative">
            <Input
              id="newPassword"
              type={showNewPassword ? "text" : "password"}
              placeholder={t("auth.password_min_placeholder")}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              onBlur={() => setTouchedPassword(true)}
              className={`pr-10 ${isPasswordInvalid ? 'border-destructive focus-visible:ring-destructive' : ''}`}
              required
            />
            <button
              type="button"
              onClick={() => setShowNewPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showNewPassword ? "Ẩn mật khẩu mới" : "Hiện mật khẩu mới"}
            >
              {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {isPasswordInvalid && (
            <p className="text-[0.8rem] font-medium text-destructive">{t("auth.password_min_invalid")}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">{t("auth.confirm_password")}</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder={t("auth.confirm_password_placeholder")}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onBlur={() => setTouchedConfirm(true)}
              className={`pr-10 ${isConfirmInvalid ? 'border-destructive focus-visible:ring-destructive' : ''}`}
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showConfirmPassword ? "Ẩn xác nhận mật khẩu mới" : "Hiện xác nhận mật khẩu mới"}
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {isConfirmInvalid && (
            <p className="text-[0.8rem] font-medium text-destructive">{t("auth.confirm_password_invalid")}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting || !isFormValid}>
          {isSubmitting ? t("auth.reset_btn_loading") : t("auth.reset_btn")}
        </Button>
      </form>
    </AuthShell>
  );
}

import AuthShell from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getApiErrorMessage } from "@/lib/http";
import { authService } from "@/services/auth.service";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touchedEmail, setTouchedEmail] = useState(false);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isEmailInvalid = touchedEmail && (!email || !emailRegex.test(email));
  const isFormValid = email && emailRegex.test(email);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setIsSubmitting(true);
    try {
      const response = await authService.forgotPassword({ email });
      toast.success(response.message || "Đã gửi yêu cầu đặt lại mật khẩu");
      navigate("/reset-password");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell
      title={t("auth.forgot_title")}
      description={t("auth.forgot_desc")}
      footer={
        <Link to="/login" className="font-medium text-primary hover:underline">
          {t("auth.forgot_back")}
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">{t("auth.email")}</Label>
          <Input
            id="email"
            type="email"
            placeholder={t("auth.email_placeholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setTouchedEmail(true)}
            className={isEmailInvalid ? "border-destructive focus-visible:ring-destructive" : ""}
            required
          />
          {isEmailInvalid && (
            <p className="text-[0.8rem] font-medium text-destructive">{t("auth.email_invalid")}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting || !isFormValid}>
          {isSubmitting ? t("auth.forgot_btn_loading") : t("auth.forgot_btn")}
        </Button>
      </form>
    </AuthShell>
  );
}

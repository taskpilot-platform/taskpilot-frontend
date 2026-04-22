import AuthShell from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getApiErrorMessage } from "@/lib/http";
import { authService } from "@/services/auth.service";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const RESEND_COOLDOWN_SECONDS = 60;

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touchedEmail, setTouchedEmail] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isEmailInvalid = touchedEmail && (!email || !emailRegex.test(email));
  const isFormValid = email && emailRegex.test(email);

  useEffect(() => {
    if (cooldownRemaining <= 0) {
      return;
    }

    const timerId = window.setInterval(() => {
      setCooldownRemaining((previous) => (previous <= 1 ? 0 : previous - 1));
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [cooldownRemaining]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setIsSubmitting(true);
    try {
      const response = await authService.forgotPassword({ email });
      toast.success(response.message || t("auth.forgot_success", { defaultValue: "Reset request sent successfully" }));
      setRequestSent(true);
      setCooldownRemaining(RESEND_COOLDOWN_SECONDS);
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
      {requestSent ? (
        <div className="space-y-3 text-center">
          <p className="text-sm text-muted-foreground">
            {t("auth.forgot_sent_desc", {
              defaultValue: "Check your email and open the reset link to continue.",
            })}
          </p>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={cooldownRemaining > 0}
            onClick={() => setRequestSent(false)}
          >
            {cooldownRemaining > 0
              ? t("auth.forgot_send_again_in", {
                  defaultValue: "Send another link in {{seconds}}s",
                  seconds: cooldownRemaining,
                })
              : t("auth.forgot_send_again", { defaultValue: "Send another link" })}
          </Button>
        </div>
      ) : (
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
      )}
    </AuthShell>
  );
}

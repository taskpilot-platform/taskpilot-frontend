import AuthShell from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordField } from "@/components/auth/PasswordField";
import { getApiErrorMessage } from "@/lib/http";
import { useAuthStore } from "@/stores/auth.store";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export default function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const register = useAuthStore((state) => state.register);
  const isLoading = useAuthStore((state) => state.isLoading);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [touchedName, setTouchedName] = useState(false);
  const [touchedEmail, setTouchedEmail] = useState(false);
  const [touchedPassword, setTouchedPassword] = useState(false);
  const [touchedConfirm, setTouchedConfirm] = useState(false);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isNameInvalid = touchedName && !fullName.trim();
  const isEmailInvalid = touchedEmail && (!email || !emailRegex.test(email));
  const isPasswordInvalid = touchedPassword && (!password || password.length < 8);
  const isConfirmInvalid = touchedConfirm && confirmPassword.length > 0 && password !== confirmPassword;
  const isFormValid = fullName.trim() && emailRegex.test(email) && password.length >= 8 && password === confirmPassword;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    try {
      await register({ fullName, email, password });
      toast.success(t("auth.register_success", { defaultValue: "Registered successfully, please login" }));
      navigate("/login");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  return (
    <AuthShell
      title={t("auth.register_title")}
      description={t("auth.register_desc")}
      footer={
        <>
          {t("auth.has_account")}{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            {t("auth.login_link")}
          </Link>
        </>
      }
    >
      <form onSubmit={handleRegister} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">{t("auth.fullname")}</Label>
          <Input
            id="name"
            placeholder={t("auth.fullname_placeholder")}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            onBlur={() => setTouchedName(true)}
            className={isNameInvalid ? "border-destructive focus-visible:ring-destructive" : ""}
            required
          />
          {isNameInvalid && (
            <p className="text-[0.8rem] font-medium text-destructive">{t("auth.fullname_invalid")}</p>
          )}
        </div>

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

        <div className="space-y-2">
          <Label htmlFor="password">{t("auth.password")}</Label>
          <PasswordField
            id="password"
            placeholder={t("auth.password_min_placeholder")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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

        <Button type="submit" className="w-full" disabled={isLoading || !isFormValid}>
          {isLoading ? t("auth.register_btn_loading") : t("auth.register_btn")}
        </Button>
      </form>
    </AuthShell>
  );
}

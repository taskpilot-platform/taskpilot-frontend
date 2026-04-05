import AuthShell from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getApiErrorMessage } from "@/lib/http";
import { useAuthStore } from "@/stores/auth.store";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const isLoading = useAuthStore((state) => state.isLoading);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [touchedEmail, setTouchedEmail] = useState(false);
  const [touchedPassword, setTouchedPassword] = useState(false);

  // Email format validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isEmailInvalid = touchedEmail && (!email || !emailRegex.test(email));
  const isPasswordInvalid = touchedPassword && !password;
  const isFormValid = email && emailRegex.test(email) && password;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    try {
      await login({ email, password });
      toast.success("Đăng nhập thành công");
      navigate("/");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  return (
    <AuthShell
      title={t("auth.login_title")}
      description={t("auth.login_desc")}
      footer={
        <>
          {t("auth.no_account")}{" "}
          <Link to="/register" className="font-medium text-primary hover:underline">
            {t("auth.signup_link")}
          </Link>
        </>
      }
    >
      <form onSubmit={handleLogin} className="space-y-4">
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
          <div className="flex items-center justify-between">
            <Label htmlFor="password">{t("auth.password")}</Label>
            <Link
              to="/forgot-password"
              className="text-xs font-medium text-primary hover:underline"
            >
              {t("auth.password_forgot")}
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder={t("auth.password_placeholder")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setTouchedPassword(true)}
              className={`pr-10 ${isPasswordInvalid ? 'border-destructive focus-visible:ring-destructive' : ''}`}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {isPasswordInvalid && (
            <p className="text-[0.8rem] font-medium text-destructive">{t("auth.password_invalid")}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isLoading || !isFormValid}>
          {isLoading ? t("auth.login_btn_loading") : t("auth.login_btn")}
        </Button>
      </form>
    </AuthShell>
  );
}

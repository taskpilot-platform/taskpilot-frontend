import { useEffect, useMemo, useState, useRef } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  Eye,
  EyeOff,
  KeyRound,
  Link2,
  Loader2,
  Save,
  ShieldAlert,
  UserCircle2,
  UserCog,
  Upload,
} from "lucide-react";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getApiErrorMessage } from "@/lib/http";
import { profileService } from "@/services/profile.service";
import { useAuthStore } from "@/stores/auth.store";
import type { UserProfile } from "@/types/user";
import { UserAvatar } from "@/components/ui/user-avatar";

type ProfileTab = "profile" | "security";

export default function ProfilePage() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [activeTab, setActiveTab] = useState<ProfileTab>("profile");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [touchedFullName, setTouchedFullName] = useState(false);
  const [touchedOldPassword, setTouchedOldPassword] = useState(false);
  const [touchedNewPassword, setTouchedNewPassword] = useState(false);
  const [touchedConfirmPassword, setTouchedConfirmPassword] = useState(false);

  const isFullNameInvalid = touchedFullName && !fullName.trim();
  const isProfileFormValid = fullName.trim() !== "";

  const hasPassword = profile?.hasPassword ?? true;

  const isOldPasswordInvalid = hasPassword && touchedOldPassword && !oldPassword;
  const isNewPasswordInvalid = touchedNewPassword && (!newPassword || newPassword.length < 8);
  const isConfirmInvalid = touchedConfirmPassword && confirmPassword.length > 0 && newPassword !== confirmPassword;
  const isPasswordFormValid = (hasPassword ? Boolean(oldPassword) : true) && newPassword.length >= 8 && newPassword === confirmPassword;

  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);

  const statusLabel = useMemo(() => profile?.status || "UNKNOWN", [profile?.status]);

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const response = await profileService.getMe();
      setProfile(response.data);
      setFullName(response.data.fullName || "");
      setAvatarUrl(response.data.avatarUrl || "");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadProfile();
  }, []);

  const handleUpdateProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isProfileFormValid) return;

    setIsSavingProfile(true);
    try {
      const response = await profileService.updateMe({
        fullName: fullName.trim(),
        avatarUrl: avatarUrl.trim() ? avatarUrl.trim() : null,
      });
      setProfile(response.data);
      toast.success(t("profile.save_btn"));
      window.dispatchEvent(new Event('profileUpdated'));
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 1_000_000) {
      toast.error("File size exceeds 1MB limit");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Only images are allowed");
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const response = await profileService.uploadAvatar(file);
      setProfile(response.data);
      setAvatarUrl(response.data.avatarUrl || "");
      toast.success("Avatar uploaded successfully");
      window.dispatchEvent(new Event('profileUpdated'));
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleChangePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isPasswordFormValid) return;

    setIsChangingPassword(true);
    try {
      await profileService.changePassword({
        oldPassword: hasPassword ? oldPassword : undefined,
        newPassword,
      });

      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTouchedOldPassword(false);
      setTouchedNewPassword(false);
      setTouchedConfirmPassword(false);
      toast.success(hasPassword ? t("profile.change_pw_btn") : t("profile.set_pw_btn"));
      void loadProfile();
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    const shouldDelete = await confirm({
      title: t("profile.delete_title", { defaultValue: "Xóa tài khoản" }),
      message: t("profile.delete_confirm", { defaultValue: "Are you sure you want to permanently delete your account? This action cannot be undone." }),
      variant: "destructive",
    });
    if (!shouldDelete) {
      return;
    }

    setIsDeletingAccount(true);
    try {
      await profileService.deleteMe();
      toast.success(t("admin.deactivate_success"));
      await logout();
      navigate("/login", { replace: true });
    } catch (error) {
      toast.error(getApiErrorMessage(error));
      await logout();
      navigate("/login", { replace: true });
    } finally {
      setIsDeletingAccount(false);
    }
  };

  return (
    <div className="min-h-screen space-y-6 p-4 sm:p-6 md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("profile.title")}</h1>
          <p className="text-muted-foreground">{t("profile.desc")}</p>
        </div>

        <div className="flex rounded-lg border p-1 overflow-x-auto">
          <Button
            type="button"
            variant={activeTab === "profile" ? "default" : "ghost"}
            className="gap-2"
            onClick={() => setActiveTab("profile")}
          >
            <UserCog className="h-4 w-4" />
            {t("profile.tab_profile")}
          </Button>
          <Button
            type="button"
            variant={activeTab === "security" ? "default" : "ghost"}
            className="gap-2"
            onClick={() => setActiveTab("security")}
          >
            <KeyRound className="h-4 w-4" />
            {t("profile.tab_security")}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-3 animate-pulse">
          <div className="space-y-4">
            <div className="rounded-xl border border-border/80 bg-card p-6 flex flex-col items-center gap-4">
              <div className="h-24 w-24 rounded-full bg-muted" />
              <div className="h-5 w-36 bg-muted rounded" />
              <div className="h-4 w-48 bg-muted/60 rounded" />
            </div>
          </div>
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-xl border border-border/80 bg-card p-6 space-y-6">
              <div className="h-6 w-44 bg-muted rounded" />
              <div className="space-y-4">
                <div className="h-10 w-full bg-muted/40 rounded" />
                <div className="h-10 w-full bg-muted/40 rounded" />
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === "profile" ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCircle2 className="h-5 w-5" />
                {t("profile.current_info_title")}
              </CardTitle>
              <CardDescription>{t("profile.current_info_desc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex flex-col items-center justify-center space-y-3 pb-4">
                <UserAvatar 
                  avatarUrl={avatarUrl} 
                  name={fullName} 
                  className="h-24 w-24 text-3xl shadow-md border-2 border-primary/20" 
                />
                <div className="text-center">
                  <h3 className="font-bold text-lg">{fullName || "Unknown User"}</h3>
                  <p className="text-muted-foreground text-xs">{profile?.email}</p>
                </div>
              </div>
              <div className="space-y-3 pt-4 border-t border-border/50">
                <div>
                  <p className="text-muted-foreground">{t("profile.role")}</p>
                  <p className="font-medium">{profile?.role || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t("profile.status")}</p>
                  <p className="font-medium">{statusLabel}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>{t("profile.edit_title")}</CardTitle>
              <CardDescription>{t("profile.edit_desc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleUpdateProfile}>
                <div className="space-y-2">
                  <Label htmlFor="fullName">{t("auth.fullname")}</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    onBlur={() => setTouchedFullName(true)}
                    className={isFullNameInvalid ? "border-destructive focus-visible:ring-destructive" : ""}
                    placeholder="Nguyen Van A"
                    required
                  />
                  {isFullNameInvalid && (
                    <p className="text-[0.8rem] font-medium text-destructive">{t("auth.fullname_invalid")}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="avatarUrl">{t("profile.avatar_url")}</Label>
                  <div className="flex gap-2">
                    <Input
                      id="avatarUrl"
                      value={avatarUrl}
                      onChange={(event) => setAvatarUrl(event.target.value)}
                      placeholder="https://..."
                      className="flex-1"
                    />
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/*" 
                      onChange={handleFileChange} 
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingAvatar}
                    >
                      {isUploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                      Upload
                    </Button>
                  </div>
                </div>

                <Button type="submit" className="gap-2" disabled={isSavingProfile || !isProfileFormValid}>
                  {isSavingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {isSavingProfile ? t("profile.saving_btn") : t("profile.save_btn")}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>{hasPassword ? t("profile.change_pw_title") : t("profile.set_pw_title")}</CardTitle>
              <CardDescription>{hasPassword ? t("profile.change_pw_desc") : t("profile.set_pw_desc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleChangePassword}>
                {hasPassword && (
                  <div className="space-y-2">
                    <Label htmlFor="oldPassword">{t("profile.old_pw")}</Label>
                    <div className="relative">
                      <Input
                        id="oldPassword"
                        type={showOldPassword ? "text" : "password"}
                        value={oldPassword}
                        onChange={(event) => setOldPassword(event.target.value)}
                        onBlur={() => setTouchedOldPassword(true)}
                        className={`pr-10 ${isOldPasswordInvalid ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowOldPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        aria-label={showOldPassword ? "Ẩn mật khẩu hiện tại" : "Hiện mật khẩu hiện tại"}
                      >
                        {showOldPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {isOldPasswordInvalid && (
                      <p className="text-[0.8rem] font-medium text-destructive">{t("profile.old_pw_invalid")}</p>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="newPassword">{t("profile.new_pw")}</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      onBlur={() => setTouchedNewPassword(true)}
                      className={`pr-10 ${isNewPasswordInvalid ? 'border-destructive focus-visible:ring-destructive' : ''}`}
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
                  {isNewPasswordInvalid && (
                    <p className="text-[0.8rem] font-medium text-destructive">{t("profile.new_pw_invalid")}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">{t("auth.confirm_password")}</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      onBlur={() => setTouchedConfirmPassword(true)}
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

                <Button type="submit" className="gap-2" disabled={isChangingPassword || !isPasswordFormValid}>
                  {isChangingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                  {isChangingPassword ? t("auth.reset_btn_loading") : (hasPassword ? t("profile.change_pw_btn") : t("profile.set_pw_btn"))}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link2 className="h-5 w-5" />
                  {t("profile.linked_accounts_title")}
                </CardTitle>
                <CardDescription>
                  {t("profile.linked_accounts_desc")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {profile?.linkedProviders && profile.linkedProviders.length > 0 ? (
                  <div className="space-y-2">
                    {profile.linkedProviders.map((provider) => {
                      const isGoogle = provider.toLowerCase() === "google";
                      const isGithub = provider.toLowerCase() === "github";
                      return (
                        <div
                          key={provider}
                          className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-sm"
                        >
                          <div className="flex items-center gap-2.5">
                            {isGoogle && (
                              <svg className="h-4 w-4" viewBox="0 0 24 24">
                                <path
                                  fill="#4285F4"
                                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                                />
                                <path
                                  fill="#34A853"
                                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                                />
                                <path
                                  fill="#FBBC05"
                                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                                />
                                <path
                                  fill="#EA4335"
                                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                                />
                              </svg>
                            )}
                            {isGithub && (
                              <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                              </svg>
                            )}
                            <span className="font-medium capitalize">
                              {isGoogle ? t("profile.linked_provider_google") : isGithub ? t("profile.linked_provider_github") : provider}
                            </span>
                          </div>
                          <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                            Connected
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">{t("profile.linked_accounts_empty")}</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-destructive/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <ShieldAlert className="h-5 w-5" />
                  {t("profile.danger_zone")}
                </CardTitle>
                <CardDescription>
                  {t("profile.danger_desc")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  type="button"
                  variant="destructive"
                  className="w-full"
                  onClick={handleDeleteAccount}
                  disabled={isDeletingAccount}
                >
                  {isDeletingAccount ? t("profile.deleting_account_btn") : t("profile.delete_account_btn")}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

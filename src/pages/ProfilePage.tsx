import { useEffect, useMemo, useState, useRef } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  Eye,
  EyeOff,
  KeyRound,
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

  const isOldPasswordInvalid = touchedOldPassword && !oldPassword;
  const isNewPasswordInvalid = touchedNewPassword && (!newPassword || newPassword.length < 8);
  const isConfirmInvalid = touchedConfirmPassword && confirmPassword.length > 0 && newPassword !== confirmPassword;
  const isPasswordFormValid = oldPassword && newPassword.length >= 8 && newPassword === confirmPassword;

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
        oldPassword,
        newPassword,
      });

      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success(t("profile.change_pw_btn"));
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    const shouldDelete = window.confirm(
      t("profile.delete_confirm"),
    );

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
    <div className="min-h-screen space-y-6 p-6 md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{t("profile.title")}</h1>
          <p className="text-muted-foreground">{t("profile.desc")}</p>
        </div>

        <div className="rounded-lg border p-1">
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
        <Card>
          <CardContent className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("profile.loading")}
          </CardContent>
        </Card>
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
              <CardTitle>{t("profile.change_pw_title")}</CardTitle>
              <CardDescription>{t("profile.change_pw_desc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleChangePassword}>
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
                  {isChangingPassword ? t("auth.reset_btn_loading") : t("profile.change_pw_btn")}
                </Button>
              </form>
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
      )}
    </div>
  );
}

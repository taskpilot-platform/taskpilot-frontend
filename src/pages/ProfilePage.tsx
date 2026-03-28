import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  KeyRound,
  Loader2,
  Save,
  ShieldAlert,
  UserCircle2,
  UserCog,
} from "lucide-react";
import { toast } from "react-toastify";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getApiErrorMessage } from "@/lib/http";
import { profileService } from "@/services/profile.service";
import { useAuthStore } from "@/stores/auth.store";
import type { UserProfile } from "@/types/user";

type ProfileTab = "profile" | "security";

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<ProfileTab>("profile");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

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

    setIsSavingProfile(true);
    try {
      const response = await profileService.updateMe({
        fullName: fullName.trim(),
        avatarUrl: avatarUrl.trim() ? avatarUrl.trim() : null,
      });
      setProfile(response.data);
      toast.success("Cập nhật profile thành công");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error("Mật khẩu xác nhận chưa khớp");
      return;
    }

    setIsChangingPassword(true);
    try {
      await profileService.changePassword({
        oldPassword,
        newPassword,
      });

      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Đổi mật khẩu thành công");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    const shouldDelete = window.confirm(
      "Bạn chắc chắn muốn vô hiệu hóa tài khoản? Hành động này sẽ đăng xuất ngay lập tức.",
    );

    if (!shouldDelete) {
      return;
    }

    setIsDeletingAccount(true);
    try {
      await profileService.deleteMe();
      await logout();
      toast.success("Tài khoản đã được vô hiệu hóa");
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
          <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
          <p className="text-muted-foreground">Quản lý thông tin cá nhân và bảo mật tài khoản.</p>
        </div>

        <div className="rounded-lg border p-1">
          <Button
            type="button"
            variant={activeTab === "profile" ? "default" : "ghost"}
            className="gap-2"
            onClick={() => setActiveTab("profile")}
          >
            <UserCog className="h-4 w-4" />
            Hồ sơ
          </Button>
          <Button
            type="button"
            variant={activeTab === "security" ? "default" : "ghost"}
            className="gap-2"
            onClick={() => setActiveTab("security")}
          >
            <KeyRound className="h-4 w-4" />
            Bảo mật
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Đang tải profile...
          </CardContent>
        </Card>
      ) : activeTab === "profile" ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCircle2 className="h-5 w-5" />
                Thông tin hiện tại
              </CardTitle>
              <CardDescription>Dữ liệu lấy từ endpoint /api/v1/users/me.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground">Email</p>
                <p className="font-medium">{profile?.email || "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Vai trò</p>
                <p className="font-medium">{profile?.role || "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Trạng thái</p>
                <p className="font-medium">{statusLabel}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Chỉnh sửa profile</CardTitle>
              <CardDescription>Cập nhật họ tên và avatar URL của bạn.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleUpdateProfile}>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Họ và tên</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder="Nguyen Van A"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="avatarUrl">Avatar URL</Label>
                  <Input
                    id="avatarUrl"
                    value={avatarUrl}
                    onChange={(event) => setAvatarUrl(event.target.value)}
                    placeholder="https://..."
                  />
                </div>

                <Button type="submit" className="gap-2" disabled={isSavingProfile}>
                  {isSavingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {isSavingProfile ? "Đang lưu..." : "Lưu thay đổi"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Đổi mật khẩu</CardTitle>
              <CardDescription>Sử dụng endpoint /api/v1/users/me/password.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleChangePassword}>
                <div className="space-y-2">
                  <Label htmlFor="oldPassword">Mật khẩu hiện tại</Label>
                  <Input
                    id="oldPassword"
                    type="password"
                    value={oldPassword}
                    onChange={(event) => setOldPassword(event.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">Mật khẩu mới</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Xác nhận mật khẩu mới</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    required
                  />
                </div>

                <Button type="submit" className="gap-2" disabled={isChangingPassword}>
                  {isChangingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                  {isChangingPassword ? "Đang cập nhật..." : "Đổi mật khẩu"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-destructive/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <ShieldAlert className="h-5 w-5" />
                Khu vực nguy hiểm
              </CardTitle>
              <CardDescription>
                Vô hiệu hóa tài khoản hiện tại và đăng xuất khỏi hệ thống.
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
                {isDeletingAccount ? "Đang xử lý..." : "Vô hiệu hóa tài khoản"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

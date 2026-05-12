import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeSelector } from "@/components/theme-selector";
import "react-toastify/dist/ReactToastify.css";
import { toast } from "react-toastify";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { UserProfile, UserSkill } from "@/types/user";
import { profileService } from "@/services/profile.service";
import { skillService } from "@/services/skill.service";
import { getApiErrorMessage } from "@/lib/http";
import { Loader2 } from "lucide-react";

export default function DashboardPage() {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [skills, setSkills] = useState<UserSkill[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const workloadLabel = useMemo(() => {
    if (!profile?.currentWorkload) {
      return t("dashboard.no_data");
    }

    return t("dashboard.tasks_active", { count: profile.currentWorkload });
  }, [profile?.currentWorkload, t]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [profileResponse, skillsResponse] = await Promise.all([
          profileService.getMe(),
          skillService.getMySkills(),
        ]);

        setProfile(profileResponse.data);
        setSkills(skillsResponse.data);
      } catch (error) {
        toast.error(getApiErrorMessage(error));
      } finally {
        setIsLoading(false);
      }
    };

    void loadData();
  }, []);

  const handleShowToast = () => {
    toast.success("Frontend đã kết nối API backend thành công");
  };

  return (
    <div className="min-h-screen space-y-6 p-6 md:p-8 relative">
      {isLoading && (
        <div className="fixed inset-0 z-[100] bg-card/10 backdrop-blur-xl flex flex-col items-center justify-center text-muted-foreground transition-all duration-300">
          <Loader2 className="mb-4 h-12 w-12 animate-spin text-primary" />
          <p className="text-lg font-medium animate-pulse">{t("dashboard.loading")}</p>
        </div>
      )}

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{t("dashboard.title")}</h1>
          <p className="text-muted-foreground">{t("dashboard.desc")}</p>
        </div>

        <div className="flex items-center gap-3">
          <ThemeSelector />
          <Button onClick={handleShowToast}>{t("dashboard.check_conn_btn")}</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>{t("dashboard.current_user")}</CardTitle>
            <CardDescription>{isLoading ? t("dashboard.loading") : profile?.email || "-"}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">{t("dashboard.fullname")}</p>
            <p className="font-semibold">{profile?.fullName || "-"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>{t("dashboard.account_status")}</CardTitle>
            <CardDescription>{t("dashboard.account_status_desc")}</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            <Badge>{profile?.status || "UNKNOWN"}</Badge>
            <Badge variant="secondary">{profile?.role || "-"}</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>{t("dashboard.workload")}</CardTitle>
            <CardDescription>{t("dashboard.workload_desc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-semibold">{isLoading ? t("dashboard.loading") : workloadLabel}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("dashboard.my_skills")}</CardTitle>
          <CardDescription>{t("dashboard.my_skills_desc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">{t("dashboard.loading")}</p>
          ) : skills.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("dashboard.my_skills_empty")}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <Badge key={skill.skillId} variant="outline" className="px-3 py-1">
                  {skill.name} - level {skill.level}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

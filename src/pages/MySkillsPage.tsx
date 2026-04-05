import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  ChartColumn,
  Loader2,
  Pencil,
  PlusCircle,
  RefreshCw,
  Shield,
  Trash2,
  Wrench,
} from "lucide-react";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getApiErrorMessage } from "@/lib/http";
import { profileService } from "@/services/profile.service";
import { skillService } from "@/services/skill.service";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { UserProfile, UserSkill } from "@/types/user";

type SkillsTab = "overview" | "manage";

export default function MySkillsPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<SkillsTab>("overview");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [skills, setSkills] = useState<UserSkill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);

  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillLevel, setNewSkillLevel] = useState("3");
  const [levelDrafts, setLevelDrafts] = useState<Record<number, string>>({});

  const isAdmin = useMemo(
    () => (profile?.role || "").toUpperCase().includes("ADMIN"),
    [profile?.role],
  );

  const averageLevel = useMemo(() => {
    if (skills.length === 0) {
      return 0;
    }

    const total = skills.reduce((sum, skill) => sum + skill.level, 0);
    return Number((total / skills.length).toFixed(1));
  }, [skills]);

  const loadPageData = async () => {
    setIsLoading(true);
    try {
      const [profileResponse, skillsResponse] = await Promise.all([
        profileService.getMe(),
        skillService.getMySkills(),
      ]);

      setProfile(profileResponse.data);
      setSkills(skillsResponse.data);
      setLevelDrafts(
        Object.fromEntries(skillsResponse.data.map((skill) => [skill.skillId, String(skill.level)])),
      );
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadPageData();
  }, []);

  const handleAddSkill = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsedLevel = Number(newSkillLevel);
    if (Number.isNaN(parsedLevel) || parsedLevel < 1 || parsedLevel > 5) {
      toast.error(t("skills.level_invalid", { defaultValue: "Level must be between 1 and 5" }));
      return;
    }

    setIsMutating(true);
    try {
      await skillService.addMySkill({
        name: newSkillName.trim(),
        level: parsedLevel,
      });
      toast.success(t("skills.add_success"));
      setNewSkillName("");
      setNewSkillLevel("3");
      await loadPageData();
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsMutating(false);
    }
  };

  const handleUpdateSkill = async (skillId: number) => {
    const parsedLevel = Number(levelDrafts[skillId]);
    if (Number.isNaN(parsedLevel) || parsedLevel < 1 || parsedLevel > 5) {
      toast.error(t("skills.level_invalid", { defaultValue: "Level must be between 1 and 5" }));
      return;
    }

    setIsMutating(true);
    try {
      await skillService.updateMySkill(skillId, { level: parsedLevel });
      toast.success(t("skills.update_success", { defaultValue: "Skill level updated" }));
      await loadPageData();
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsMutating(false);
    }
  };

  const handleDeleteSkill = async (skillId: number) => {
    const shouldDelete = window.confirm(t("skills.delete_confirm", { defaultValue: "Are you sure you want to delete this skill?" }));
    if (!shouldDelete) {
      return;
    }

    setIsMutating(true);
    try {
      await skillService.deleteMySkill(skillId);
      toast.success(t("skills.delete_success", { defaultValue: "Skill deleted" }));
      await loadPageData();
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsMutating(false);
    }
  };

  return (
    <div className="min-h-screen space-y-6 p-6 md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{t("skills.title")}</h1>
          <p className="text-muted-foreground">
            {t("skills.desc")}
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-lg border p-1">
          <Button
            type="button"
            variant={activeTab === "overview" ? "default" : "ghost"}
            className="gap-2"
            onClick={() => setActiveTab("overview")}
          >
            <ChartColumn className="h-4 w-4" />
            {t("skills.tab_overview")}
          </Button>
          <Button
            type="button"
            variant={activeTab === "manage" ? "default" : "ghost"}
            className="gap-2"
            onClick={() => setActiveTab("manage")}
          >
            <Wrench className="h-4 w-4" />
            {t("skills.tab_manage")}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 py-4 text-sm md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span>
              {t("skills.current_role")}<strong>{profile?.role || "-"}</strong>
            </span>
            {isAdmin ? <Badge>Admin</Badge> : <Badge variant="secondary">User</Badge>}
          </div>
          <p className="text-muted-foreground">
            {t("skills.api_note")}
          </p>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card>
          <CardContent className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("skills.loading", { defaultValue: "Đang tải dữ liệu..." })}
          </CardContent>
        </Card>
      ) : activeTab === "overview" ? (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>{t("skills.total_skills")}</CardTitle>
              <CardDescription>{t("skills.total_skills_desc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{skills.length}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle>{t("skills.average_level")}</CardTitle>
              <CardDescription>{t("skills.average_level_desc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{averageLevel}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle>{t("skills.quick_list")}</CardTitle>
              <CardDescription>{t("skills.quick_list_desc")}</CardDescription>
            </CardHeader>
            <CardContent>
              {skills.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("skills.no_data")}</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {skills.slice(0, 6).map((skill) => (
                    <Badge key={skill.skillId} variant="outline">
                      {skill.name} ({skill.level})
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("skills.add_title")}</CardTitle>
              <CardDescription>{t("skills.desc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="grid gap-3 md:grid-cols-4" onSubmit={handleAddSkill}>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="newSkillName">{t("skills.col_skill")}</Label>
                  <Input
                    id="newSkillName"
                    value={newSkillName}
                    onChange={(event) => setNewSkillName(event.target.value)}
                    placeholder="Java, React, Docker..."
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newSkillLevel">Level</Label>
                  <Input
                    id="newSkillLevel"
                    type="number"
                    min={1}
                    max={5}
                    value={newSkillLevel}
                    onChange={(event) => setNewSkillLevel(event.target.value)}
                    required
                  />
                </div>

                <div className="flex items-end">
                  <Button type="submit" className="w-full gap-2" disabled={isMutating}>
                    <PlusCircle className="h-4 w-4" />
                    {t("skills.add_btn", { defaultValue: "Thêm skill" })}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("skills.list_title")}</CardTitle>
              <CardDescription>{t("skills.desc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>{t("skills.col_skill")}</TableHead>
                    <TableHead>{t("skills.col_level")}</TableHead>
                    <TableHead className="w-[240px]">{t("skills.col_actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {skills.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                        {t("skills.no_data")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    skills.map((skill) => (
                      <TableRow key={skill.skillId}>
                        <TableCell>{skill.skillId}</TableCell>
                        <TableCell className="font-medium">{skill.name}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={1}
                            max={5}
                            value={levelDrafts[skill.skillId] ?? String(skill.level)}
                            onChange={(event) =>
                              setLevelDrafts((prev) => ({
                                ...prev,
                                [skill.skillId]: event.target.value,
                              }))
                            }
                            className="w-20"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="gap-1"
                              disabled={isMutating}
                              onClick={() => void handleUpdateSkill(skill.skillId)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              {t("skills.action_edit")}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              className="gap-1"
                              disabled={isMutating}
                              onClick={() => void handleDeleteSkill(skill.skillId)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              {t("skills.action_delete")}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              <div className="mt-4">
                <Button
                  type="button"
                  variant="secondary"
                  className="gap-2"
                  onClick={() => void loadPageData()}
                  disabled={isMutating}
                >
                  <RefreshCw className="h-4 w-4" />
                  {t("skills.reload_btn")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

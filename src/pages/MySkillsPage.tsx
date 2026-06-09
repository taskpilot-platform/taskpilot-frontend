import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  ChartColumn,
  Code,
  Loader2,
  PlusCircle,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  Wrench,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
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
import type { SkillDirectoryItem, UserProfile, UserSkill } from "@/types/user";

type MySkillsMode = "list" | "create" | "detail";
type SkillsTab = "overview" | "manage";

export default function MySkillsPage() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [activeTab, setActiveTab] = useState<SkillsTab>("overview");
  const [mode, setMode] = useState<MySkillsMode>("list");
  const [selectedSkillId, setSelectedSkillId] = useState<number | null>(null);
  const [keyword, setKeyword] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [skills, setSkills] = useState<UserSkill[]>([]);
  const [skillDirectory, setSkillDirectory] = useState<SkillDirectoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);

  const [newSkillId, setNewSkillId] = useState("");
  const [newSkillLevel, setNewSkillLevel] = useState("3");
  const [levelDrafts, setLevelDrafts] = useState<Record<number, string>>({});

  const averageLevel = useMemo(
    () => (skills.length === 0 ? 0 : Number((skills.reduce((sum, skill) => sum + skill.level, 0) / skills.length).toFixed(1))),
    [skills],
  );

  const filteredSkills = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    if (!normalizedKeyword) {
      return skills;
    }
    return skills.filter((skill) =>
      skill.name.toLowerCase().includes(normalizedKeyword) || String(skill.skillId).includes(normalizedKeyword),
    );
  }, [keyword, skills]);

  const totalElements = filteredSkills.length;
  const totalPages = useMemo(() => Math.max(1, Math.ceil(totalElements / pageSize)), [totalElements, pageSize]);

  const paginatedSkills = useMemo(() => {
    const safePage = Math.min(currentPage, Math.max(totalPages - 1, 0));
    const start = safePage * pageSize;
    return filteredSkills.slice(start, start + pageSize);
  }, [currentPage, filteredSkills, pageSize, totalPages]);

  const selectedSkill = useMemo(
    () => skills.find((skill) => skill.skillId === selectedSkillId) ?? null,
    [selectedSkillId, skills],
  );

  const addableSkills = useMemo(() => {
    const existingSkillIds = new Set(skills.map((skill) => skill.skillId));
    return skillDirectory.filter((item) => !existingSkillIds.has(item.id));
  }, [skillDirectory, skills]);

  const loadPageData = async () => {
    setIsLoading(true);
    try {
      const [profileResponse, skillsResponse, directoryResponse] = await Promise.all([
        profileService.getMe(),
        skillService.getMySkills(),
        skillService.getSkillDirectory(),
      ]);

      setProfile(profileResponse.data);
      setSkills(skillsResponse.data);
      setSkillDirectory(directoryResponse.data);
      setLevelDrafts(
        Object.fromEntries(skillsResponse.data.map((skill) => [skill.skillId, String(skill.level)])),
      );

      const existingSkillIds = new Set(skillsResponse.data.map((skill) => skill.skillId));
      const firstSelectable = directoryResponse.data.find((item) => !existingSkillIds.has(item.id));
      setNewSkillId(firstSelectable ? String(firstSelectable.id) : "");

      if (selectedSkillId && !skillsResponse.data.some((skill) => skill.skillId === selectedSkillId)) {
        setSelectedSkillId(null);
        setMode("list");
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadPageData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedSkill) {
      setMode("detail");
      setLevelDrafts((prev) => ({
        ...prev,
        [selectedSkill.skillId]: String(selectedSkill.level),
      }));
    }
  }, [selectedSkill]);

  useEffect(() => {
    if (currentPage > totalPages - 1) {
      setCurrentPage(Math.max(0, totalPages - 1));
    }
  }, [currentPage, totalPages]);

  const handleModeChange = (newMode: MySkillsMode) => {
    if (newMode === "list") {
      setSelectedSkillId(null);
    }
    if (newMode === "create" && addableSkills.length > 0 && !newSkillId) {
      setNewSkillId(String(addableSkills[0].id));
    }
    setMode(newMode);
  };

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCurrentPage(0);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(0);
  };

  const handleAddSkill = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsedSkillId = Number(newSkillId);
    if (Number.isNaN(parsedSkillId) || parsedSkillId <= 0) {
      toast.error(t("skills.select_skill_required", { defaultValue: "Please choose a skill from the system directory" }));
      return;
    }

    const parsedLevel = Number(newSkillLevel);
    if (Number.isNaN(parsedLevel) || parsedLevel < 1 || parsedLevel > 5) {
      toast.error(t("skills.level_invalid", { defaultValue: "Level must be between 1 and 5" }));
      return;
    }

    setIsMutating(true);
    try {
      await skillService.addMySkill({
        skillId: parsedSkillId,
        level: parsedLevel,
      });
      toast.success(t("skills.add_success"));
      setNewSkillLevel("3");
      await loadPageData();
      setMode("list");
      setCurrentPage(0);
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
    const shouldDelete = await confirm({
      title: t("skills.delete_title", { defaultValue: "Xóa kỹ năng" }),
      message: t("skills.delete_confirm", { defaultValue: "Are you sure you want to delete this skill?" }),
      variant: "destructive",
    });
    if (!shouldDelete) {
      return;
    }

    setIsMutating(true);
    try {
      await skillService.deleteMySkill(skillId);
      toast.success(t("skills.delete_success", { defaultValue: "Skill deleted" }));
      await loadPageData();
      if (selectedSkillId === skillId) {
        setSelectedSkillId(null);
        setMode("list");
      }
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
          <p className="text-muted-foreground">{t("skills.desc")}</p>
        </div>

        <div className="flex items-center gap-2">
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

          <Button
            type="button"
            className="gap-2"
            onClick={() => handleModeChange(mode === "create" ? "list" : "create")}
            disabled={isMutating || isLoading || activeTab !== "manage"}
          >
            <PlusCircle className="h-4 w-4" />
            {mode === "create" ? t("projects.cancel_btn") : t("skills.add_title")}
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="gap-2"
            onClick={() => void loadPageData()}
            disabled={isMutating || isLoading}
          >
            <RefreshCw className="h-4 w-4" />
            {t("skills.reload_btn")}
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
            <Badge variant="secondary">Avg: {averageLevel}</Badge>
          </div>
          <p className="text-muted-foreground">{t("skills.api_note")}</p>
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
        <div className="grid gap-4 xl:grid-cols-3">
          <Card className={mode === "list" ? "xl:col-span-3 transition-all duration-300" : "xl:col-span-2 transition-all duration-300"}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                {t("skills.list_title")}
              </CardTitle>
              <CardDescription>
                {t("skills.total_skills", { defaultValue: "Total Skills" })}: {totalElements} | {t("admin.page", { page: currentPage + 1, totalPages })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="mb-4 flex gap-2">
                <Input
                  placeholder={t("admin.skills.search")}
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  className="max-w-sm"
                />
                <Button type="submit" variant="secondary" className="gap-2 shrink-0" disabled={isLoading}>
                  <Search className="h-4 w-4" />
                  {t("admin.skills.search_btn")}
                </Button>
              </form>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>{t("skills.col_skill")}</TableHead>
                    <TableHead>{t("skills.col_level")}</TableHead>
                    <TableHead>{t("admin.col_status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedSkills.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                        {t("skills.no_data")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedSkills.map((skill) => (
                      <TableRow
                        key={skill.skillId}
                        className={selectedSkillId === skill.skillId ? "cursor-pointer bg-accent/40" : "cursor-pointer"}
                        onClick={() => {
                          if (selectedSkillId === skill.skillId) {
                            handleModeChange("list");
                          } else {
                            setSelectedSkillId(skill.skillId);
                          }
                        }}
                      >
                        <TableCell className="font-medium">{skill.skillId}</TableCell>
                        <TableCell className="font-semibold">{skill.name}</TableCell>
                        <TableCell>{skill.level}</TableCell>
                        <TableCell>
                          <Badge variant="default">{t("admin.skills.status_active")}</Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{t("projects.show")}</span>
                  <select
                    className="h-8 rounded-md border bg-background px-2 py-1 text-sm"
                    value={pageSize}
                    onChange={(event) => handlePageSizeChange(Number(event.target.value))}
                    aria-label={t("projects.show")}
                    title={t("projects.show")}
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                  <span>{t("projects.rows")}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
                    disabled={currentPage === 0 || isMutating || isLoading}
                  >
                    {t("projects.btn_prev")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1))}
                    disabled={currentPage >= totalPages - 1 || isMutating || isLoading}
                  >
                    {t("projects.btn_next")}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {mode !== "list" && (
            <div className="space-y-4">
              {mode === "create" && (
                <Card className="animate-in slide-in-from-right-8 duration-300">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between gap-2 text-base">
                      <div className="flex items-center gap-2">
                        <PlusCircle className="h-4 w-4" />
                        {t("skills.add_title")}
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => handleModeChange("list")} className="h-6 w-6">
                        <X className="h-4 w-4" />
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form className="space-y-3" onSubmit={handleAddSkill}>
                      <div className="space-y-1.5">
                        <Label htmlFor="newSkillId">{t("skills.col_skill")}</Label>
                        <select
                          id="newSkillId"
                          name="newSkillId"
                          value={newSkillId}
                          onChange={(event) => setNewSkillId(event.target.value)}
                          className="h-10 w-full rounded-md border bg-background px-3 py-2 text-sm"
                          aria-label={t("skills.select_skill")}
                          title={t("skills.select_skill")}
                          required
                        >
                          <option value="">{t("skills.select_skill_placeholder", { defaultValue: "Select a skill" })}</option>
                          {addableSkills.map((skill) => (
                            <option key={skill.id} value={skill.id}>
                              {skill.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="newSkillLevel">{t("skills.select_level")}</Label>
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

                      <Button type="submit" className="w-full gap-2" disabled={isMutating || addableSkills.length === 0 || !newSkillId}>
                        <PlusCircle className="h-4 w-4" />
                        {t("skills.add_btn")}
                      </Button>
                    </form>

                    {addableSkills.length === 0 && (
                      <p className="mt-3 text-sm text-muted-foreground">
                        {t("skills.directory_empty")}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              {mode === "detail" && (
                <Card className="animate-in slide-in-from-right-8 duration-300">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between gap-2 text-base">
                      <div className="flex items-center gap-2">
                        <Wrench className="h-4 w-4" />
                        {t("skills.action_edit")}
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => handleModeChange("list")} className="h-6 w-6">
                        <X className="h-4 w-4" />
                      </Button>
                    </CardTitle>
                    <CardDescription>
                      {selectedSkill ? `${selectedSkill.name} (#${selectedSkill.skillId})` : t("projects.detail_empty")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {!selectedSkill ? (
                      <p className="text-sm text-muted-foreground">{t("projects.detail_empty")}</p>
                    ) : (
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="editSkillLevel">{t("skills.col_level")}</Label>
                          <Input
                            id="editSkillLevel"
                            type="number"
                            min={1}
                            max={5}
                            value={levelDrafts[selectedSkill.skillId] ?? String(selectedSkill.level)}
                            onChange={(event) =>
                              setLevelDrafts((prev) => ({
                                ...prev,
                                [selectedSkill.skillId]: event.target.value,
                              }))
                            }
                          />
                        </div>

                        <Button
                          type="button"
                          className="w-full gap-2"
                          variant="outline"
                          disabled={isMutating}
                          onClick={() => void handleUpdateSkill(selectedSkill.skillId)}
                        >
                          <Wrench className="h-4 w-4" />
                          {t("skills.action_edit")}
                        </Button>

                        <Button
                          type="button"
                          className="w-full gap-2"
                          variant="destructive"
                          disabled={isMutating}
                          onClick={() => void handleDeleteSkill(selectedSkill.skillId)}
                        >
                          <Trash2 className="h-4 w-4" />
                          {t("skills.action_delete")}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import {
  Code,
  Loader2,
  PlusCircle,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
  Wrench,
  X
} from "lucide-react";
import { toast } from "react-toastify";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePaginatedSplitView } from "@/hooks/usePaginatedSplitView";
import { getApiErrorMessage } from "@/lib/http";
import { adminSkillService } from "@/services/admin.service";
import type { AdminSkillResponse } from "@/types/admin";

export default function AdminGlobalSkillsPage() {
  const { t } = useTranslation();
  const confirm = useConfirm();

  const {
    items: skills,
    totalElements,
    currentPage,
    pageSize,
    keyword,
    setKeyword,
    selectedId: selectedSkillId,
    setSelectedId: setSelectedSkillId,
    selectedItem: selectedSkill,
    mode,
    setMode,
    isLoading,
    isMutating,
    setIsMutating,
    totalPages,
    loadList: loadSkillsList,
    handleModeChange,
    handlePageSizeChange,
    handleSearch,
  } = usePaginatedSplitView<AdminSkillResponse>({
    fetchItems: async (page, size, kw) => (await adminSkillService.getAllSkills(kw, page, size)).data,
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  // Form Create
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");

  // Form Edit
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  useEffect(() => {
    void loadSkillsList(0, pageSize, keyword);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Initial load

  useEffect(() => {
    if (selectedSkill) {
      setMode("detail");
      setEditName(selectedSkill.name);
      setEditDescription(selectedSkill.description || "");
    }
  }, [selectedSkill, setMode]);

  const handleCreateSkill = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!createName.trim()) return;

    setIsMutating(true);
    try {
      await adminSkillService.createSkill({
        name: createName.trim(),
        description: createDescription.trim() || undefined,
      });

      toast.success(t("admin.create_success"));
      setCreateName("");
      setCreateDescription("");
      setMode("list");
      await loadSkillsList(0, pageSize, keyword);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsMutating(false);
    }
  };

  const handleUpdateSkill = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedSkillId) return;

    setIsMutating(true);
    try {
      await adminSkillService.updateSkill(selectedSkillId, {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
      });
      toast.success(t("admin.update_success"));
      setMode("list");
      await loadSkillsList(currentPage, pageSize, keyword);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsMutating(false);
    }
  };

  const handleDeactivate = async (id: number) => {
    const isConfirm = await confirm({
      title: t("admin.skills.delete_title", { defaultValue: "Xóa kỹ năng hệ thống" }),
      message: t("admin.skills.delete_confirm", { defaultValue: "Are you sure you want to delete this skill?" }),
      variant: "destructive",
    });
    if (!isConfirm) return;

    setIsMutating(true);
    try {
      await adminSkillService.deleteSkill(id);
      toast.success(t("admin.skills.delete_success", { defaultValue: "Skill deleted" }));
      await loadSkillsList(currentPage, pageSize, keyword);
      if (selectedSkillId === id) {
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
    <div className="min-h-screen space-y-6 p-4 sm:p-6 md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("admin.global_skills")}</h1>
          <p className="text-muted-foreground">{t("admin.skills.desc")} </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            className="gap-2"
            onClick={() => handleModeChange(mode === "create" ? "list" : "create")}
            disabled={isMutating || isLoading}
          >
            <PlusCircle className="h-4 w-4" />
            {mode === "create" ? t("projects.cancel_btn") : t("admin.skills.create_title")}
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="gap-2"
            onClick={() => void loadSkillsList(currentPage, pageSize, keyword)}
            disabled={isMutating || isLoading}
          >
            <RefreshCw className="h-4 w-4" />
            {t("skills.reload_btn")}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className={mode === "list" ? "xl:col-span-3 transition-all duration-300" : "xl:col-span-2 transition-all duration-300"}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              {t("admin.global_skills")}
            </CardTitle>
            <CardDescription>
              {t("admin.skills.total", { total: totalElements })} {t("admin.page", { page: currentPage + 1, totalPages })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="mb-4 flex gap-2">
              <Input
                placeholder={t("admin.skills.search")}
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="max-w-sm"
              />
              <Button type="submit" variant="secondary" className="gap-2 shrink-0" disabled={isLoading}>
                <Search className="h-4 w-4" />
                {t("admin.skills.search_btn")}
              </Button>
            </form>

            {isLoading ? (
              <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("dashboard.loading")}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                <Table className="min-w-[600px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("admin.col_id")}</TableHead>
                      <TableHead>{t("admin.col_name")}</TableHead>
                      <TableHead>{t("admin.skills.desc_label")}</TableHead>
                      <TableHead>{t("admin.col_status")}</TableHead>
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
                        <TableRow
                          key={skill.id}
                          className={selectedSkillId === skill.id ? "bg-accent/40 cursor-pointer" : "cursor-pointer"}
                          onClick={() => {
                            if (selectedSkillId === skill.id) {
                              handleModeChange("list");
                            } else {
                              setSelectedSkillId(skill.id);
                            }
                          }}
                        >
                          <TableCell className="font-medium">{skill.id}</TableCell>
                          <TableCell className="font-semibold">{skill.name}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{skill.description || "-"}</TableCell>
                          <TableCell>
                            <Badge variant={skill.isActive ? "default" : "destructive"}>
                              {skill.isActive ? t("admin.skills.status_active") : t("admin.skills.status_inactive")}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{t("projects.show")}</span>
                    <select
                      className="h-8 rounded-md border bg-background px-2 py-1 text-sm"
                      value={pageSize}
                      onChange={(e) => handlePageSizeChange(Number(e.target.value))}
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
                      onClick={() => void loadSkillsList(Math.max(0, currentPage - 1), pageSize, keyword)}
                      disabled={currentPage === 0 || isMutating || isLoading}
                    >
                      {t("projects.btn_prev")}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void loadSkillsList(Math.min(totalPages - 1, currentPage + 1), pageSize, keyword)}
                      disabled={currentPage >= totalPages - 1 || isMutating || isLoading}
                    >
                      {t("projects.btn_next")}
                    </Button>
                  </div>
                </div>
              </>
            )}
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
                      {t("admin.skills.create_title")}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleModeChange("list")} className="h-6 w-6">
                      <X className="h-4 w-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form className="space-y-3" onSubmit={handleCreateSkill}>
                    <div className="space-y-1.5">
                      <Label htmlFor="createName">{t("admin.col_name")}</Label>
                      <Input
                        id="createName"
                        value={createName}
                        onChange={(event) => setCreateName(event.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="createDesc">{t("admin.skills.desc_label")}</Label>
                      <textarea
                        id="createDesc"
                        value={createDescription}
                        onChange={(event) => setCreateDescription(event.target.value)}
                        rows={3}
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      />
                    </div>

                    <Button type="submit" className="w-full gap-2" disabled={isMutating}>
                      <PlusCircle className="h-4 w-4" />
                      {t("admin.create_btn")}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            {mode === "detail" && (
              <Card className="animate-in slide-in-from-right-8 duration-300">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-2 text-base">
                    <div className="flex items-center gap-2">
                      <Wrench className="h-4 w-4" />
                      {t("admin.skills.detail_title")}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleModeChange("list")} className="h-6 w-6">
                      <X className="h-4 w-4" />
                    </Button>
                  </CardTitle>
                  <CardDescription>
                    {selectedSkill ? selectedSkill.name : t("admin.detail_empty")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!selectedSkill ? (
                    <p className="text-sm text-muted-foreground">{t("projects.detail_empty")}</p>
                  ) : (
                    <div className="space-y-4">
                      <form className="space-y-3" onSubmit={handleUpdateSkill}>
                        <div className="space-y-1.5">
                          <Label htmlFor="editName">{t("admin.col_name")}</Label>
                          <Input
                            id="editName"
                            value={editName}
                            onChange={(event) => setEditName(event.target.value)}
                            required
                            disabled={!selectedSkill.isActive}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="editDesc">{t("admin.skills.desc_label")}</Label>
                          <textarea
                            id="editDesc"
                            value={editDescription}
                            onChange={(event) => setEditDescription(event.target.value)}
                            rows={3}
                            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                            disabled={!selectedSkill.isActive}
                          />
                        </div>

                        <Button type="submit" className="w-full gap-2" variant="outline" disabled={isMutating || !selectedSkill.isActive}>
                          <ShieldAlert className="h-4 w-4" />
                          {t("admin.update_btn")}
                        </Button>
                      </form>

                      <div className="flex gap-2">
                        <Button
                          type="button"
                          className="w-full gap-2"
                          variant="destructive"
                          disabled={isMutating || !selectedSkill.isActive}
                          onClick={() => void handleDeactivate(selectedSkill.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                          {t("admin.deactivate_btn")}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

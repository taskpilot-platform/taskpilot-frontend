import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import {
  Loader2,
  PlusCircle,
  RefreshCw,
  Search,
  Settings,
  ShieldAlert,
  SlidersHorizontal,
  X
} from "lucide-react";
import { toast } from "react-toastify";

import { Button } from "@/components/ui/button";
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
import { getApiErrorMessage } from "@/lib/http";
import { adminSettingsService } from "@/services/admin.service";
import type { SystemSettingResponse } from "@/types/admin";

export default function AdminSettingsPage() {
  const { t } = useTranslation();

  const [settings, setSettings] = useState<SystemSettingResponse[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [mode, setMode] = useState<"list" | "create" | "detail">("list");
  const [keyword, setKeyword] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);

  // Form Create
  const [createKeyStr, setCreateKeyStr] = useState("");
  const [createValueStr, setCreateValueStr] = useState("");
  const [createDescription, setCreateDescription] = useState("");

  // Form Edit
  const [editValueStr, setEditValueStr] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const selectedSetting = useMemo(
    () => settings.find((s) => s.keyName === selectedKey) || null,
    [settings, selectedKey],
  );

  const filteredSettings = useMemo(() => {
    if (!keyword.trim()) return settings;
    const lower = keyword.toLowerCase();
    return settings.filter(
      (s) => s.keyName?.toLowerCase().includes(lower) || s.description?.toLowerCase().includes(lower)
    );
  }, [settings, keyword]);

  const loadSettingsList = async () => {
    setIsLoading(true);
    try {
      const response = await adminSettingsService.getAllSettings();
      setSettings(response.data);

      if (response.data.length === 0) {
        setSelectedKey(null);
        setMode("list");
      } else if (selectedKey && !response.data.some((s) => s.keyName === selectedKey)) {
        setSelectedKey(null);
        setMode("list");
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadSettingsList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedSetting) {
      setMode("detail");
      try {
        setEditValueStr(JSON.stringify(selectedSetting.valueJson, null, 2));
      } catch {
        setEditValueStr(String(selectedSetting.valueJson));
      }
      setEditDescription(selectedSetting.description || "");
    }
  }, [selectedSetting]);

  const handleModeChange = (newMode: "create" | "list" | "detail") => {
    if (newMode === "list" || newMode === "create") {
      setSelectedKey(null);
    }
    setMode(newMode);
  };

  const handleCreateSetting = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!createKeyStr.trim()) return;

    let parsedValue = null;
    try {
      parsedValue = JSON.parse(createValueStr);
    } catch {
      toast.error(t("admin.system_settings.json_invalid", { defaultValue: "Invalid JSON format" }));
      return;
    }

    setIsMutating(true);
    try {
      await adminSettingsService.updateSetting({
        keyName: createKeyStr.trim(),
        valueJson: parsedValue,
        description: createDescription.trim() || undefined,
      });

      toast.success(t("projects.create_success"));
      setCreateKeyStr("");
      setCreateValueStr("");
      setCreateDescription("");
      setMode("list");
      await loadSettingsList();
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsMutating(false);
    }
  };

  const handleUpdateSetting = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedKey) return;

    let parsedValue = null;
    try {
      parsedValue = JSON.parse(editValueStr);
    } catch {
      toast.error(t("admin.system_settings.json_invalid", { defaultValue: "Invalid JSON format" }));
      return;
    }

    setIsMutating(true);
    try {
      await adminSettingsService.updateSetting({
        keyName: selectedKey,
        valueJson: parsedValue,
        description: editDescription.trim() || undefined,
      });

      toast.success(t("projects.update_success"));
      setMode("list");
      await loadSettingsList();
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
          <h1 className="text-3xl font-bold tracking-tight">{t("admin.system_settings.title")}</h1>
          <p className="text-muted-foreground">{t("admin.system_settings.desc")}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            className="gap-2"
            onClick={() => handleModeChange(mode === "create" ? "list" : "create")}
            disabled={isMutating || isLoading}
          >
            <PlusCircle className="h-4 w-4" />
            {mode === "create" ? t("projects.cancel_btn") : t("admin.system_settings.create_title")}
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="gap-2"
            onClick={() => void loadSettingsList()}
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
              <Settings className="h-5 w-5" />
              {t("admin.system_settings.title")}
            </CardTitle>
            <CardDescription>
              {t("admin.system_settings.total", { total: settings.length })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex gap-2">
              <Input
                placeholder={t("admin.system_settings.search")}
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="max-w-sm"
              />
              <Button type="button" variant="secondary" size="icon" disabled={isLoading}>
                <Search className="h-4 w-4" />
              </Button>
            </div>

            {isLoading ? (
              <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("dashboard.loading")}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("admin.system_settings.key_name")}</TableHead>
                    <TableHead>{t("admin.system_settings.value_json")}</TableHead>
                    <TableHead>{t("admin.system_settings.desc_label")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSettings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                        {t("skills.no_data")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSettings.map((setting) => (
                      <TableRow
                        key={setting.keyName}
                        className={selectedKey === setting.keyName ? "bg-accent/40 cursor-pointer" : "cursor-pointer"}
                        onClick={() => {
                          if (selectedKey === setting.keyName) {
                            handleModeChange("list");
                          } else {
                            setSelectedKey(setting.keyName);
                          }
                        }}
                      >
                        <TableCell className="font-semibold text-primary">{setting.keyName}</TableCell>
                        <TableCell className="max-w-[200px] truncate text-xs font-mono">
                          {JSON.stringify(setting.valueJson)}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">{setting.description || "-"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
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
                      {t("admin.system_settings.create_title")}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleModeChange("list")} className="h-6 w-6">
                      <X className="h-4 w-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form className="space-y-4" onSubmit={handleCreateSetting}>
                    <div className="space-y-1.5">
                      <Label htmlFor="createKeyStr">{t("admin.system_settings.key_name")}</Label>
                      <Input
                        id="createKeyStr"
                        value={createKeyStr}
                        onChange={(event) => setCreateKeyStr(event.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="createValue">{t("admin.system_settings.value_json")}</Label>
                      <textarea
                        id="createValue"
                        value={createValueStr}
                        onChange={(event) => setCreateValueStr(event.target.value)}
                        rows={6}
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono"
                        required
                        placeholder='{"key": "value"}'
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="createDesc">{t("admin.system_settings.desc_label")}</Label>
                      <Input
                        id="createDesc"
                        value={createDescription}
                        onChange={(event) => setCreateDescription(event.target.value)}
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
                      <SlidersHorizontal className="h-4 w-4" />
                      {t("admin.system_settings.detail_title")}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleModeChange("list")} className="h-6 w-6">
                      <X className="h-4 w-4" />
                    </Button>
                  </CardTitle>
                  <CardDescription>
                    {selectedSetting ? selectedSetting.keyName : t("admin.detail_empty")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!selectedSetting ? (
                    <p className="text-sm text-muted-foreground">{t("projects.detail_empty")}</p>
                  ) : (
                    <div className="space-y-4">
                      <form className="space-y-4" onSubmit={handleUpdateSetting}>
                        <div className="space-y-1.5">
                          <Label htmlFor="editValue">{t("admin.system_settings.value_json")}</Label>
                          <textarea
                            id="editValue"
                            value={editValueStr}
                            onChange={(event) => setEditValueStr(event.target.value)}
                            rows={10}
                            className="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono"
                            required
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="editDesc">{t("admin.system_settings.desc_label")}</Label>
                          <Input
                            id="editDesc"
                            value={editDescription}
                            onChange={(event) => setEditDescription(event.target.value)}
                          />
                        </div>

                        <Button type="submit" className="w-full gap-2" variant="outline" disabled={isMutating}>
                          <ShieldAlert className="h-4 w-4" />
                          {t("admin.update_btn")}
                        </Button>
                      </form>
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

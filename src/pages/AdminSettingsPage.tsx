import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import {
  Loader2,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const [mode, setMode] = useState<"list" | "detail">("list");
  const [searchInput, setSearchInput] = useState("");
  const [keyword, setKeyword] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);

  // States for custom UI
  const [weightsState, setWeightsState] = useState<Record<string, { fit: number; load: number; perf: number }>>({
    BALANCED: { fit: 0.33, load: 0.33, perf: 0.33 },
    URGENT: { fit: 0.33, load: 0.33, perf: 0.33 },
    TRAINING: { fit: 0.33, load: 0.33, perf: 0.33 }
  });

  const [normalizationState, setNormalizationState] = useState<Record<string, { fit: string; load: string; perf: string }>>({
    BALANCED: { fit: "BENCHMARK_BENEFIT", load: "BENCHMARK_BENEFIT", perf: "BENCHMARK_BENEFIT" },
    URGENT: { fit: "BENCHMARK_BENEFIT", load: "BENCHMARK_BENEFIT", perf: "BENCHMARK_BENEFIT" },
    TRAINING: { fit: "BENCHMARK_BENEFIT", load: "BENCHMARK_BENEFIT", perf: "BENCHMARK_BENEFIT" }
  });

  const [currentModeState, setCurrentModeState] = useState<string>("BALANCED");
  const [whitelistIpsState, setWhitelistIpsState] = useState<string>("");
  const [fallbackValueStr, setFallbackValueStr] = useState<string>("");

  const selectedSetting = useMemo(
    () => settings.find((s) => s.keyName === selectedKey) || null,
    [settings, selectedKey],
  );

  const loadSettingsList = async (kw = keyword) => {
    setIsLoading(true);
    try {
      const response = await adminSettingsService.getAllSettings(kw);
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

  // Helper getters/setters for weights
  function getWeightValue(modeObj: any, type: 'fit' | 'load' | 'perf'): number {
    if (!modeObj) return 0.33;
    if (type === 'fit') return modeObj.w_fit !== undefined ? modeObj.w_fit : (modeObj.fit !== undefined ? modeObj.fit : modeObj.skill ?? 0.33);
    if (type === 'load') return modeObj.w_load !== undefined ? modeObj.w_load : (modeObj.load !== undefined ? modeObj.load : modeObj.workload ?? 0.33);
    return modeObj.w_perf !== undefined ? modeObj.w_perf : (modeObj.perf !== undefined ? modeObj.perf : modeObj.performance ?? modeObj.availability ?? 0.33);
  }

  function setWeightValue(modeObj: any, type: 'fit' | 'load' | 'perf', val: number) {
    const res = { ...modeObj };
    if (type === 'fit') {
      if (res.w_fit !== undefined) res.w_fit = val;
      else if (res.fit !== undefined) res.fit = val;
      else if (res.skill !== undefined) res.skill = val;
      else res.w_fit = val;
    } else if (type === 'load') {
      if (res.w_load !== undefined) res.w_load = val;
      else if (res.load !== undefined) res.load = val;
      else if (res.workload !== undefined) res.workload = val;
      else res.w_load = val;
    } else {
      if (res.w_perf !== undefined) res.w_perf = val;
      else if (res.perf !== undefined) res.perf = val;
      else if (res.performance !== undefined) res.performance = val;
      else if (res.availability !== undefined) res.availability = val;
      else res.w_perf = val;
    }
    return res;
  }

  // Sync to states when setting selection changes
  useEffect(() => {
    if (selectedSetting) {
      setMode("detail");
      const key = selectedSetting.keyName;
      const val = selectedSetting.valueJson;

      if (key === "heuristic.weights") {
        const modes = ["BALANCED", "URGENT", "TRAINING"];
        const newWeights = { ...weightsState };
        modes.forEach(m => {
          const modeObj = val && typeof val === "object" ? (val as any)[m] : null;
          newWeights[m] = {
            fit: getWeightValue(modeObj, 'fit'),
            load: getWeightValue(modeObj, 'load'),
            perf: getWeightValue(modeObj, 'perf')
          };
        });
        setWeightsState(newWeights);
      } else if (key === "heuristic.normalization") {
        const modes = ["BALANCED", "URGENT", "TRAINING"];
        const newNorm = { ...normalizationState };
        modes.forEach(m => {
          const modeObj = val && typeof val === "object" ? (val as any)[m] : null;
          newNorm[m] = {
            fit: modeObj?.fit || "BENCHMARK_BENEFIT",
            load: modeObj?.load || "BENCHMARK_BENEFIT",
            perf: modeObj?.perf || "BENCHMARK_BENEFIT"
          };
        });
        setNormalizationState(newNorm);
      } else if (key === "heuristic.current_mode") {
        let modeVal = "BALANCED";
        if (val && typeof val === "object") {
          modeVal = (val as any).mode || (val as any).current_mode || (val as any).value || "BALANCED";
        } else if (typeof val === "string") {
          modeVal = val;
        }
        setCurrentModeState(modeVal.toUpperCase());
      } else if (key === "whitelist_ips") {
        if (Array.isArray(val)) {
          setWhitelistIpsState(val.join("\n"));
        } else {
          setWhitelistIpsState("");
        }
      } else {
        setFallbackValueStr(JSON.stringify(val, null, 2));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSetting]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const kw = searchInput.trim();
    setKeyword(kw);
    void loadSettingsList(kw);
  };

  const handleModeChange = (newMode: "list" | "detail") => {
    if (newMode === "list") {
      setSelectedKey(null);
    }
    setMode(newMode);
  };

  const handleUpdateSetting = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedKey || !selectedSetting) return;

    let payloadValue: any = null;

    if (selectedKey === "heuristic.weights") {
      const origVal = selectedSetting.valueJson as any;
      payloadValue = {};
      ["BALANCED", "URGENT", "TRAINING"].forEach(m => {
        const origModeObj = origVal && typeof origVal === "object" ? origVal[m] : {};
        let updatedModeObj = { ...origModeObj };
        updatedModeObj = setWeightValue(updatedModeObj, 'fit', weightsState[m].fit);
        updatedModeObj = setWeightValue(updatedModeObj, 'load', weightsState[m].load);
        updatedModeObj = setWeightValue(updatedModeObj, 'perf', weightsState[m].perf);
        payloadValue[m] = updatedModeObj;
      });
    } else if (selectedKey === "heuristic.normalization") {
      payloadValue = {
        BALANCED: { ...normalizationState.BALANCED },
        URGENT: { ...normalizationState.URGENT },
        TRAINING: { ...normalizationState.TRAINING }
      };
    } else if (selectedKey === "heuristic.current_mode") {
      const origVal = selectedSetting.valueJson as any;
      let modeKey = "mode";
      if (origVal && typeof origVal === "object") {
        if (origVal.current_mode !== undefined) modeKey = "current_mode";
        else if (origVal.value !== undefined) modeKey = "value";
      }
      payloadValue = { [modeKey]: currentModeState };
    } else if (selectedKey === "whitelist_ips") {
      payloadValue = whitelistIpsState
        .split("\n")
        .map(ip => ip.trim())
        .filter(ip => ip.length > 0);
    } else {
      try {
        payloadValue = JSON.parse(fallbackValueStr);
      } catch {
        toast.error(t("admin.system_settings.json_invalid", { defaultValue: "Dữ liệu JSON không hợp lệ" }));
        return;
      }
    }

    setIsMutating(true);
    try {
      await adminSettingsService.updateSetting({
        keyName: selectedKey,
        valueJson: payloadValue,
        description: selectedSetting.description || undefined,
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

  // Static Configuration descriptions
  function getConfigDescription(key: string) {
    switch (key) {
      case "heuristic.weights":
        return "Trọng số ưu tiên (tỉ lệ đóng góp) của các yếu tố khi tính toán điểm phân công công việc tự động cho các chế độ. Thiết lập này ảnh hưởng trực tiếp đến kết quả gợi ý phân công công việc tự động từ AI.";
      case "heuristic.normalization":
        return "Thuật toán chuẩn hóa điểm thành phần (Kỹ năng, Tải việc, Hiệu suất) trước khi nhân trọng số cho từng chế độ. BENEFIT dùng cho chỉ số càng cao càng tốt (như kỹ năng, hiệu suất), COST dùng cho chỉ số càng thấp càng tốt (như tải công việc hiện tại).";
      case "heuristic.current_mode":
        return "Thiết lập chế độ hoạt động hiện hành của hệ thống phân công công việc tự động bằng AI.";
      case "whitelist_ips":
        return "Danh sách các địa chỉ IP được cấp quyền truy cập đặc cách hoặc kết nối trực tiếp đến hệ thống (IP Whitelist).";
      default:
        return selectedSetting?.description || "Không có mô tả.";
    }
  }

  // Static Configuration value ranges
  function getConfigValueRange(key: string) {
    switch (key) {
      case "heuristic.weights":
        return "Số thực lớn hơn hoặc bằng 0 (khuyên dùng từ 0.0 đến 1.0). Hệ thống sẽ tự động chuẩn hóa tổng 3 trọng số của mỗi chế độ về 1.0.";
      case "heuristic.normalization":
        return "Lựa chọn BENEFIT hoặc COST.";
      case "heuristic.current_mode":
        return "Chọn một trong các chế độ: Cân bằng (BALANCED), Khẩn cấp (URGENT), Đào tạo (TRAINING).";
      case "whitelist_ips":
        return "Nhập các địa chỉ IP hợp lệ (IPv4 hoặc IPv6), mỗi địa chỉ IP nằm trên một dòng riêng biệt.";
      default:
        return "Phụ thuộc vào loại cấu hình cụ thể.";
    }
  }

  // Handler to update weights state
  const updateWeight = (mode: string, field: 'fit' | 'load' | 'perf', value: number) => {
    setWeightsState(prev => ({
      ...prev,
      [mode]: {
        ...prev[mode],
        [field]: value
      }
    }));
  };

  // Handler to update normalization state
  const updateNormalization = (mode: string, field: 'fit' | 'load' | 'perf', value: string) => {
    setNormalizationState(prev => ({
      ...prev,
      [mode]: {
        ...prev[mode],
        [field]: value
      }
    }));
  };

  // Render form fields dynamically
  function renderDynamicFields() {
    if (!selectedKey) return null;

    if (selectedKey === "heuristic.weights") {
      return (
        <div className="space-y-4">
          {["BALANCED", "URGENT", "TRAINING"].map((m) => (
            <div key={m} className="space-y-3 rounded-lg border border-border/40 p-3.5 bg-background/50">
              <div className="text-xs font-bold text-primary tracking-wider uppercase">
                {m === "BALANCED" ? "Cân bằng (BALANCED)" : m === "URGENT" ? "Khẩn cấp (URGENT)" : "Đào tạo (TRAINING)"}
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground font-medium">Kỹ năng (Skill)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="1"
                    step="0.01"
                    value={weightsState[m].fit}
                    onChange={(e) => updateWeight(m, 'fit', parseFloat(e.target.value) || 0)}
                    className="h-8 text-xs font-mono"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground font-medium">Tải việc (Load)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="1"
                    step="0.01"
                    value={weightsState[m].load}
                    onChange={(e) => updateWeight(m, 'load', parseFloat(e.target.value) || 0)}
                    className="h-8 text-xs font-mono"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground font-medium">Hiệu suất (Perf)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="1"
                    step="0.01"
                    value={weightsState[m].perf}
                    onChange={(e) => updateWeight(m, 'perf', parseFloat(e.target.value) || 0)}
                    className="h-8 text-xs font-mono"
                    required
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (selectedKey === "heuristic.normalization") {
      return (
        <div className="space-y-4">
          {["BALANCED", "URGENT", "TRAINING"].map((m) => (
            <div key={m} className="space-y-3 rounded-lg border border-border/40 p-3.5 bg-background/50">
              <div className="text-xs font-bold text-primary tracking-wider uppercase">
                {m === "BALANCED" ? "Cân bằng (BALANCED)" : m === "URGENT" ? "Khẩn cấp (URGENT)" : "Đào tạo (TRAINING)"}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground font-medium font-semibold">Kỹ năng</Label>
                  <Select
                    value={normalizationState[m].fit}
                    onValueChange={(val) => updateNormalization(m, 'fit', val)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BENCHMARK_BENEFIT">BENEFIT</SelectItem>
                      <SelectItem value="BENCHMARK_COST">COST</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground font-medium font-semibold">Tải việc</Label>
                  <Select
                    value={normalizationState[m].load}
                    onValueChange={(val) => updateNormalization(m, 'load', val)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BENCHMARK_BENEFIT">BENEFIT</SelectItem>
                      <SelectItem value="BENCHMARK_COST">COST</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground font-medium font-semibold">Hiệu suất</Label>
                  <Select
                    value={normalizationState[m].perf}
                    onValueChange={(val) => updateNormalization(m, 'perf', val)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BENCHMARK_BENEFIT">BENEFIT</SelectItem>
                      <SelectItem value="BENCHMARK_COST">COST</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (selectedKey === "heuristic.current_mode") {
      return (
        <div className="space-y-2">
          <Label htmlFor="currentMode">Chế độ AI hiện tại</Label>
          <Select
            value={currentModeState}
            onValueChange={(val) => setCurrentModeState(val)}
          >
            <SelectTrigger id="currentMode" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="BALANCED">Cân bằng (BALANCED)</SelectItem>
              <SelectItem value="URGENT">Khẩn cấp (URGENT)</SelectItem>
              <SelectItem value="TRAINING">Đào tạo (TRAINING)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    }

    if (selectedKey === "whitelist_ips") {
      return (
        <div className="space-y-2">
          <Label htmlFor="whitelistIps">Danh sách địa chỉ IP (mỗi dòng một IP)</Label>
          <textarea
            id="whitelistIps"
            value={whitelistIpsState}
            onChange={(e) => setWhitelistIpsState(e.target.value)}
            rows={8}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="192.168.1.1&#10;10.0.0.2"
          />
        </div>
      );
    }

    // Fallback editor for other keys
    return (
      <div className="space-y-2">
        <Label htmlFor="fallbackValue">{t("admin.system_settings.value_json")}</Label>
        <textarea
          id="fallbackValue"
          value={fallbackValueStr}
          onChange={(e) => setFallbackValueStr(e.target.value)}
          rows={10}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
          required
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen space-y-6 p-4 sm:p-6 md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("admin.system_settings.title")}</h1>
          <p className="text-muted-foreground">{t("admin.system_settings.desc")}</p>
        </div>

        <div className="flex items-center gap-2">
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
            <form onSubmit={handleSearch} className="mb-4 flex gap-2">
              <Input
                placeholder={t("admin.system_settings.search")}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="max-w-sm"
              />
              <Button type="submit" variant="secondary" className="gap-2 shrink-0" disabled={isLoading}>
                <Search className="h-4 w-4" />
                {t("admin.system_settings.search_btn")}
              </Button>
            </form>

            {isLoading ? (
              <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("dashboard.loading")}
              </div>
            ) : (
              <div className="overflow-x-auto">
              <Table className="min-w-[600px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("admin.system_settings.key_name")}</TableHead>
                    <TableHead>{t("admin.system_settings.value_json")}</TableHead>
                    <TableHead>{t("admin.system_settings.desc_label")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {settings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                        {t("skills.no_data")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    settings.map((setting) => (
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
              </div>
            )}
          </CardContent>
        </Card>

        {mode !== "list" && (
          <div className="space-y-4">
            {mode === "detail" && (
              <Card className="animate-in slide-in-from-right-8 duration-300 shadow-xl border-border/50">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center justify-between gap-2 text-base">
                    <div className="flex items-center gap-2">
                      <SlidersHorizontal className="h-4 w-4 text-primary" />
                      {t("admin.system_settings.detail_title")}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleModeChange("list")} className="h-6 w-6">
                      <X className="h-4 w-4" />
                    </Button>
                  </CardTitle>
                  <CardDescription className="font-mono text-primary font-semibold text-xs pt-1">
                    {selectedSetting ? selectedSetting.keyName : t("admin.detail_empty")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!selectedSetting ? (
                    <p className="text-sm text-muted-foreground">{t("projects.detail_empty")}</p>
                  ) : (
                    <div className="space-y-4">
                      {/* Fixed Description & Info section */}
                      <div className="rounded-lg bg-muted/60 p-4 border border-border/40 text-sm space-y-2">
                        <div className="font-semibold text-foreground flex items-center gap-1.5 text-xs">
                          <Settings className="h-3.5 w-3.5 text-primary" />
                          Mô tả cấu hình
                        </div>
                        <p className="text-muted-foreground leading-relaxed text-xs">
                          {getConfigDescription(selectedKey || "")}
                        </p>
                        <div className="pt-1 text-[11px] text-muted-foreground/80 font-medium">
                          <strong>Miền giá trị:</strong> {getConfigValueRange(selectedKey || "")}
                        </div>
                      </div>

                      <form className="space-y-5" onSubmit={handleUpdateSetting}>
                        {renderDynamicFields()}

                        <Button type="submit" className="w-full gap-2 mt-4" disabled={isMutating}>
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

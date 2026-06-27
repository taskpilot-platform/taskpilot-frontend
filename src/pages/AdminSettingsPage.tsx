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
  X,
  GripVertical
} from "lucide-react";
import { toast } from "react-toastify";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
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

const ALL_SUPPORTED_MODELS = [
  { provider: "GEMINI", model: "gemini-3.5-flash" },
  { provider: "GEMINI", model: "gemini-2.5-flash" },
  { provider: "GEMINI", model: "gemini-3.1-flash-lite" },
  { provider: "GEMINI", model: "gemini-2.5-flash-lite" },
  { provider: "GEMINI", model: "gemini-2.5-pro" },
  { provider: "GEMINI", model: "gemini-2.0-flash" },
  { provider: "GEMINI", model: "gemini-2.0-flash-lite" },
  { provider: "GEMINI", model: "gemini-3.1-pro-preview" },
  { provider: "GEMINI", model: "gemma-4-26b-a4b-it" },
  { provider: "GITHUB", model: "gpt-4o" },
  { provider: "GITHUB", model: "DeepSeek-R1" },
  { provider: "GROQ", model: "meta-llama/llama-4-scout-17b-16e-instruct" },
  { provider: "GROQ", model: "llama-3.3-70b-versatile" },
  { provider: "GROQ", model: "llama-3.1-8b-instant" },
  { provider: "OPENROUTER", model: "google/gemma-4-31b-it:free" },
  { provider: "OPENROUTER", model: "nvidia/nemotron-3-ultra-550b-a55b:free" },
  { provider: "OPENROUTER", model: "poolside/laguna-m.1:free" },
  { provider: "OPENROUTER", model: "openai/gpt-oss-120b:free" },
  { provider: "OPENROUTER", model: "moonshotai/kimi-k2.6:free" },
  { provider: "OPENROUTER", model: "z-ai/glm-4.5-air:free" },
  { provider: "OPENROUTER", model: "poolside/laguna-xs.2:free" },
  { provider: "OPENROUTER", model: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free" },
  { provider: "OPENROUTER", model: "google/gemma-4-26b-a4b-it:free" },
  { provider: "OPENROUTER", model: "openai/gpt-oss-20b:free" }
];

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

  interface PriorityModelItem {
    provider: string;
    model: string;
  }
  const [modelPriorityState, setModelPriorityState] = useState<PriorityModelItem[]>([]);
  const [isPriorityModalOpen, setIsPriorityModalOpen] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);


  const selectedSetting = useMemo(
    () => settings.find((s) => s.keyName === selectedKey) || null,
    [settings, selectedKey],
  );

  const loadSettingsList = async (kw = keyword, silent = false) => {
    if (!silent) setIsLoading(true);
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
      if (!silent) setIsLoading(false);
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
      } else if (key === "ai.model_priority") {
        const dbModels = (val && typeof val === "object" && Array.isArray((val as any).models))
          ? (val as any).models
          : Array.isArray(val) ? val : [];

        const merged: PriorityModelItem[] = [];
        const seen = new Set<string>();

        dbModels.forEach((m: any) => {
          if (m && m.provider && m.model) {
            const keyStr = `${m.provider.toUpperCase()}:${m.model}`;
            if (!seen.has(keyStr)) {
              seen.add(keyStr);
              merged.push({ provider: m.provider.toUpperCase(), model: m.model });
            }
          }
        });

        ALL_SUPPORTED_MODELS.forEach(m => {
          const keyStr = `${m.provider.toUpperCase()}:${m.model}`;
          if (!seen.has(keyStr)) {
            seen.add(keyStr);
            merged.push({ provider: m.provider.toUpperCase(), model: m.model });
          }
        });

        setModelPriorityState(merged);

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
    } else if (selectedKey === "ai.model_priority") {
      payloadValue = { models: modelPriorityState };

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

      setSettings(prev => prev.map(s => s.keyName === selectedKey ? { ...s, valueJson: payloadValue } : s));
      toast.success(t("projects.update_success"));
      setMode("list");
      await loadSettingsList(keyword, true);
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
      case "ai.model_priority":
        return "Thứ tự ưu tiên của các mô hình AI (Model Waterfall) khi định tuyến câu hỏi và xử lý tác vụ của Copilot.";
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
      case "ai.model_priority":
        return "Mảng các đối tượng chứa tên nhà cung cấp (provider) và mô hình (model) theo thứ tự ưu tiên giảm dần. Ví dụ: [{\"provider\": \"GEMINI\", \"model\": \"gemma-4-26b-a4b-it\"}].";
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

  const updateNormalization = (mode: string, field: 'fit' | 'load' | 'perf', value: string) => {
    setNormalizationState(prev => ({
      ...prev,
      [mode]: {
        ...prev[mode],
        [field]: value
      }
    }));
  };

  // Drag and drop handlers for model priority waterfall
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const updated = [...modelPriorityState];
    const draggedItem = updated[draggedIndex];
    updated.splice(draggedIndex, 1);
    updated.splice(index, 0, draggedItem);

    setDraggedIndex(index);
    setModelPriorityState(updated);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleSavePriority = async () => {
    setIsMutating(true);
    try {
      await adminSettingsService.updateSetting({
        keyName: "ai.model_priority",
        valueJson: { models: modelPriorityState },
        description: "Thứ tự ưu tiên của các mô hình AI (Model Waterfall) khi định tuyến câu hỏi và xử lý tác vụ của Copilot.",
      });

      setSettings(prev => prev.map(s => s.keyName === "ai.model_priority" ? { ...s, valueJson: { models: modelPriorityState } } : s));
      toast.success(t("projects.update_success"));
      setIsPriorityModalOpen(false);
      await loadSettingsList(keyword, true);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsMutating(false);
    }
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

    if (selectedKey === "ai.model_priority") {
      return (
        <div className="rounded-lg bg-primary/5 p-4 border border-primary/20 text-sm space-y-2">
          <div className="font-semibold text-primary flex items-center gap-1.5 text-xs">
            <Settings className="h-3.5 w-3.5" />
            Chỉnh sửa ưu tiên mô hình AI
          </div>
          <p className="text-muted-foreground leading-relaxed text-xs">
            Thiết lập thứ tự ưu tiên của mô hình AI hiện được thực hiện thông qua giao diện kéo thả trực quan dạng Popup Modal. 
            Vui lòng nhấn vào dòng cấu hình trong bảng danh sách để hiển thị cửa sổ chỉnh sửa này.
          </p>
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
                          if (setting.keyName === "ai.model_priority") {
                            const val = setting.valueJson;
                            const dbModels = (val && typeof val === "object" && Array.isArray((val as any).models))
                              ? (val as any).models
                              : Array.isArray(val) ? val : [];
                            const merged: PriorityModelItem[] = [];
                            const seen = new Set<string>();
                            dbModels.forEach((m: any) => {
                              if (m && m.provider && m.model) {
                                const keyStr = `${m.provider.toUpperCase()}:${m.model}`;
                                if (!seen.has(keyStr)) {
                                  seen.add(keyStr);
                                  merged.push({ provider: m.provider.toUpperCase(), model: m.model });
                                }
                              }
                            });
                            ALL_SUPPORTED_MODELS.forEach(m => {
                              const keyStr = `${m.provider.toUpperCase()}:${m.model}`;
                              if (!seen.has(keyStr)) {
                                  seen.add(keyStr);
                                  merged.push({ provider: m.provider.toUpperCase(), model: m.model });
                              }
                            });
                            setModelPriorityState(merged);
                            setIsPriorityModalOpen(true);
                          } else {
                            if (selectedKey === setting.keyName) {
                              handleModeChange("list");
                            } else {
                              setSelectedKey(setting.keyName);
                            }
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

      <Dialog open={isPriorityModalOpen} onOpenChange={setIsPriorityModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-primary" />
              Thứ tự ưu tiên của Mô hình AI (Model Waterfall)
            </DialogTitle>
            <DialogDescription>
              Nhấn giữ và kéo thả các dòng mô hình để sắp xếp lại thứ tự ưu tiên (Rank #1 là cao nhất). Hệ thống sẽ thử gọi các mô hình theo thứ tự này từ trên xuống dưới.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 my-4 max-h-[50vh] overflow-y-auto pr-1">
            {modelPriorityState.map((item, index) => (
              <div
                key={`${item.provider}-${item.model}-${index}`}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/15 cursor-grab active:cursor-grabbing transition-all select-none border-border/60 ${
                  draggedIndex === index ? "opacity-40 border-primary bg-primary/5 shadow-md" : "shadow-sm"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex flex-col items-center justify-center bg-muted h-10 w-10 rounded-md shrink-0 border">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase leading-none">Rank</span>
                    <span className="text-sm font-bold text-foreground">#{index + 1}</span>
                  </div>
                  <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-secondary font-semibold text-secondary-foreground shrink-0 uppercase tracking-wider">
                        {item.provider}
                      </span>
                      <span className="font-semibold text-sm text-foreground truncate block" title={item.model}>
                        {item.model}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 text-muted-foreground/50">
                  <span className="text-[10px] font-mono select-none px-1.5 py-0.5 rounded border bg-muted mr-1 text-muted-foreground font-semibold">DRAG</span>
                  <GripVertical className="h-4 w-4" />
                </div>
              </div>
            ))}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsPriorityModalOpen(false)}>
              Hủy bỏ
            </Button>
            <Button onClick={handleSavePriority} disabled={isMutating}>
              Lưu Cấu Hình
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

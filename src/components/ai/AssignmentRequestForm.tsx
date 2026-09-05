import { ListChecks, Plus, Wand2, X } from "lucide-react";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SkillDirectoryItem } from "@/types/user";
import type { AssignmentDraft, AssignmentRequirementRow } from "./aiChatTypes";
import { createAssignmentRow } from "./aiChatHelpers";

export function SkillSelect({
  value,
  onChange,
  skillDirectory,
  placeholder = "Chọn skill",
  className = "bg-background/70",
}: {
  value: string;
  onChange: (value: string) => void;
  skillDirectory: SkillDirectoryItem[];
  placeholder?: string;
  className?: string;
}) {
  if (skillDirectory.length === 0) {
    return (
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Skills: React, Spring Boot"
        className={className}
      />
    );
  }

  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={`h-9 w-full rounded-md border border-input px-3 text-sm text-foreground ${className}`}
    >
      <option value="">{placeholder}</option>
      {skillDirectory.map((skill) => (
        <option key={skill.id} value={skill.name}>
          {skill.name}
        </option>
      ))}
    </select>
  );
}

export function AssignmentRequestForm({
  formKey,
  draft,
  onUpdateDraft,
  skillDirectory,
  onSubmit,
}: {
  formKey: string;
  draft: AssignmentDraft;
  onUpdateDraft: (updater: (draft: AssignmentDraft) => AssignmentDraft) => void;
  skillDirectory: SkillDirectoryItem[];
  onSubmit: (prompt: string) => Promise<void>;
}) {
  const updateRow = (rowId: string, field: keyof Omit<AssignmentRequirementRow, "id">, value: string) => {
    onUpdateDraft((curr) => ({
      ...curr,
      rows: curr.rows.map((row) => (row.id === rowId ? { ...row, [field]: value } : row)),
    }));
  };

  const addRow = () => {
    onUpdateDraft((curr) => ({
      ...curr,
      rows: [...curr.rows, createAssignmentRow("", `${formKey}-${curr.rows.length}`)],
    }));
  };

  const removeRow = (rowId: string) => {
    onUpdateDraft((curr) => ({
      ...curr,
      rows: curr.rows.length === 1 ? [createAssignmentRow("", `${formKey}-0`)] : curr.rows.filter((row) => row.id !== rowId),
    }));
  };

  const handleSubmit = async () => {
    const rows = draft.rows
      .map((row) => ({
        taskId: row.taskId.trim(),
        skills: row.skills.trim(),
        difficulty: row.difficulty.trim(),
      }))
      .filter((row) => row.taskId);

    if (rows.length === 0) {
      toast.error("Nhap it nhat mot task ID.");
      return;
    }

    const invalid = rows.find((row) => {
      const difficulty = Number(row.difficulty);
      return !row.skills || !Number.isInteger(difficulty) || difficulty < 1 || difficulty > 10;
    });
    if (invalid) {
      toast.error("Moi task can co skills va do kho tu 1 den 10.");
      return;
    }

    const projectLine = draft.projectId.trim()
      ? `Project ID: ${draft.projectId.trim()}`
      : "Project ID: infer from each task if needed";
    const modeLine =
      draft.mode === "assign"
        ? "Mode: recommend suitable assignees and assign each task to the top candidate immediately."
        : "Mode: recommend suitable assignees only; do not assign yet.";
    const taskLines = rows
      .map(
        (row) =>
          `- Task ${row.taskId}: requiredSkills="${row.skills}", difficulty=${row.difficulty}`,
      )
      .join("\n");

    const prompt = [
      "Task assignment requirements form",
      projectLine,
      modeLine,
      "Use real TaskPilot tools and process every task below.",
      "If mode asks assignment, call recommendAndAssignTask for each task.",
      "Tasks:",
      taskLines,
    ].join("\n");

    await onSubmit(prompt);
  };

  return (
    <div className="mt-3 rounded-lg border border-border/60 bg-background/55 p-3 shadow-lg backdrop-blur-[28px] backdrop-saturate-150">
      <div className="mb-3 flex items-start gap-2">
        <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
          <ListChecks className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-foreground">Bổ sung thông tin task</div>
          <div className="text-xs leading-relaxed text-foreground/70">
            AI đang cần thêm dữ liệu cho bước này. Điền các trường còn thiếu rồi gửi lại vào cuộc hội thoại.
          </div>
        </div>
      </div>

      <div className="mb-3 grid gap-2 md:grid-cols-[150px_1fr]">
        <Input
          value={draft.projectId}
          onChange={(event) =>
            onUpdateDraft((current) => ({
              ...current,
              projectId: event.target.value,
            }))
          }
          inputMode="numeric"
          placeholder="Project ID"
          className="bg-background/70"
        />
        <div className="grid grid-cols-2 overflow-hidden rounded-md border border-input bg-background/70">
          <button
            type="button"
            onClick={() =>
              onUpdateDraft((current) => ({
                ...current,
                mode: "recommend",
              }))
            }
            className={`h-9 px-3 text-sm font-medium transition-colors ${draft.mode === "recommend" ? "bg-primary text-primary-foreground" : "text-foreground/70 hover:bg-muted"}`}
          >
            Chỉ gợi ý
          </button>
          <button
            type="button"
            onClick={() =>
              onUpdateDraft((current) => ({
                ...current,
                mode: "assign",
              }))
            }
            className={`h-9 px-3 text-sm font-medium transition-colors ${draft.mode === "assign" ? "bg-primary text-primary-foreground" : "text-foreground/70 hover:bg-muted"}`}
          >
            Gợi ý + gán
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {draft.rows.map((row) => (
          <div key={row.id} className="grid gap-2 md:grid-cols-[92px_1fr_100px_34px]">
            <Input
              value={row.taskId}
              onChange={(event) => updateRow(row.id, "taskId", event.target.value)}
              inputMode="numeric"
              placeholder="Task ID"
              className="bg-background/70"
            />
            <SkillSelect
              value={row.skills}
              onChange={(value) => updateRow(row.id, "skills", value)}
              skillDirectory={skillDirectory}
              placeholder="Chọn skill"
            />
            <Input
              value={row.difficulty}
              onChange={(event) => updateRow(row.id, "difficulty", event.target.value)}
              type="number"
              min={1}
              max={10}
              placeholder="Độ khó"
              className="bg-background/70"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeRow(row.id)}
              className="h-9 w-9"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-between">
        <Button type="button" variant="outline" size="sm" onClick={addRow}>
          <Plus className="h-4 w-4" />
          Thêm task
        </Button>
        <Button type="button" size="sm" onClick={() => void handleSubmit()}>
          <Wand2 className="h-4 w-4" />
          Gửi thông tin
        </Button>
      </div>
    </div>
  );
}

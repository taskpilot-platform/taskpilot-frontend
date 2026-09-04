import { Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { SkillDirectoryItem } from "@/types/user";
import type { DynamicFormSpec, DynamicFormField, PendingActionConfirmation } from "./aiChatTypes";
import { isSkillFieldName, taskIdFromFormIntent, isTaskAssignmentForm } from "./aiChatHelpers";
import { SkillSelect } from "./AssignmentRequestForm";
import { toast } from "react-toastify";

export function getDynamicFieldDefault(field: DynamicFormField) {
  const rawValue = field.value ?? field.defaultValue ?? "";
  if (rawValue === null || rawValue === undefined) return "";
  return String(rawValue);
}

export function getDynamicFieldValue(values: Record<string, string>, field: DynamicFormField) {
  return values[field.name] ?? getDynamicFieldDefault(field);
}

export function DynamicFormRenderer({
  formKey,
  spec,
  values,
  onUpdateValue,
  skillDirectory,
  myProjects,
  sprintsByProject,
  membersByProject,
  labelsByProject,
  onProjectSelected,
  onSubmit,
  associatedConfirmations = [],
}: {
  formKey: string;
  spec: DynamicFormSpec;
  values: Record<string, string>;
  onUpdateValue: (formKey: string, fieldName: string, value: string) => void;
  skillDirectory: SkillDirectoryItem[];
  myProjects: { id: number; name: string }[];
  sprintsByProject: Record<number, { id: number; name: string }[]>;
  membersByProject: Record<number, { id: number; name: string }[]>;
  labelsByProject: Record<number, { id: number; name: string }[]>;
  onProjectSelected: (projectId: number) => void;
  onSubmit: (prompt: string) => Promise<void>;
  associatedConfirmations?: PendingActionConfirmation[];
}) {
  const handleSubmit = async () => {
    const missing = spec.fields.find((field) => field.required && !getDynamicFieldValue(values, field).trim());
    if (missing) {
      toast.error(`Vui lòng nhập ${missing.label}.`);
      return;
    }

    const taskId = taskIdFromFormIntent(spec.intent);
    const assignmentForm = isTaskAssignmentForm(spec);
    const fieldLines = spec.fields
      .map((field) => `- ${field.name}: ${getDynamicFieldValue(values, field)}`)
      .join("\n");

    const promptParts: string[] = [];
    if (associatedConfirmations && associatedConfirmations.length > 0) {
      associatedConfirmations.forEach((c) => {
        promptParts.push(`CONFIRM_ACTION ${c.actionId} xác nhận đồng ý thực hiện`);
      });
    }

    promptParts.push(
      "Structured form response",
      spec.title ? `Form Title: ${spec.title}` : "",
      `Intent: ${spec.intent || "additional_information"}`,
      "Use this information to continue the previous user request.",
      taskId ? `Task ID: ${taskId}` : "",
      "Fields:",
      fieldLines
    );

    if (assignmentForm) {
      promptParts.push(
        "Important TaskPilot instruction:",
        "- The provided skill value comes from the system skill directory.",
        "- If the previous request only asked for recommendations or alternatives, call recommendTaskAssignmentCandidates with taskId, skills, and difficulty; do not create a write confirmation.",
        "- Only call recommendAndAssignTask if the user explicitly asked to assign immediately after recommending.",
        "- Do not only use these skills as temporary chat context."
      );
    }
    const prompt = promptParts.filter(Boolean).join("\n");
    await onSubmit(prompt);
  };

  return (
    <div className="mt-3 rounded-lg border border-border/60 bg-background/55 p-3 shadow-lg backdrop-blur-[28px] backdrop-saturate-150">
      <div className="mb-3">
        <div className="text-sm font-semibold text-foreground">{spec.title || "Bổ sung thông tin"}</div>
        {spec.description && (
          <div className="mt-1 text-xs leading-relaxed text-foreground/70">{spec.description}</div>
        )}
      </div>

      <div className="space-y-2">
        {spec.fields.map((field) => {
          const value = getDynamicFieldValue(values, field);
          const fieldLabel = (
            <div className="mb-1 flex items-center gap-1 text-xs font-medium text-foreground/80">
              <span>{field.label}</span>
              {field.required && <span className="text-destructive">*</span>}
            </div>
          );

          if (field.type === "checkbox") {
            return (
              <label
                key={field.name}
                className="flex items-center gap-2 rounded-md border border-input bg-background/70 px-3 py-2 text-sm text-foreground"
              >
                <input
                  type="checkbox"
                  checked={value === "true"}
                  onChange={(event) => onUpdateValue(formKey, field.name, event.target.checked ? "true" : "false")}
                  className="h-4 w-4 rounded border-input accent-primary"
                />
                <span>{field.label}</span>
                {field.required && <span className="text-destructive">*</span>}
              </label>
            );
          }

          if (field.type === "textarea") {
            return (
              <label key={field.name} className="block">
                {fieldLabel}
                <Textarea
                  value={value}
                  onChange={(event) => onUpdateValue(formKey, field.name, event.target.value)}
                  placeholder={field.placeholder || field.label}
                  className="min-h-20 bg-background/70"
                />
              </label>
            );
          }

          if (isSkillFieldName(field.name)) {
            if (field.name.toLowerCase().endsWith("ids") || field.type === "multiselect") {
              field.type = "multiselect";
              field.options = skillDirectory.map((s) => ({ label: s.name, value: String(s.id) }));
            } else {
              return (
                <label key={field.name} className="block">
                  {fieldLabel}
                  <SkillSelect
                    value={value}
                    onChange={(nextValue) => onUpdateValue(formKey, field.name, nextValue)}
                    skillDirectory={skillDirectory}
                    placeholder={field.placeholder || "Chọn skill từ hệ thống"}
                  />
                </label>
              );
            }
          }

          if (field.name === "projectId" && field.type === "number") {
            field.type = "select";
            field.options = myProjects.map((p) => ({ label: `${p.name} (ID: ${p.id})`, value: String(p.id) }));
            if (value) {
              const projectId = parseInt(value, 10);
              if (!isNaN(projectId)) {
                onProjectSelected(projectId);
              }
            }
          }

          if (field.name === "labelIds" || (field.name.toLowerCase().includes("label") && field.name.toLowerCase().endsWith("ids"))) {
            field.type = "multiselect";
            const projectIdStr = values["projectId"];
            if (projectIdStr) {
              const projectId = parseInt(projectIdStr, 10);
              const labels = labelsByProject[projectId] || [];
              field.options = labels.map((l) => ({ label: l.name, value: String(l.id) }));
            } else {
              field.options = [];
            }
          }

          if ((field.name === "difficultyLevel" || field.name === "difficulty") && field.type !== "number") {
            field.type = "number";
            field.min = 1;
            field.max = 10;
          }

          const fieldNameLower = field.name.toLowerCase();
          const isSprintField = fieldNameLower.includes("sprint");
          const isAssigneeField = fieldNameLower.includes("assignee") || fieldNameLower.includes("member");

          if ((isSprintField || isAssigneeField) && field.name !== "projectId") {
            field.type = "select";
            const projectIdStr = values["projectId"];
            if (projectIdStr) {
              const projectId = parseInt(projectIdStr, 10);
              if (isSprintField) {
                const sprints = sprintsByProject[projectId] || [];
                field.options = sprints.map((s) => ({ label: `${s.name} (ID: ${s.id})`, value: String(s.id) }));
              } else if (isAssigneeField) {
                const members = membersByProject[projectId] || [];
                field.options = members.map((m) => ({ label: `${m.name} (ID: ${m.id})`, value: String(m.id) }));
              }
            } else {
              field.options = [];
            }
          }

          if (field.type === "select") {
            const options = field.options ?? [];
            return (
              <label key={field.name} className="block">
                {fieldLabel}
                <select
                  value={value}
                  onChange={(event) => onUpdateValue(formKey, field.name, event.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background/70 px-3 text-sm text-foreground"
                >
                  <option value="">{field.placeholder || field.label}</option>
                  {options.map((option) => {
                    const label = typeof option === "string" ? option : option.label;
                    const optionValue = typeof option === "string" ? option : option.value;
                    return (
                      <option key={optionValue} value={optionValue}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              </label>
            );
          }

          if (field.type === "multiselect") {
            const options = field.options ?? [];
            if (options.length === 0) {
              return (
                <label key={field.name} className="block">
                  {fieldLabel}
                  <Input
                    value={value}
                    onChange={(event) => onUpdateValue(formKey, field.name, event.target.value)}
                    placeholder={field.placeholder || "Các ID cách nhau bằng dấu phẩy, ví dụ: 3,5"}
                    className="bg-background/70"
                  />
                </label>
              );
            }
            const selectedValues = (typeof value === "string" ? value.split(",").filter(Boolean) : []) as string[];
            return (
              <div key={field.name} className="block">
                <div className="mb-1 text-sm font-medium text-foreground">{fieldLabel}</div>
                <div className="flex flex-wrap gap-2">
                  {options.map((option) => {
                    const label = typeof option === "string" ? option : option.label;
                    const optionValue = typeof option === "string" ? String(option) : String(option.value);
                    const isChecked = selectedValues.includes(optionValue);
                    return (
                      <label key={optionValue} className={`flex items-center gap-1.5 cursor-pointer rounded-full border px-3 py-1 text-sm transition-colors ${isChecked ? "bg-primary/20 border-primary text-primary font-semibold" : "bg-background/50 border-input text-foreground hover:bg-muted"}`}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          className="hidden"
                          onChange={(e) => {
                            const newValues = e.target.checked
                              ? [...selectedValues, optionValue]
                              : selectedValues.filter((v) => v !== optionValue);
                            onUpdateValue(formKey, field.name, newValues.join(","));
                          }}
                        />
                        <span>{label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          }

          return (
            <label key={field.name} className="block">
              {fieldLabel}
              <Input
                value={value}
                onChange={(event) => onUpdateValue(formKey, field.name, event.target.value)}
                type={field.type === "number" || field.type === "date" ? field.type : "text"}
                min={field.min}
                max={field.max}
                placeholder={field.placeholder || field.label}
                className="bg-background/70"
              />
            </label>
          );
        })}
      </div>

      <div className="mt-3 flex justify-end">
        <Button type="button" size="sm" onClick={() => void handleSubmit()}>
          <Wand2 className="h-4 w-4" />
          {spec.submitLabel || "Gửi thông tin"}
        </Button>
      </div>
    </div>
  );
}

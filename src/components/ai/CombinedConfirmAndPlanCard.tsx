import { Check, X, PencilLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { SkillDirectoryItem } from "@/types/user";
import type { DynamicFormSpec, PendingActionConfirmation } from "./aiChatTypes";
import { isSkillFieldName } from "./aiChatHelpers";
import { SkillSelect } from "./AssignmentRequestForm";
import { getDynamicFieldValue } from "./DynamicFormRenderer";
import { CreateTaskConfirmCard } from "./CreateTaskConfirmCard";
import { ToolEventCard } from "./ToolEventCard";

export function CombinedConfirmAndPlanCard({
  formKey,
  confirmations,
  spec,
  values,
  onUpdateValue,
  planModificationText,
  onChangePlanModificationText,
  onSendModification,
  onCancelAll,
  onSubmitPlan,
  skillDirectory,
  myProjects,
  sprintsByProject,
  membersByProject,
  labelsByProject,
  onProjectSelected,
}: {
  formKey: string;
  confirmations: PendingActionConfirmation[];
  spec: DynamicFormSpec;
  values: Record<string, string>;
  onUpdateValue: (formKey: string, fieldName: string, value: string) => void;
  planModificationText: string;
  onChangePlanModificationText: (text: string) => void;
  onSendModification: () => Promise<void>;
  onCancelAll: () => void;
  onSubmitPlan: () => Promise<void>;
  skillDirectory: SkillDirectoryItem[];
  myProjects: { id: number; name: string }[];
  sprintsByProject: Record<number, { id: number; name: string }[]>;
  membersByProject: Record<number, { id: number; name: string }[]>;
  labelsByProject: Record<number, { id: number; name: string }[]>;
  onProjectSelected: (projectId: number) => void;
}) {
  let projectIdVal = values["projectId"];
  if (!projectIdVal) {
    for (const c of confirmations) {
      if (c.arguments && c.arguments.projectId) {
        projectIdVal = String(c.arguments.projectId);
        break;
      }
    }
  }

  return (
    <div className="mt-3 rounded-lg border border-amber-500/30 bg-background/55 p-3 shadow-lg backdrop-blur-[28px] backdrop-saturate-150">
      <div className="mb-3 border-b border-amber-500/20 pb-2">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-black animate-pulse">!</span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600/80 dark:text-amber-400/80">Xác nhận thao tác & Điền thông tin bổ sung</span>
        </div>
        <div className="space-y-1">
          {confirmations.map((c) => (
            <div key={c.actionId} className="text-[12.5px] font-semibold text-neutral-700 dark:text-neutral-300 pl-6">
              • {c.summary || "Xác nhận thực hiện thao tác ghi dữ liệu"}
            </div>
          ))}
        </div>
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
            const projectIdStr = projectIdVal;
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
            const projectIdStr = projectIdVal;
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

      <div className="mt-4 pt-3 border-t border-amber-500/20">
        <label className="block">
          <div className="mb-1.5 text-xs font-semibold text-foreground/80 flex items-center gap-1.5 select-none">
            <PencilLine className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            <span>Yêu cầu điều chỉnh Plan (nếu có)</span>
          </div>
          <div className="flex gap-2">
            <Input
              value={planModificationText}
              onChange={(event) => onChangePlanModificationText(event.target.value)}
              placeholder="Ví dụ: Không cần sửa description dự án nữa, đổi title task thành 'viết testcase'..."
              className="bg-background/70 text-xs h-9 flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void onSendModification();
                }
              }}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-9 text-xs font-bold shrink-0"
              onClick={() => void onSendModification()}
            >
              Gửi yêu cầu
            </Button>
          </div>
        </label>
      </div>

      <div className="mt-4 flex justify-end gap-2 border-t border-black/5 dark:border-white/5 pt-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancelAll}
          className="text-rose-600 border-rose-500/30 hover:bg-rose-50 dark:hover:bg-rose-950/20"
        >
          <X className="h-4 w-4" />
          Hủy bỏ
        </Button>
        <Button type="button" size="sm" onClick={() => void onSubmitPlan()}>
          <Check className="h-4 w-4" />
          Tiến hành theo plan
        </Button>
      </div>
    </div>
  );
}

export function ConfirmationCardList({
  confirmations,
  onConfirmAction,
  onCancelAction,
}: {
  confirmations: PendingActionConfirmation[];
  onConfirmAction: (c: PendingActionConfirmation) => void;
  onCancelAction: (id: string) => void;
}) {
  return (
    <div className="mt-3 grid gap-3">
      {confirmations.map((confirmation) =>
        confirmation.toolName === "createTask" ? (
          <CreateTaskConfirmCard
            key={confirmation.actionId}
            confirmation={confirmation}
            onConfirmAction={onConfirmAction}
            onCancelAction={onCancelAction}
          />
        ) : (
          <ToolEventCard
            key={confirmation.actionId}
            tool={{
              name: confirmation.toolName || "pendingAction",
              confirmation,
              result: JSON.stringify({ confirmationRequired: true, ...confirmation }),
            }}
            onConfirmAction={onConfirmAction}
            onCancelAction={onCancelAction}
          />
        )
      )}
    </div>
  );
}

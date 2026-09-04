import { ListChecks, Check, X } from "lucide-react";
import type { PendingActionConfirmation } from "./aiChatTypes";

export const PRIORITY_CONFIG: Record<string, { label: string; cls: string }> = {
  LOW: { label: "Thấp", cls: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border-slate-300/50 dark:border-slate-600/50" },
  MEDIUM: { label: "Trung bình", cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-300/50 dark:border-blue-600/50" },
  HIGH: { label: "Cao", cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-300/50 dark:border-amber-600/50" },
  URGENT: { label: "Khẩn cấp", cls: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-red-300/50 dark:border-red-600/50" },
};

export function CreateTaskConfirmCard({
  confirmation,
  onConfirmAction,
  onCancelAction,
}: {
  confirmation: PendingActionConfirmation;
  onConfirmAction: (c: PendingActionConfirmation) => void;
  onCancelAction: (id: string) => void;
}) {
  const args = (confirmation.arguments ?? {}) as Record<string, unknown>;
  const title = args.title ? String(args.title) : "";
  const priority = args.priority ? String(args.priority).toUpperCase() : "MEDIUM";
  const description = args.description ? String(args.description) : null;
  const difficulty = args.difficultyLevel != null ? Number(args.difficultyLevel) : null;
  const startDate = args.startDate ? String(args.startDate) : null;
  const dueDate = args.dueDate ? String(args.dueDate) : null;
  const projectId = args.projectId != null ? String(args.projectId) : null;
  const sprintId = args.sprintId != null ? String(args.sprintId) : null;
  const assigneeId = args.assigneeId != null ? String(args.assigneeId) : null;

  const pCfg = PRIORITY_CONFIG[priority] ?? { label: priority, cls: "bg-muted text-muted-foreground border-border" };

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }); }
    catch { return d; }
  };

  return (
    <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-md shadow-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-300/30 dark:border-emerald-500/30">
          <ListChecks className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tạo task mới · chờ xác nhận</div>
          <div className="text-[15px] font-bold text-foreground leading-tight mt-0.5 line-clamp-2">{title || "Chưa có tiêu đề"}</div>
        </div>
        <span className={`shrink-0 self-start text-[11px] font-bold px-2 py-0.5 rounded-lg border ${pCfg.cls}`}>{pCfg.label}</span>
      </div>

      {/* Fields grid */}
      <div className="px-4 pb-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm border-t border-border/30 pt-3">
        {projectId && (
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Dự án</div>
            <div className="font-semibold text-foreground">Project #{projectId}</div>
          </div>
        )}
        {sprintId && (
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Sprint</div>
            <div className="font-semibold text-foreground">Sprint #{sprintId}</div>
          </div>
        )}
        {difficulty != null && (
          <div className="col-span-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Độ khó</div>
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5">
                {Array.from({ length: 10 }, (_, i) => (
                  <div key={i} className={`h-2 w-3.5 rounded-sm transition-colors ${i < difficulty ? "bg-amber-500" : "bg-border/60"}`} />
                ))}
              </div>
              <span className="text-xs font-bold text-foreground">{difficulty}/10</span>
            </div>
          </div>
        )}
        {startDate && (
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Bắt đầu</div>
            <div className="font-semibold text-foreground">{formatDate(startDate)}</div>
          </div>
        )}
        {dueDate && (
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Hạn chót</div>
            <div className="font-semibold text-foreground">{formatDate(dueDate)}</div>
          </div>
        )}
        {assigneeId && (
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Người nhận</div>
            <div className="font-semibold text-foreground">User #{assigneeId}</div>
          </div>
        )}
      </div>

      {description && (
        <div className="px-4 pb-3 border-t border-border/30 pt-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Mô tả</div>
          <p className="text-sm text-foreground/80 leading-relaxed line-clamp-3">{description}</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="grid grid-cols-2 border-t border-border/40">
        <button
          type="button"
          onClick={() => onConfirmAction(confirmation)}
          className="flex items-center justify-center gap-2 py-3 text-sm font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 border-r border-border/40 transition-all duration-150 active:scale-[0.97]"
        >
          <Check className="h-4 w-4" />
          Phê duyệt
        </button>
        <button
          type="button"
          onClick={() => onCancelAction(confirmation.actionId)}
          className="flex items-center justify-center gap-2 py-3 text-sm font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-all duration-150 active:scale-[0.97]"
        >
          <X className="h-4 w-4" />
          Từ chối
        </button>
      </div>
    </div>
  );
}

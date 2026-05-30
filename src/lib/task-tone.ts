import type { TaskStatus } from "@/types/task";

export type TaskTone = "active" | "done" | "overdue";

export const TASK_TONE_CLASS = {
  bar: {
    active:
      "border-sky-300 bg-sky-100 text-sky-700 dark:border-sky-700 dark:bg-sky-950/50 dark:text-sky-300",
    done:
      "border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
    overdue:
      "border-red-300 bg-red-100 text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300",
  },
  legend: {
    active: "bg-sky-300/70",
    done: "bg-emerald-300/70",
    overdue: "bg-red-500/30",
  },
  badge: {
    active:
      "border-sky-300 bg-sky-100 text-sky-700 dark:border-sky-700 dark:bg-sky-950/50 dark:text-sky-300",
    done:
      "border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
    overdue:
      "border-red-300 bg-red-100 text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300",
  },
  dot: {
    active: "bg-sky-500",
    done: "bg-emerald-500",
    overdue: "bg-red-500",
  },
} as const;

export function isTaskOverdue(status: TaskStatus, dueDate?: string | null, now = Date.now()): boolean {
  if (status === "DONE" || !dueDate) {
    return false;
  }

  const dueTime = Date.parse(dueDate);
  return Number.isFinite(dueTime) && dueTime < now;
}

export function getTaskTone(status: TaskStatus, dueDate?: string | null, now = Date.now()): TaskTone {
  if (isTaskOverdue(status, dueDate, now)) {
    return "overdue";
  }

  if (status === "DONE") {
    return "done";
  }

  return "active";
}

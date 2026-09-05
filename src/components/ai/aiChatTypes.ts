export type ToolAccess = "read" | "write";

export type PendingActionConfirmation = {
  actionId: string;
  toolName?: string;
  summary?: string;
  arguments?: Record<string, unknown>;
  preview?: Record<string, unknown>;
  expiresAt?: string;
  status?: string;
  confirmationRequired?: boolean;
};

export type ToolEvent = {
  name: string;
  arguments?: string;
  result?: string;
  confirmation?: PendingActionConfirmation;
  isConfirmed?: boolean;
};

export type AssignmentRequirementRow = {
  id: string;
  taskId: string;
  skills: string;
  difficulty: string;
};

export type AssignmentRequest = {
  projectId: string;
  taskIds: string[];
};

export type AssignmentDraft = {
  projectId: string;
  mode: "recommend" | "assign";
  rows: AssignmentRequirementRow[];
};

export type DynamicFormField = {
  name: string;
  label: string;
  type?: "text" | "textarea" | "number" | "select" | "multiselect" | "checkbox" | "date";
  placeholder?: string;
  defaultValue?: string | number | boolean;
  value?: string | number | boolean;
  required?: boolean;
  options?: Array<{ label: string; value: string } | string>;
  min?: number;
  max?: number;
};

export type DynamicFormSpec = {
  title?: string;
  description?: string;
  intent?: string;
  submitLabel?: string;
  fields: DynamicFormField[];
};

export type ConfirmedTaskMutation = {
  actionId: string;
  toolName?: string;
  taskId?: number;
  projectId?: number;
  summary?: string;
};

export type InterleavedSegment = {
  type: 'think' | 'response';
  content: string;
  isUnclosed?: boolean;
};

export type ChatComposerProps = {
  placeholder: string;
  modelName: string;
  maxChars: number;
  getLastPrompt: () => string;
  onSubmit: (message: string) => void;
  isStreaming: boolean;
  onStop: () => void;
  stopTooltip: string;
};

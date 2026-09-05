import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bot, User, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { ChatMessage } from "@/services/ai.service";
import type { SkillDirectoryItem } from "@/types/user";
import type {
  ToolEvent,
  PendingActionConfirmation,
  AssignmentDraft,
} from "./aiChatTypes";
import {
  stripDynamicFormBlocks,
  parseInterleavedContent,
  extractConfirmationSpecs,
  dedupeConfirmations,
  extractDynamicFormSpec,
  extractAssignmentRequest,
  createAssignmentDraft,
  taskIdFromFormIntent,
  isTaskAssignmentForm,
} from "./aiChatHelpers";
import { markdownComponents } from "./TypewriterMarkdown";
import { ThinkingAccordion } from "./ThinkingAccordion";
import { PostToolProcessingRow } from "./ToolEventCard";
import { CombinedConfirmAndPlanCard, ConfirmationCardList } from "./CombinedConfirmAndPlanCard";
import { DynamicFormRenderer } from "./DynamicFormRenderer";
import { AssignmentRequestForm } from "./AssignmentRequestForm";

export function AiMessageContent({
  content,
  tools = [],
  expanded = null,
  collapseWhenComplete = false,
  forceThinkingOpen = false,
  isStreamingMessage = false,
  t,
  confirmPendingAction,
  cancelPendingAction,
}: {
  content: string;
  tools?: ToolEvent[];
  expanded?: string | null;
  collapseWhenComplete?: boolean;
  forceThinkingOpen?: boolean;
  isStreamingMessage?: boolean;
  t: (key: string) => string;
  confirmPendingAction: (confirmation: PendingActionConfirmation) => void;
  cancelPendingAction: (actionId: string) => void;
}) {
  const displayContent = stripDynamicFormBlocks(content, collapseWhenComplete);
  const segments = parseInterleavedContent(displayContent);
  const lastThinkIndex = segments.map((s, idx) => (s.type === "think" ? idx : -1)).filter((idx) => idx !== -1).pop();

  return (
    <div className="flex flex-col gap-2 text-neutral-900 dark:text-neutral-100">
      {segments.map((segment, index) => {
        if (segment.type === "think") {
          const isLastThink = index === lastThinkIndex;
          const segmentTools = isLastThink ? tools : [];
          const displayThinking = segment.content.trim() || (isLastThink ? expanded : "") || "Đang phân tích yêu cầu...";
          return (
            <ThinkingAccordion
              key={`think-${index}`}
              thinkingText={displayThinking}
              tools={segmentTools}
              isThinkingComplete={!segment.isUnclosed}
              hasVisibleResponse={segments.slice(index + 1).some((s) => s.type === "response")}
              collapseWhenComplete={collapseWhenComplete && !isStreamingMessage}
              forceOpen={isStreamingMessage || forceThinkingOpen}
              t={t}
              confirmPendingAction={confirmPendingAction}
              cancelPendingAction={cancelPendingAction}
            />
          );
        } else {
          return (
            <div key={`resp-${index}`} className="max-w-full prose prose-sm dark:prose-invert pt-1">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {segment.content}
              </ReactMarkdown>
            </div>
          );
        }
      })}

      {isStreamingMessage &&
        segments.length > 0 &&
        segments[segments.length - 1].type === "think" &&
        !segments[segments.length - 1].isUnclosed &&
        tools &&
        tools.length > 0 && (
          <PostToolProcessingRow toolName={tools[tools.length - 1].name} isComplete={false} />
        )}
    </div>
  );
}

export function AiMessageExtras({
  msg,
  idx,
  dynamicFormValues,
  updateDynamicFormValue,
  planModificationTexts,
  setPlanModificationTexts,
  setDynamicFormValues,
  assignmentDrafts,
  setAssignmentDrafts,
  skillDirectory,
  myProjects,
  sprintsByProject,
  membersByProject,
  labelsByProject,
  onProjectSelected,
  confirmPendingAction,
  cancelPendingAction,
  onSubmitPrompt,
}: {
  msg: ChatMessage;
  idx: number;
  dynamicFormValues: Record<string, Record<string, string>>;
  updateDynamicFormValue: (formKey: string, fieldName: string, value: string) => void;
  planModificationTexts: Record<string, string>;
  setPlanModificationTexts: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setDynamicFormValues: React.Dispatch<React.SetStateAction<Record<string, Record<string, string>>>>;
  assignmentDrafts: Record<string, AssignmentDraft>;
  setAssignmentDrafts: React.Dispatch<React.SetStateAction<Record<string, AssignmentDraft>>>;
  skillDirectory: SkillDirectoryItem[];
  myProjects: { id: number; name: string }[];
  sprintsByProject: Record<number, { id: number; name: string }[]>;
  membersByProject: Record<number, { id: number; name: string }[]>;
  labelsByProject: Record<number, { id: number; name: string }[]>;
  onProjectSelected: (projectId: number) => void;
  confirmPendingAction: (confirmation: PendingActionConfirmation) => void;
  cancelPendingAction: (actionId: string) => void;
  onSubmitPrompt: (prompt: string) => Promise<void>;
}) {
  if (msg.sender !== "ASSISTANT") {
    return null;
  }

  const formKey = `message-${msg.id || idx}`;
  const confirmations = dedupeConfirmations(extractConfirmationSpecs(msg.content));
  const dynamicForm = extractDynamicFormSpec(msg.content);

  if (confirmations.length > 0 && dynamicForm) {
    const modText = planModificationTexts[formKey] ?? "";
    const values = dynamicFormValues[formKey] ?? {};

    const handleSendModification = async () => {
      confirmations.forEach((c) => cancelPendingAction(c.actionId));
      setDynamicFormValues((forms) => {
        const next = { ...forms };
        delete next[formKey];
        return next;
      });
      setPlanModificationTexts((texts) => {
        const next = { ...texts };
        delete next[formKey];
        return next;
      });
      await onSubmitPrompt(modText);
    };

    const handleCancelAll = () => {
      confirmations.forEach((c) => cancelPendingAction(c.actionId));
      setDynamicFormValues((forms) => {
        const next = { ...forms };
        delete next[formKey];
        return next;
      });
      setPlanModificationTexts((texts) => {
        const next = { ...texts };
        delete next[formKey];
        return next;
      });
    };

    const handleSubmitPlan = async () => {
      const taskId = taskIdFromFormIntent(dynamicForm.intent);
      const assignmentForm = isTaskAssignmentForm(dynamicForm);
      const fieldLines = dynamicForm.fields
        .map((field) => `- ${field.name}: ${values[field.name] ?? field.defaultValue ?? ""}`)
        .join("\n");

      const promptParts: string[] = [];
      confirmations.forEach((c) => {
        promptParts.push(`CONFIRM_ACTION ${c.actionId} xác nhận đồng ý thực hiện`);
      });

      promptParts.push(
        "Structured form response",
        dynamicForm.title ? `Form Title: ${dynamicForm.title}` : "",
        `Intent: ${dynamicForm.intent || "additional_information"}`,
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

      setDynamicFormValues((forms) => {
        const next = { ...forms };
        delete next[formKey];
        return next;
      });

      await onSubmitPrompt(promptParts.filter(Boolean).join("\n"));
    };

    return (
      <CombinedConfirmAndPlanCard
        formKey={formKey}
        confirmations={confirmations}
        spec={dynamicForm}
        values={values}
        onUpdateValue={updateDynamicFormValue}
        planModificationText={modText}
        onChangePlanModificationText={(text) =>
          setPlanModificationTexts((prev) => ({ ...prev, [formKey]: text }))
        }
        onSendModification={handleSendModification}
        onCancelAll={handleCancelAll}
        onSubmitPlan={handleSubmitPlan}
        skillDirectory={skillDirectory}
        myProjects={myProjects}
        sprintsByProject={sprintsByProject}
        membersByProject={membersByProject}
        labelsByProject={labelsByProject}
        onProjectSelected={onProjectSelected}
      />
    );
  }

  if (confirmations.length > 0) {
    return (
      <ConfirmationCardList
        confirmations={confirmations}
        onConfirmAction={confirmPendingAction}
        onCancelAction={cancelPendingAction}
      />
    );
  }

  if (dynamicForm) {
    return (
      <DynamicFormRenderer
        formKey={formKey}
        spec={dynamicForm}
        values={dynamicFormValues[formKey] ?? {}}
        onUpdateValue={updateDynamicFormValue}
        skillDirectory={skillDirectory}
        myProjects={myProjects}
        sprintsByProject={sprintsByProject}
        membersByProject={membersByProject}
        labelsByProject={labelsByProject}
        onProjectSelected={onProjectSelected}
        onSubmit={async (prompt) => {
          setDynamicFormValues((forms) => {
            const next = { ...forms };
            delete next[formKey];
            return next;
          });
          await onSubmitPrompt(prompt);
        }}
        associatedConfirmations={confirmations}
      />
    );
  }

  const assignmentRequest = extractAssignmentRequest(msg.content);
  if (assignmentRequest) {
    const draft = assignmentDrafts[formKey] ?? createAssignmentDraft(formKey, assignmentRequest);
    return (
      <AssignmentRequestForm
        formKey={formKey}
        draft={draft}
        onUpdateDraft={(updater) =>
          setAssignmentDrafts((curr) => ({
            ...curr,
            [formKey]: updater(curr[formKey] ?? createAssignmentDraft(formKey, assignmentRequest)),
          }))
        }
        skillDirectory={skillDirectory}
        onSubmit={onSubmitPrompt}
      />
    );
  }

  return null;
}

export function AiMessageItem({
  msg,
  idx,
  t,
  confirmPendingAction,
  cancelPendingAction,
  dynamicFormValues,
  updateDynamicFormValue,
  planModificationTexts,
  setPlanModificationTexts,
  setDynamicFormValues,
  assignmentDrafts,
  setAssignmentDrafts,
  skillDirectory,
  myProjects,
  sprintsByProject,
  membersByProject,
  labelsByProject,
  onProjectSelected,
  onSubmitPrompt,
}: {
  msg: ChatMessage;
  idx: number;
  t: (key: string) => string;
  confirmPendingAction: (confirmation: PendingActionConfirmation) => void;
  cancelPendingAction: (actionId: string) => void;
  dynamicFormValues: Record<string, Record<string, string>>;
  updateDynamicFormValue: (formKey: string, fieldName: string, value: string) => void;
  planModificationTexts: Record<string, string>;
  setPlanModificationTexts: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setDynamicFormValues: React.Dispatch<React.SetStateAction<Record<string, Record<string, string>>>>;
  assignmentDrafts: Record<string, AssignmentDraft>;
  setAssignmentDrafts: React.Dispatch<React.SetStateAction<Record<string, AssignmentDraft>>>;
  skillDirectory: SkillDirectoryItem[];
  myProjects: { id: number; name: string }[];
  sprintsByProject: Record<number, { id: number; name: string }[]>;
  membersByProject: Record<number, { id: number; name: string }[]>;
  labelsByProject: Record<number, { id: number; name: string }[]>;
  onProjectSelected: (projectId: number) => void;
  onSubmitPrompt: (prompt: string) => Promise<void>;
}) {
  if (msg.sender === "USER") {
    return (
      <div className="flex gap-3 justify-end w-full">
        <div className="max-w-[85%] md:max-w-[70%]">
          <div className="rounded-2xl px-4 py-3 bg-primary text-primary-foreground rounded-br-none shadow-sm">
            <div className="whitespace-pre-wrap">{msg.content}</div>
          </div>
        </div>
        <Avatar className="w-8 h-8 shrink-0">
          <AvatarFallback className="bg-muted text-muted-foreground">
            <User className="w-4 h-4" />
          </AvatarFallback>
        </Avatar>
      </div>
    );
  }

  const extras = (
    <AiMessageExtras
      msg={msg}
      idx={idx}
      dynamicFormValues={dynamicFormValues}
      updateDynamicFormValue={updateDynamicFormValue}
      planModificationTexts={planModificationTexts}
      setPlanModificationTexts={setPlanModificationTexts}
      setDynamicFormValues={setDynamicFormValues}
      assignmentDrafts={assignmentDrafts}
      setAssignmentDrafts={setAssignmentDrafts}
      skillDirectory={skillDirectory}
      myProjects={myProjects}
      sprintsByProject={sprintsByProject}
      membersByProject={membersByProject}
      labelsByProject={labelsByProject}
      onProjectSelected={onProjectSelected}
      confirmPendingAction={confirmPendingAction}
      cancelPendingAction={cancelPendingAction}
      onSubmitPrompt={onSubmitPrompt}
    />
  );

  return (
    <div className="flex gap-4 justify-start w-full border-b border-border/10 pb-6 mb-2">
      <Avatar className="w-8 h-8 shrink-0">
        <AvatarFallback className="bg-primary/10 text-primary">
          <Bot className="w-4 h-4" />
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 mb-1.5 flex items-center gap-1.5">
          <span>TaskPilot AI</span>
        </div>
        <div className="text-neutral-900 dark:text-neutral-100">
          <AiMessageContent
            content={msg.content}
            tools={(msg as any).toolEvents || []}
            collapseWhenComplete={true}
            t={t}
            confirmPendingAction={confirmPendingAction}
            cancelPendingAction={cancelPendingAction}
          />
        </div>
        {extras && <div className="mt-4">{extras}</div>}
      </div>
    </div>
  );
}

export function AiStreamingPlaceholder({
  currentStreamMsg,
  toolEvents,
  expandedThinking,
  isThinking,
  t,
  confirmPendingAction,
  cancelPendingAction,
}: {
  currentStreamMsg: string;
  toolEvents: ToolEvent[];
  expandedThinking: string | null;
  isThinking: boolean;
  t: (key: string) => string;
  confirmPendingAction: (confirmation: PendingActionConfirmation) => void;
  cancelPendingAction: (actionId: string) => void;
}) {
  return (
    <div className="flex gap-4 justify-start w-full pb-6">
      <Avatar className="w-8 h-8 shrink-0">
        <AvatarFallback className="bg-primary/10 text-primary">
          <Loader2 className="w-4 h-4 animate-spin" />
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 mb-1.5 flex items-center gap-1.5">
          <span>TaskPilot AI</span>
        </div>
        <div className="text-neutral-900 dark:text-neutral-100">
          <AiMessageContent
            content={currentStreamMsg}
            tools={toolEvents}
            expanded={expandedThinking}
            collapseWhenComplete={true}
            forceThinkingOpen={isThinking}
            isStreamingMessage={true}
            t={t}
            confirmPendingAction={confirmPendingAction}
            cancelPendingAction={cancelPendingAction}
          />
        </div>
      </div>
    </div>
  );
}

export type ChatStreamPhase =
	| "QUEUED"
	| "ROUTING"
	| "THINKING"
	| "GENERATING"
	| "FINALIZED"
	| "FAILED";

export interface ChatStreamStatus {
	sessionId: number;
	clientMessageId: string;
	phase: ChatStreamPhase;
	modelUsed?: string | null;
	assistantMessageId?: number | null;
	errorMessage?: string | null;
	updatedAt?: string;
}

import { http } from "@/lib/http";
import type { ChatStreamStatus } from "@/types/chat-stream";
import type { ApiResponse, PaginatedResponse } from "@/types/api";

export interface ChatSession {
	id: number;
	title: string;
	createdAt: string;
	messageCount: number;
}

export interface ChatMessage {
	id: number;
	sender: "USER" | "ASSISTANT" | "SYSTEM";
	content: string;
	createdAt: string;
}

export const aiService = {
	async getSessions(
		page = 0,
		size = 20,
	): Promise<PaginatedResponse<ChatSession>> {
		const response = await http.get<
			ApiResponse<PaginatedResponse<ChatSession>>
		>("/v1/ai/sessions", {
			params: { page, size },
		});
		// Trích xuất phần data bên trong `ApiResponse`, đây chính là `PaginatedResponse<ChatSession>`
		return response.data.data;
	},

	async createSession(title?: string): Promise<ChatSession> {
		const response = await http.post<ApiResponse<ChatSession>>(
			"/v1/ai/sessions",
			{ title },
		);
		// `response.data` returns `ApiResponse<ChatSession>`, data payload is in `.data`
		return response.data.data;
	},

	async deleteSession(sessionId: number): Promise<void> {
		await http.delete(`/v1/ai/sessions/${sessionId}`);
	},

	async updateSessionTitle(sessionId: number, title: string): Promise<void> {
		await http.patch(`/v1/ai/sessions/${sessionId}/title`, null, {
			params: { title },
		});
	},

	async getMessages(
		sessionId: number,
		page = 0,
		size = 50,
	): Promise<PaginatedResponse<ChatMessage>> {
		const response = await http.get<
			ApiResponse<PaginatedResponse<ChatMessage>>
		>(`/v1/ai/sessions/${sessionId}/messages`, { params: { page, size } });
		return response.data.data;
	},

	async getStreamStatus(
		sessionId: number,
		clientMessageId?: string,
	): Promise<ChatStreamStatus | null> {
		const response = await http.get<ApiResponse<ChatStreamStatus | null>>(
			`/v1/ai/sessions/${sessionId}/stream-status`,
			{ params: clientMessageId ? { clientMessageId } : {} },
		);
		return response.data.data;
	},

	async warmupSession(sessionId: number): Promise<void> {
		await http.post(`/v1/ai/sessions/${sessionId}/warmup`);
	},
};

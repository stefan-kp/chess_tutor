export interface LLMHistoryTurn {
    role: "user" | "model";
    parts: { text: string }[];
}

export interface LLMSendResult {
    response: { text: () => string };
}

export interface LLMChatSession {
    sendMessage(text: string): Promise<LLMSendResult>;
}

export interface LLMGenerationConfig {
    maxOutputTokens?: number;
}

export interface LLMModel {
    startChat(opts: { history: LLMHistoryTurn[]; generationConfig?: LLMGenerationConfig }): LLMChatSession;
    generateContent(prompt: string): Promise<LLMSendResult>;
}

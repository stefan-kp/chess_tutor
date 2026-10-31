import { LLMChatSession, LLMHistoryTurn, LLMModel, LLMSendResult } from "./types";

interface ProxyChatBody {
    history: PlainHistoryTurn[];
    message: string;
    maxOutputTokens?: number;
}

interface PlainHistoryTurn {
    role: "user" | "model";
    text: string;
}

function toPlainHistory(history: LLMHistoryTurn[]): PlainHistoryTurn[] {
    return history.map((turn) => ({
        role: turn.role,
        text: turn.parts.map((p) => p.text).join("\n"),
    }));
}

class ProxyChatSession implements LLMChatSession {
    private history: PlainHistoryTurn[];

    // `modelName` intentionally unused here: call sites pass Gemini-specific
    // model ids (e.g. "gemini-2.5-flash") that mean nothing to the
    // server-managed backend. The server always resolves the model from its
    // own LLM_MODEL env var instead - see openAICompatibleServer.ts.
    constructor(_modelName: string, initialHistory: LLMHistoryTurn[], private maxOutputTokens?: number) {
        this.history = toPlainHistory(initialHistory);
    }

    async sendMessage(text: string): Promise<LLMSendResult> {
        const body: ProxyChatBody = {
            history: this.history,
            message: text,
            ...(this.maxOutputTokens !== undefined ? { maxOutputTokens: this.maxOutputTokens } : {}),
        };

        const res = await fetch("/api/v1/llm/proxy-chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        if (!res.ok) {
            throw new Error(`LLM proxy request failed: ${res.status}`);
        }

        const data = (await res.json()) as { reply: string };
        this.history.push({ role: "user", text });
        this.history.push({ role: "model", text: data.reply });
        return { response: { text: () => data.reply } };
    }
}

/**
 * Client-safe stand-in for getGenAIModel() when the server-managed
 * ("openai-compatible") provider is active. Never talks to the real LLM
 * backend itself - that only happens server-side, in the proxy-chat route.
 */
export function getProxyModel(modelName: string): LLMModel {
    return {
        startChat({ history, generationConfig }) {
            return new ProxyChatSession(modelName, history, generationConfig?.maxOutputTokens);
        },
        generateContent(prompt: string) {
            return new ProxyChatSession(modelName, []).sendMessage(prompt);
        },
    };
}

type ChatRole = "system" | "user" | "assistant";

interface ChatMessage {
    role: ChatRole;
    content: string;
}

export interface PlainHistoryTurn {
    role: "user" | "model";
    text: string;
}

function getServerLLMConfig() {
    const baseUrl = process.env.LLM_BASE_URL;
    if (!baseUrl) {
        throw new Error("LLM_BASE_URL is not configured for the openai-compatible provider");
    }
    return {
        baseUrl: baseUrl.replace(/\/$/, ""),
        apiKey: process.env.LLM_API_KEY ?? "",
        model: process.env.LLM_MODEL || "llama3.1:8b",
    };
}

async function callChatCompletions(
    messages: ChatMessage[],
    modelName?: string,
    temperature?: number,
    maxTokens?: number,
): Promise<string> {
    const config = getServerLLMConfig();

    const res = await fetch(`${config.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
        },
        body: JSON.stringify({
            model: modelName || config.model,
            messages,
            ...(temperature !== undefined ? { temperature } : {}),
            ...(maxTokens !== undefined ? { max_tokens: maxTokens } : {}),
        }),
    });

    if (!res.ok) {
        throw new Error(`LLM backend request failed: ${res.status} ${await res.text()}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? "";
}

export async function sendOpenAICompatibleChat(
    history: PlainHistoryTurn[],
    message: string,
    modelName?: string,
    maxOutputTokens?: number,
): Promise<string> {
    const messages: ChatMessage[] = history.map((turn) => ({
        role: turn.role === "model" ? "assistant" : "user",
        content: turn.text,
    }));
    messages.push({ role: "user", content: message });
    return callChatCompletions(messages, modelName, undefined, maxOutputTokens);
}

export async function sendOpenAICompatibleCompletion(opts: {
    prompt: string;
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
    modelName?: string;
}): Promise<string> {
    const messages: ChatMessage[] = [];
    if (opts.systemPrompt) {
        messages.push({ role: "system", content: opts.systemPrompt });
    }
    messages.push({ role: "user", content: opts.prompt });
    return callChatCompletions(messages, opts.modelName, opts.temperature, opts.maxTokens);
}

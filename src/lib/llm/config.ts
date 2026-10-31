export type LLMProviderKind = "gemini" | "openai-compatible";

const SERVER_MANAGED_KEY_SENTINEL = "server-managed";

/**
 * Which LLM backend the app talks to. "gemini" (default) is the original
 * bring-your-own-Gemini-key flow. "openai-compatible" routes every call
 * through the server to a self-hosted OpenAI-compatible endpoint (Ollama,
 * LiteLLM, LM Studio, vLLM, ...) and needs no user-supplied key.
 *
 * Read via NEXT_PUBLIC_LLM_PROVIDER so client components can branch on it
 * too - the value itself isn't sensitive, unlike the base URL/key.
 */
export function getLLMProviderKind(): LLMProviderKind {
    const value = (process.env.NEXT_PUBLIC_LLM_PROVIDER ?? "").toLowerCase();
    return value === "openai-compatible" ? "openai-compatible" : "gemini";
}

export function llmRequiresUserApiKey(): boolean {
    return getLLMProviderKind() === "gemini";
}

export function getServerManagedKeySentinel(): string {
    return SERVER_MANAGED_KEY_SENTINEL;
}

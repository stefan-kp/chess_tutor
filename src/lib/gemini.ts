import { GoogleGenerativeAI } from "@google/generative-ai";

// Models the app is allowed to call. Used both as the UI list and to validate
// a client-supplied modelName server-side.
export const AVAILABLE_MODELS = [
    "gemini-2.5-pro",
    "gemini-2.5-flash",
] as const;

export function getAvailableModels(): string[] {
    return [...AVAILABLE_MODELS];
}

export function isAllowedModel(modelName: string): boolean {
    return (AVAILABLE_MODELS as readonly string[]).includes(modelName);
}

export function getGenAIModel(apiKey: string, modelName: string = "gemini-2.5-flash") {
    const genAI = new GoogleGenerativeAI(apiKey);
    // NOTE: no function-calling tools are registered. There is no
    // functionCalls() handling loop in the app, so a tool call would surface as
    // an empty text response and stall the chat. Add a proper loop before
    // reintroducing tools.
    return genAI.getGenerativeModel({
        model: modelName,
    });
}

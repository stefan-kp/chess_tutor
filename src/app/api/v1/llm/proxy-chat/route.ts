import { NextRequest, NextResponse } from "next/server";
import { sendOpenAICompatibleChat, PlainHistoryTurn } from "@/lib/llm/openAICompatibleServer";

export const runtime = "nodejs";

type ProxyChatBody = {
    history?: PlainHistoryTurn[];
    message: string;
    modelName?: string;
    maxOutputTokens?: number;
};

/**
 * Server-side relay for the client-side chat flows (useTutorChat, analysis,
 * opening/game modals, ...) when the "openai-compatible" provider is active.
 * The browser never talks to LLM_BASE_URL directly - only this route does.
 */
export async function POST(request: NextRequest) {
    try {
        const body = (await request.json()) as Partial<ProxyChatBody> | null;
        const { history = [], message, modelName, maxOutputTokens } = body ?? {};

        if (!message || typeof message !== "string") {
            return NextResponse.json({ error: "Missing message" }, { status: 400 });
        }

        const reply = await sendOpenAICompatibleChat(history, message, modelName, maxOutputTokens);
        return NextResponse.json({ reply });
    } catch (error) {
        console.error("LLM proxy chat error", error);
        return NextResponse.json({ error: "Failed to generate tutor response" }, { status: 500 });
    }
}

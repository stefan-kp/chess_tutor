import { NextRequest, NextResponse } from "next/server";
import { getGenAIModel } from "@/lib/gemini";
import { PERSONALITIES } from "@/lib/personalities";
import { SupportedLanguage } from "@/lib/i18n/translations";
import {
  buildTutorPrompt,
  buildTutorSystemHistory,
  normalizeHistory,
  TutorContext,
  TutorPlayerColor,
} from "@/lib/server/tutorPrompt";

export const runtime = "nodejs";

type ChatHistory = { role: "user" | "model"; text: string }[];

type ChatBody = {
  apiKey: string;
  personalityId: string;
  language: SupportedLanguage;
  playerColor: TutorPlayerColor;
  message: string;
  context?: TutorContext;
  history?: ChatHistory;
  modelName?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<ChatBody> | null;
    const {
      apiKey,
      personalityId,
      language,
      playerColor,
      message,
      context,
      history = [],
      modelName,
    } = body ?? {};

    if (!apiKey || typeof apiKey !== "string") {
      return NextResponse.json({ error: "Missing apiKey" }, { status: 400 });
    }
    if (!personalityId || typeof personalityId !== "string") {
      return NextResponse.json({ error: "Missing personalityId" }, { status: 400 });
    }
    if (!language || typeof language !== "string") {
      return NextResponse.json({ error: "Missing language" }, { status: 400 });
    }
    if (playerColor !== "white" && playerColor !== "black") {
      return NextResponse.json({ error: "playerColor must be 'white' or 'black'" }, { status: 400 });
    }
    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Missing message" }, { status: 400 });
    }

    const personality = PERSONALITIES.find((p) => p.id === personalityId);
    if (!personality) {
      return NextResponse.json({ error: "Unknown personality" }, { status: 400 });
    }

    const model = getGenAIModel(apiKey, modelName ?? "gemini-2.5-flash");
    const systemHistory = buildTutorSystemHistory(personality, language, playerColor);
    const chat = model.startChat({
      history: [...systemHistory, ...normalizeHistory(history)],
    });

    const prompt = buildTutorPrompt(message, context, language);
    const response = await chat.sendMessage(prompt);
    const text = response.response.text();

    return NextResponse.json({ reply: text });
  } catch (error) {
    console.error("LLM chat error", error);
    return NextResponse.json({ error: "Failed to generate tutor response" }, { status: 500 });
  }
}

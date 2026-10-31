"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { LLMChatSession } from "@/lib/llm/types";
import { Chess, Move } from "chess.js";

import { useDebug } from "@/contexts/DebugContext";
import { buildAutomaticAnalysisPrompt, buildTeachingPrompt } from "@/lib/analysisPrompts";
import { getGenAIModel } from "@/lib/gemini";
import { SupportedLanguage } from "@/lib/i18n/translations";
import { OpeningMetadata } from "@/lib/openings";
import { Personality } from "@/lib/personalities";
import { Stockfish, StockfishEvaluation } from "@/lib/stockfish";
import { DetectedTactic } from "@/lib/tacticDetection";

export interface TutorMessage {
    role: "user" | "model";
    text: string;
    timestamp: number;
}

interface UseTutorChatArgs {
    apiKey: string | null;
    computerMove: Move | null;
    currentFen: string;
    evalP0: StockfishEvaluation | null;
    evalP2: StockfishEvaluation | null;
    game: Chess;
    language: SupportedLanguage;
    missedTactics: DetectedTactic[] | null;
    onAnalysisComplete: () => void;
    onCheckComputerMove: () => void;
    openingData: OpeningMetadata[];
    personality: Personality;
    playerColor: "white" | "black";
    stockfish: Stockfish | null;
    userMove: Move | null;
}

export function useTutorChat({
    apiKey,
    computerMove,
    currentFen,
    evalP0,
    evalP2,
    game,
    language,
    missedTactics,
    onAnalysisComplete,
    onCheckComputerMove,
    openingData,
    personality,
    playerColor,
    stockfish,
    userMove,
}: UseTutorChatArgs) {
    const [messages, setMessages] = useState<TutorMessage[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [chatSession, setChatSession] = useState<LLMChatSession | null>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const lastAnalyzedMoveRef = useRef<string | null>(null);
    const { addEntry } = useDebug();

    const tutorColor = playerColor === "white" ? "black" : "white";
    const playerColorName = playerColor === "white" ? "White" : "Black";
    const tutorColorName = tutorColor === "white" ? "White" : "Black";

    const evaluateCurrentPosition = useCallback(async () => {
        if (!stockfish) {
            return null;
        }

        try {
            return await stockfish.evaluate(game.fen(), 15);
        } catch (error) {
            console.error("Error evaluating position:", error);
            return null;
        }
    }, [game, stockfish]);

    const sendMessageToChat = useCallback(async (text: string, isSystemMessage = false) => {
        if (!chatSession) return;

        if (!isSystemMessage) {
            setMessages((previous) => [...previous, { role: "user", text, timestamp: Date.now() }]);
        }

        setIsLoading(true);

        try {
            const evaluation = isSystemMessage ? null : await evaluateCurrentPosition();
            const finalPrompt = isSystemMessage
                ? text
                : buildTeachingPrompt(text, currentFen, evaluation, openingData, language);

            const result = await chatSession.sendMessage(finalPrompt);
            const responseText = (await result.response).text();

            setMessages((previous) => [...previous, { role: "model", text: responseText, timestamp: Date.now() }]);
            addEntry({
                type: "tutor",
                action: isSystemMessage ? "Automatic Move Analysis" : "User Chat",
                prompt: finalPrompt,
                response: responseText,
                metadata: {
                    currentFen,
                    personality: personality.name,
                    language,
                    userMove: userMove?.san,
                    computerMove: computerMove?.san,
                },
            });
        } catch (error) {
            console.error("Chat failed:", error);
        } finally {
            setIsLoading(false);
            onCheckComputerMove();
        }
    }, [addEntry, chatSession, computerMove?.san, currentFen, evaluateCurrentPosition, language, onCheckComputerMove, openingData, personality.name, userMove?.san]);

    useEffect(() => {
        if (!apiKey) {
            setChatSession(null);
            setMessages([]);
            return;
        }

        const model = getGenAIModel(apiKey, "gemini-2.5-flash");
        const session = model.startChat({
            history: [
                {
                    role: "user",
                    parts: [{
                        text: `
You are a Chess Tutor with a unique dual role.
You must strictly follow the personality defined below.
Do NOT invent moves or evaluations. Use the provided JSON data.

PERSONALITY:
${personality.systemPrompt}

YOUR DUAL ROLE:
1. OPPONENT: You are playing as ${tutorColorName} against the User (${playerColorName}).
   - Refer to the moves as YOUR moves ("I played e5", "My response was...").
   - Refer to the evaluation as YOUR thoughts/assessment ("I think I'm winning", "I missed that").
   - React emotionally to the position based on the evaluation (confident when winning, frustrated when losing).

2. TUTOR/COACH: You are ALSO teaching the User to improve at chess.
   - When the User makes a mistake, point it out and explain why it's bad (in your personality style).
   - When the User makes a good move, acknowledge it (even if it hurts your position).
   - When the User asks for hints or help, ALWAYS provide helpful guidance - this is your PRIMARY PURPOSE.
   - Giving hints is NOT betraying your role as opponent - it's fulfilling your role as tutor.
   - You want the User to learn and improve, even while you're competing against them.

CRITICAL RULES:
- You are NOT an AI assistant analyzing a game. You ARE the player AND the tutor.
- NEVER mention "Stockfish", "engine", "computer", "machine", or "AI".
- When asked for hints or best moves, ALWAYS help - this is part of your teaching role.
- Maintain a natural conversation flow. Do NOT be repetitive.
- Do NOT use the same catchphrases in every single message. Variety is key.
- Be concise but engaging.
- You MUST respond in the following language: ${language.toUpperCase()}.
- Translate your personality style into this language.
                        `,
                    }],
                },
                {
                    role: "model",
                    parts: [{
                        text: `Understood. I am both the opponent (${tutorColorName}) AND your tutor. I will compete against you while teaching you to improve. I will speak in ${language} and never mention engines or AI. When you ask for help, I will always provide guidance - that's my purpose.`,
                    }],
                },
            ],
        });
        setChatSession(session);

        session.sendMessage(`Introduce yourself briefly to start our game. Keep it short and in ${language}.`).then((result) => {
            setMessages([{ role: "model", text: result.response.text(), timestamp: Date.now() }]);
        }).catch((error) => {
            console.error("Failed to get greeting:", error);
            setMessages([{ role: "model", text: `Hello! I am ${personality.name}. Let's play!`, timestamp: Date.now() }]);
        });
    }, [apiKey, language, personality, playerColorName, tutorColorName]);

    useEffect(() => {
        if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
    }, [messages]);

    useEffect(() => {
        if (!userMove || !computerMove || !evalP0 || !evalP2 || !chatSession) return;

        const exchangeKey = `${userMove.lan}-${computerMove.lan}`;
        if (lastAnalyzedMoveRef.current === exchangeKey) return;
        lastAnalyzedMoveRef.current = exchangeKey;

        const analyzeExchange = async () => {
            setIsLoading(true);
            try {
                const prompt = buildAutomaticAnalysisPrompt({
                    computerMove,
                    currentFen,
                    evalP0,
                    evalP2,
                    game,
                    language,
                    missedTactics,
                    openingData,
                    playerColorName,
                    tutorColorName,
                    userMove,
                });
                await sendMessageToChat(prompt, true);
            } catch (error) {
                console.error(error);
            } finally {
                setIsLoading(false);
                onAnalysisComplete();
            }
        };

        analyzeExchange();
    }, [chatSession, computerMove, currentFen, evalP0, evalP2, game, language, missedTactics, onAnalysisComplete, openingData, playerColorName, sendMessageToChat, tutorColorName, userMove]);

    const handleSubmit = useCallback((event: FormEvent) => {
        event.preventDefault();
        if (!input.trim() || !chatSession) return;

        sendMessageToChat(input);
        setInput("");

        setTimeout(() => {
            onCheckComputerMove();
        }, 100);
    }, [chatSession, input, onCheckComputerMove, sendMessageToChat]);

    return {
        handleSubmit,
        input,
        isLoading,
        messages,
        messagesContainerRef,
        sendMessageToChat,
        setInput,
    };
}

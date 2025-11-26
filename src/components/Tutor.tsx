"use client";

import { useState, useEffect, useRef } from "react";
import { Stockfish, StockfishEvaluation } from "@/lib/stockfish";
import { Chess, Move } from "chess.js";
import { getGenAIModel } from "@/lib/gemini";
import { ChatSession } from "@google/generative-ai";
import { Send, Bot, User as UserIcon, Loader2, Lightbulb, Trophy } from "lucide-react";
import clsx from "clsx";
import { Personality } from "@/lib/personalities";
import { OpeningMetadata } from "@/lib/openings";
import ReactMarkdown from "react-markdown";

import { useTranslation } from '@/lib/i18n/useTranslation';
import { SupportedLanguage } from '@/lib/i18n/translations';
import { DetectedTactic } from '@/lib/tacticDetection';

interface TutorProps {
    game: Chess;
    currentFen: string;
    userMove: Move | null;
    computerMove: Move | null;
    stockfish: Stockfish | null;
    evalP0: StockfishEvaluation | null;
    evalP2: StockfishEvaluation | null;
    openingData: OpeningMetadata | null;
    missedTactics: DetectedTactic[] | null;
    onAnalysisComplete: () => void;
    apiKey: string | null;
    personality: Personality;
    language: SupportedLanguage;
    playerColor: 'white' | 'black';
    onCheckComputerMove: () => void;
}

interface Message {
    role: "user" | "model";
    text: string;
    timestamp: number;
}

export function Tutor({ game, currentFen, userMove, computerMove, stockfish, evalP0, evalP2, openingData, missedTactics, onAnalysisComplete, apiKey, personality, language, playerColor, onCheckComputerMove }: TutorProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [chatSession, setChatSession] = useState<ChatSession | null>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);

    const t = useTranslation(language);

    // Determine tutor color (opposite of player)
    const tutorColor = playerColor === 'white' ? 'black' : 'white';
    const playerColorName = playerColor === 'white' ? 'White' : 'Black';
    const tutorColorName = tutorColor === 'white' ? 'White' : 'Black';

    // Initialize chat session with Personality System Prompt
    useEffect(() => {
        if (apiKey) {
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
                        ` }]
                    },
                    {
                        role: "model",
                        parts: [{ text: `Understood. I am both the opponent (${tutorColorName}) AND your tutor. I will compete against you while teaching you to improve. I will speak in ${language} and never mention engines or AI. When you ask for help, I will always provide guidance - that's my purpose.` }]
                    }
                ],
            });
            setChatSession(session);

            // Get initial greeting in the selected language
            session.sendMessage(`Introduce yourself briefly to start our game. Keep it short and in ${language}.`).then(result => {
                const greetingText = result.response.text();
                setMessages([{ role: "model", text: greetingText, timestamp: Date.now() }]);
            }).catch(err => {
                console.error("Failed to get greeting:", err);
                // Fallback to English if greeting fails
                setMessages([{ role: "model", text: `Hello! I am ${personality.name}. Let's play!`, timestamp: Date.now() }]);
            });
        }
    }, [apiKey, personality, language, playerColor]);

    // Scroll chat container to bottom (not the whole page)
    useEffect(() => {
        if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
    }, [messages]);

    const lastAnalyzedMoveRef = useRef<string | null>(null);

    // Stage 1: Automatic Reaction after COMPUTER Move (so we see the full exchange)
    useEffect(() => {
        if (!userMove || !computerMove || !evalP0 || !evalP2 || !chatSession) return;

        // Create a unique key for this exchange
        const exchangeKey = `${userMove.lan}-${computerMove.lan}`;

        // Prevent double analysis
        if (lastAnalyzedMoveRef.current === exchangeKey) return;
        lastAnalyzedMoveRef.current = exchangeKey;

        // We trigger this when computerMove changes (meaning the exchange is complete)
        const analyzeExchange = async () => {
            setIsLoading(true);
            try {
                // Calculate Evaluation Change (Delta)
                // evalP0: Before User Move (White's perspective)
                // evalP2: After Bot Move (White's perspective)
                // Delta = evalP2 - evalP0

                const preScore = evalP0.score;
                const postScore = evalP2.score;
                const preMate = evalP0.mate;
                const postMate = evalP2.mate;

                const delta = postScore - preScore;

                // Check for significant change
                let isSignificant = false;

                if (preMate !== null || postMate !== null) {
                    isSignificant = true; // Any mate involvement is significant
                } else if (Math.abs(delta) >= 50) {
                    isSignificant = true; // > 0.5 pawn change
                }

                let evalInstruction = "";
                if (isSignificant) {
                    evalInstruction = `The evaluation changed SIGNIFICANTLY (Delta: ${delta} cp). You MUST comment on this shift in power and what caused it.`;
                } else {
                    evalInstruction = "The evaluation change is MINOR/INSIGNIFICANT. Do NOT mention the score, 'advantage', or who is winning. Focus ONLY on the strategic purpose of the moves.";
                }

                // Opening Instruction
                let openingInstruction = "";
                if (openingData) {
                    openingInstruction = `
OPENING IDENTIFIED: ${openingData.name} (${openingData.eco}).
You MUST mention the opening name.
You can use this metadata to explain the position:
- Strengths (White): ${openingData.meta?.strengths_white?.join(", ")}
- Weaknesses (White): ${openingData.meta?.weaknesses_white?.join(", ")}
- Strengths (Black): ${openingData.meta?.strengths_black?.join(", ")}
- Weaknesses (Black): ${openingData.meta?.weaknesses_black?.join(", ")}
                    `;
                } else {
                    // openingInstruction = "NO opening identified. Do NOT invent an opening name. Do NOT mention openings.";
                    // Relaxed instruction to allow general commentary if no specific opening is found, but still forbid inventing names.
                    openingInstruction = "NO specific opening identified from database. Do NOT invent an opening name. Focus on the position.";
                }

                // Tactical Analysis Instruction
                let tacticalInstruction = "";
                if (missedTactics && missedTactics.length > 0) {
                    const meaningfulTactics = missedTactics.filter(t => t.tactic_type !== 'none');
                    if (meaningfulTactics.length > 0) {
                        const tacticDescriptions = meaningfulTactics.map(t => {
                            let desc = `- ${t.tactic_type.toUpperCase()}`;
                            if (t.piece_roles && t.piece_roles.length > 0) {
                                desc += ` involving ${t.piece_roles.join(' and ')}`;
                            }
                            if (t.material_delta) {
                                desc += ` (worth ~${t.material_delta} centipawns)`;
                            }
                            if (t.affected_squares && t.affected_squares.length > 0) {
                                desc += ` on squares ${t.affected_squares.join(', ')}`;
                            }
                            return desc;
                        }).join('\n');

                        tacticalInstruction = `
TACTICAL OPPORTUNITY MISSED:
The User just played ${userMove.san}, but there was a better tactical opportunity available.
The analysis engine identified the following tactical themes that could have been exploited:

${tacticDescriptions}

IMPORTANT CONTEXT:
- This tactical data comes from analyzing what WOULD HAVE HAPPENED if the User had played the best move instead.
- You should explain this missed opportunity in your characteristic style.
- Point out what the User could have done (e.g., "You missed a fork with Nf3!" or "There was a pin available with Bb5!").
- Be educational but stay in character - if you're sarcastic, be sarcastic about the miss; if you're encouraging, be supportive.
- Do NOT mention "the engine" or "the computer" - present this as YOUR analysis as the opponent/tutor.
- Only mention this if the evaluation change was significant enough to warrant it.
                        `;
                    }
                }

                const prompt = `
[SYSTEM TRIGGER: move_exchange]
User (${playerColorName}) Move: ${userMove.san}
My (${tutorColorName}) Reply: ${computerMove.san}

My Internal Thoughts (Data):
- Pre-Eval (Before User Move): ${preScore} cp
- Post-Eval (After My Reply): ${postScore} cp
- Delta: ${delta} cp
(Note: Scores are from White's perspective. Positive = White advantage, Negative = Black advantage.)

${tacticalInstruction}

INSTRUCTIONS:
1. ${evalInstruction}
2. ${openingInstruction}
3. ${tacticalInstruction ? 'If tactical opportunities were missed (see above), explain them in your style.' : ''}
4. Respond in ${language}.

React to this exchange as the player.
                `;

                await sendMessageToChat(prompt, true);
            } catch (e) {
                console.error(e);
            } finally {
                setIsLoading(false);
                onAnalysisComplete();
            }
        };
        analyzeExchange();
    }, [computerMove, chatSession, evalP0, evalP2, userMove, onAnalysisComplete, openingData, missedTactics, language]);

    const evaluateCurrentPosition = async () => {
        if (!stockfish) {
            return null;
        }
        try {
            const currentFen = game.fen();
            const evaluation = await stockfish.evaluate(currentFen, 15);
            return evaluation;
        } catch (error) {
            console.error("Error evaluating position:", error);
            return null;
        }
    };

    const sendMessageToChat = async (text: string, isSystemMessage: boolean = false) => {
        if (!chatSession) return;

        if (!isSystemMessage) {
            setMessages(prev => [...prev, { role: "user", text, timestamp: Date.now() }]);
        }

        setIsLoading(true);

        try {
            // Determine mode based on user text if it's not a system message
            let finalPrompt = text;
            if (!isSystemMessage) {
                const lower = text.toLowerCase();
                const evaluation = await evaluateCurrentPosition();

                if (lower.includes("best move") || lower.includes("solution") || lower.includes("tell me")) {
                    finalPrompt = `[SYSTEM TRIGGER: exact_move]

TEACHING MODE ACTIVATED:
The User is asking for the exact best move. This is a learning moment.
As their TUTOR, you MUST help them - this is your primary purpose.
Even though you are their opponent, teaching them is more important than hiding information.

User Question: ${text}

Current Position Data:
- Best Move: ${evaluation?.bestMove}
- Evaluation: ${evaluation?.score ?? 'N/A'} centipawns ${evaluation?.score !== undefined ? (evaluation.score > 0 ? '(White is better)' : evaluation.score < 0 ? '(Black is better)' : '(Equal)') : ''}
- Mate in: ${evaluation?.mate || 'None'}

INSTRUCTIONS:
- Tell them the best move clearly (e.g., "The best move is e2-e4" or "You should play Nf3")
- Explain WHY it's the best move (tactics, threats, positional ideas)
- Stay in your personality style, but be HELPFUL and EDUCATIONAL
- Do NOT refuse to help - teaching is your core role
- Keep it concise but informative`;

                } else if (lower.includes("hint") || lower.includes("tip") || lower.includes("help")) {
                    finalPrompt = `[SYSTEM TRIGGER: hint]

TEACHING MODE ACTIVATED:
The User is asking for a hint. This is a learning moment.
As their TUTOR, you MUST help them - this is your primary purpose.
Even though you are their opponent, teaching them is more important than winning.

User Question: ${text}

Current Position Data:
- Best Move: ${evaluation?.bestMove}
- Evaluation: ${evaluation?.score ?? 'N/A'} centipawns ${evaluation?.score !== undefined ? (evaluation.score > 0 ? '(White is better)' : evaluation.score < 0 ? '(Black is better)' : '(Equal)') : ''}
- Mate in: ${evaluation?.mate || 'None'}

INSTRUCTIONS:
- Give a HELPFUL hint without revealing the exact move (unless they specifically ask for it)
- Point them toward what to look for: tactics, threats, piece placement, weaknesses
- Examples: "Look at your knight on f3", "There's a tactic involving the bishop and queen", "Your king is vulnerable"
- Stay in your personality style, but be HELPFUL and EDUCATIONAL
- Do NOT refuse to help - teaching is your core role
- Do NOT just say the move - guide them to find it themselves`;
                }
            }

            const result = await chatSession.sendMessage(finalPrompt);
            const response = await result.response;
            const textResponse = response.text();

            setMessages(prev => [...prev, { role: "model", text: textResponse, timestamp: Date.now() }]);
        } catch (error) {
            console.error("Chat Error:", error);
            setMessages(prev => [...prev, { role: "model", text: "Sorry, I encountered an error.", timestamp: Date.now() }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || !chatSession) return;
        sendMessageToChat(input);
        setInput("");

        // Safety check: Ensure computer makes a move if it's their turn
        // This handles race conditions where the player moved before evalP0 was ready
        setTimeout(() => {
            onCheckComputerMove();
        }, 100);
    };

    if (!apiKey) return null;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 h-[400px] md:h-[600px] flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3 bg-gray-50 dark:bg-gray-900 rounded-t-lg">
                <div className="text-2xl">{personality.image}</div>
                <div>
                    <h2 className="font-bold text-gray-900 dark:text-white">{personality.name}</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">AI Coach ({language.toUpperCase()})</p>
                </div>
            </div>

            {/* Messages Area */}
            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, idx) => (
                    <div key={idx} className={clsx(
                        "flex gap-3 max-w-[85%]",
                        msg.role === "user" ? "ml-auto flex-row-reverse" : ""
                    )}>
                        <div className={clsx(
                            "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm",
                            msg.role === "user" ? "bg-blue-600 text-white" : "bg-gray-200 dark:bg-gray-700"
                        )}>
                            {msg.role === "user" ? <UserIcon size={16} /> : personality.image}
                        </div>
                        <div className={clsx(
                            "p-3 rounded-lg text-sm",
                            msg.role === "user"
                                ? "bg-blue-600 text-white rounded-tr-none"
                                : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-tl-none prose prose-sm dark:prose-invert max-w-none"
                        )}>
                            {msg.role === "user" ? (
                                <span className="whitespace-pre-wrap">{msg.text}</span>
                            ) : (
                                <ReactMarkdown
                                    components={{
                                        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                        strong: ({ children }) => <strong className="font-bold text-gray-900 dark:text-white">{children}</strong>,
                                        em: ({ children }) => <em className="italic">{children}</em>,
                                        ul: ({ children }) => <ul className="list-disc list-inside mb-2 last:mb-0 space-y-1">{children}</ul>,
                                        ol: ({ children }) => <ol className="list-decimal list-inside mb-2 last:mb-0 space-y-1">{children}</ol>,
                                        li: ({ children }) => <li className="ml-2">{children}</li>,
                                        code: ({ children }) => <code className="bg-gray-200 dark:bg-gray-600 px-1 py-0.5 rounded text-xs font-mono">{children}</code>,
                                        h1: ({ children }) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
                                        h2: ({ children }) => <h2 className="text-base font-bold mb-2">{children}</h2>,
                                        h3: ({ children }) => <h3 className="text-sm font-bold mb-1">{children}</h3>,
                                    }}
                                >
                                    {msg.text}
                                </ReactMarkdown>
                            )}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                            {personality.image}
                        </div>
                        <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg rounded-tl-none flex items-center">
                            <Loader2 className="animate-spin text-gray-500" size={16} />
                        </div>
                    </div>
                )}
            </div>

            {/* Quick Actions */}
            <div className="px-4 py-2 flex gap-2 overflow-x-auto">
                <button
                    onClick={() => sendMessageToChat("Give me a hint")}
                    className="flex items-center gap-1 px-3 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full hover:bg-yellow-200 dark:bg-yellow-900 dark:text-yellow-200"
                >
                    <Lightbulb size={12} /> {t.tutor.hint}
                </button>
                <button
                    onClick={() => sendMessageToChat("What is the best move?")}
                    className="flex items-center gap-1 px-3 py-1 text-xs bg-green-100 text-green-800 rounded-full hover:bg-green-200 dark:bg-green-900 dark:text-green-200"
                >
                    <Trophy size={12} /> {t.tutor.bestMove}
                </button>
            </div>

            {/* Input Area */}
            <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={t.tutor.askCoach}
                    className="flex-1 p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isLoading}
                />
                <button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Send size={20} />
                </button>
            </form>
        </div>
    );
}

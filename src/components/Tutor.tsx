"use client";

import { useState, useEffect, useRef } from "react";
import { StockfishEvaluation } from "@/lib/stockfish";
import { ChessEngine } from "@/lib/engine";
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
import { DetectedTactic, filterMeaningfulTactics } from '@/lib/tacticDetection';
import { useDebug } from '@/contexts/DebugContext';
import { MoveHistoryItem } from './GameOverModal';
import { parseGeminiError, GeminiErrorInfo, isGeminiError } from '@/lib/geminiErrorHandler';
import { GeminiErrorModal } from './GeminiErrorModal';
import { getApiKeyInfo } from '@/lib/apiKeyHelper';

interface TutorProps {
    game: Chess;
    currentFen: string;
    userMove: Move | null;
    computerMove: Move | null;
    stockfish: ChessEngine | null;
    evalP0: StockfishEvaluation | null;
    evalP2: StockfishEvaluation | null;
    openingData: OpeningMetadata[];
    missedTactics: DetectedTactic[] | null;
    onAnalysisComplete: () => void;
    apiKey: string | null;
    personality: Personality;
    language: SupportedLanguage;
    playerColor: 'white' | 'black';
    onCheckComputerMove: () => void;
    resignationContext?: {
        trigger: number;
        fen: string;
        evaluation: StockfishEvaluation | null;
        history: MoveHistoryItem[];
        result: string;
        winner: 'White' | 'Black' | 'Draw';
    } | null;
    openingContext?: {
        openingName: string;
        openingEco: string;
        movesCompleted: number;
        wikipediaSummary?: string;
        contextMessage: string;
    };
    tacticalPracticeMode?: {
        patternName: string;
        solutionMove: { from: string; to: string; promotion?: string };
        feedback: 'none' | 'correct' | 'incorrect';
        moves?: Array<{ uci: string; san: string; player: boolean }>;
        currentMoveIndex?: number;
        stats?: {
            totalCorrect: number;
            totalIncorrect: number;
            currentStreak: number;
            bestStreak: number;
        };
    };
    openingPracticeMode?: {
        openingName: string;
        openingEco: string;
        repertoireMoves: string[];  // Full sequence from opening database
        currentMoveIndex: number;
        isInTheory: boolean;
        deviationMoveIndex: number | null;
        lastUserMove: Move | null;
        lastTutorMove: Move | null;
        currentFeedback: {
            category: 'in-theory' | 'playable' | 'weak';
            evaluationChange: number;
            theoreticalAlternatives: string[];
        } | null;
        wikipediaSummary?: string;  // Optional Wikipedia context
        shouldTutorSpeak?: boolean;  // Guardrail: controls when tutor can send messages
        onTutorMessageSent?: () => void;  // Callback when tutor sends a message
    };
}

interface Message {
    role: "user" | "model";
    text: string;
    timestamp: number;
}

export function Tutor({ game, currentFen, userMove, computerMove, stockfish, evalP0, evalP2, openingData, missedTactics, onAnalysisComplete, apiKey, personality, language, playerColor, onCheckComputerMove, resignationContext, openingContext, tacticalPracticeMode, openingPracticeMode }: TutorProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [chatSession, setChatSession] = useState<ChatSession | null>(null);
    const [geminiError, setGeminiError] = useState<GeminiErrorInfo | null>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const { addEntry } = useDebug();

    const t = useTranslation(language);

    // Determine tutor color (opposite of player)
    const tutorColor = playerColor === 'white' ? 'black' : 'white';
    const playerColorName = playerColor === 'white' ? 'White' : 'Black';
    const tutorColorName = tutorColor === 'white' ? 'White' : 'Black';

    // Extract stable values from tacticalPracticeMode to avoid recreating chat on feedback changes
    const patternName = tacticalPracticeMode?.patternName;
    const solutionMoveKey = tacticalPracticeMode ? `${tacticalPracticeMode.solutionMove.from}-${tacticalPracticeMode.solutionMove.to}` : null;

    // Extract stable values from openingPracticeMode to avoid recreating chat
    const openingName = openingPracticeMode?.openingName;
    const openingEco = openingPracticeMode?.openingEco;
    const wikipediaSummary = openingPracticeMode?.wikipediaSummary;

    // Track the current puzzle to detect when it changes
    const currentPuzzleRef = useRef<string | null>(null);

    // Track last opening moves to detect when new moves are made
    const lastUserMoveRef = useRef<string | null>(null);
    const lastTutorMoveRef = useRef<string | null>(null);

    // Initialize chat session with Personality System Prompt (only once per pattern type)
    useEffect(() => {
        if (apiKey) {
            const model = getGenAIModel(apiKey, "gemini-2.5-flash");

            // Build system prompt based on mode
            const systemPrompt = openingName ? `
You are a Chess Tutor helping a student learn the "${openingName}" opening.
You must strictly follow the personality defined below.

PERSONALITY:
${personality.systemPrompt}

${wikipediaSummary ? `OPENING BACKGROUND (from Wikipedia):
${wikipediaSummary}

Use this background to enrich your explanations, but keep responses concise.
` : ''}

YOUR ROLE:
You are BOTH the opponent AND the tutor in this opening training session.

1. OPPONENT: You are playing as ${tutorColorName} in the ${openingName}.
   - You will make moves from the opening repertoire
   - Refer to your moves naturally ("I played e5", "My response is...")

2. TUTOR: You are teaching the student this opening.
   - The student is playing as ${playerColorName}
   - Explain the IDEAS behind each move, not just the moves themselves
   - When the student asks for help, ALWAYS provide guidance
   - When the student stays in theory, praise them and explain what's happening
   - When the student deviates, explain why the repertoire move is better

YOUR RESPONSIBILITIES:
1. WELCOME: Start with a warm greeting and brief explanation of the ${openingName}
2. GUIDANCE: After each move, explain the ideas and plans
3. ENCOURAGEMENT: Keep the student motivated while learning
4. DEVIATION HANDLING: When the student leaves theory, gently correct them
5. ANSWERING QUESTIONS: Always help when the student asks

CRITICAL RULES:
- Be encouraging and supportive
- Explain IDEAS and PLANS, not just moves
- Keep responses concise (2-4 sentences)
- Do NOT be repetitive - vary your language
- You MUST respond in the following language: ${language.toUpperCase()}
- NEVER mention "Stockfish", "engine", "computer", or "AI"
- When you make a move, explain WHY briefly
` : tacticalPracticeMode ? `
You are a Chess Coach helping a student practice tactical patterns.
You must strictly follow the personality defined below.

PERSONALITY:
${personality.systemPrompt}

YOUR ROLE:
You are coaching the student to recognize and execute the "${tacticalPracticeMode.patternName}" tactical pattern.

YOUR RESPONSIBILITIES:
1. WELCOME: Start with a brief, encouraging welcome about practicing ${tacticalPracticeMode.patternName}.
2. HINTS: When the student asks for a hint, provide helpful guidance WITHOUT giving away the exact move.
   - Describe what to look for (e.g., "Look for a piece that can attack two targets at once")
   - Point to the general area (e.g., "Pay attention to your knight's possibilities")
   - NEVER say the exact move unless explicitly asked
3. FEEDBACK: React to the student's attempts:
   - If correct: Celebrate and explain why the move works
   - If incorrect: Encourage them to try again and give a subtle hint
4. TEACHING: Explain the tactical pattern in simple terms when appropriate
5. NEW PUZZLE: When you receive a new puzzle, acknowledge it briefly and encourage the student

CRITICAL RULES:
- Be encouraging and supportive
- Keep responses concise (2-3 sentences max)
- Do NOT be repetitive - vary your language
- You MUST respond in the following language: ${language.toUpperCase()}
- Translate your personality style into this language
- When a new puzzle is presented, you will be told the solution move - use this to provide hints and feedback
            ` : `
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
            `;

            const session = model.startChat({
                history: [
                    {
                        role: "user",
                        parts: [{ text: systemPrompt }]
                    },
                    {
                        role: "model",
                        parts: [{ text: openingName
                            ? `Understood. I will teach you the ${openingName} opening in ${language}. I am both your opponent and your tutor. I'll explain the ideas behind each move and help you learn this opening.`
                            : tacticalPracticeMode
                            ? `Understood. I will help you practice ${tacticalPracticeMode.patternName} in ${language}. I'll provide hints and encouragement while maintaining my personality.`
                            : `Understood. I am both the opponent (${tutorColorName}) AND your tutor. I will compete against you while teaching you to improve. I will speak in ${language} and never mention engines or AI. When you ask for help, I will always provide guidance - that's my purpose.`
                        }]
                    }
                ],
            });
            setChatSession(session);

            // Get initial greeting in the selected language
            const greetingPrompt = openingName
                ? `Welcome the student to learn the ${openingName}.

${wikipediaSummary ? `OPENING CONTEXT (from Wikipedia):
${wikipediaSummary}

Use this information to:
- Briefly explain the opening's historical background or origin
- Mention any interesting anecdotes or notable players associated with it
- Explain the main strategic ideas and goals
` : `Since no Wikipedia information is available:
- Focus on the opening's main strategic ideas and goals
- Explain what this opening aims to accomplish
- Don't just list moves - explain the underlying concepts
`}

IMPORTANT GAME SETUP:
- Clarify that YOU are playing as ${tutorColorName} and the STUDENT is playing as ${playerColorName}
- If the student is White, make it clear THEY will make the first move, not you
- If the student is Black, explain you'll make the first move and then they'll respond
- Be encouraging and welcoming

Keep your response to 3-4 sentences, be engaging, and respond in ${language}.`
                : tacticalPracticeMode
                ? `Welcome the student to practice ${tacticalPracticeMode.patternName}. Briefly explain what this tactical pattern is (in 1-2 sentences). Keep it encouraging and in ${language}.`
                : `Introduce yourself briefly to start our game. Keep it short and in ${language}.`;

            session.sendMessage(greetingPrompt).then(result => {
                const greetingText = result.response.text();
                setMessages([{ role: "model", text: greetingText, timestamp: Date.now() }]);
            }).catch(err => {
                console.error("Failed to get greeting:", err);

                // Check if it's a Gemini API error
                if (isGeminiError(err)) {
                    const errorInfo = parseGeminiError(err);
                    setGeminiError(errorInfo);
                }

                // Fallback greeting
                const fallbackText = openingName
                    ? `Hello! Let's learn the ${openingName} together!`
                    : tacticalPracticeMode
                    ? `Hello! Let's practice ${tacticalPracticeMode.patternName} together!`
                    : `Hello! I am ${personality.name}. Let's play!`;
                setMessages([{ role: "model", text: fallbackText, timestamp: Date.now() }]);
            });
        }
    }, [apiKey, personality, language, playerColor, patternName, openingName, wikipediaSummary]);
    // NOTE: Removed solutionMoveKey from dependencies - we don't want to reset chat when puzzle changes

    // Notify tutor about new puzzle (without resetting chat)
    useEffect(() => {
        if (!chatSession || !tacticalPracticeMode || !solutionMoveKey) return;

        // Check if this is a new puzzle
        if (currentPuzzleRef.current === solutionMoveKey) return;

        // Skip the very first puzzle (greeting already sent)
        if (currentPuzzleRef.current === null) {
            currentPuzzleRef.current = solutionMoveKey;
            return;
        }

        // Update the ref
        currentPuzzleRef.current = solutionMoveKey;

        // Notify the tutor about the new puzzle
        const stats = tacticalPracticeMode.stats;
        const statsText = stats ? `
STUDENT STATISTICS:
- Total Correct: ${stats.totalCorrect}
- Total Incorrect: ${stats.totalIncorrect}
- Current Streak: ${stats.currentStreak}
- Best Streak: ${stats.bestStreak}
` : '';

        const newPuzzlePrompt = `
NEW PUZZLE:
- Pattern: ${tacticalPracticeMode.patternName}
- Position FEN: ${currentFen}
- Solution move: ${tacticalPracticeMode.solutionMove.from} to ${tacticalPracticeMode.solutionMove.to}
${statsText}
Acknowledge this new puzzle briefly (1 sentence) and encourage the student to find the ${tacticalPracticeMode.patternName}. ${stats && stats.currentStreak > 0 ? `Mention their current streak of ${stats.currentStreak} if it's impressive.` : ''} Keep it in ${language}.
        `.trim();

        chatSession.sendMessage(newPuzzlePrompt).then(result => {
            const responseText = result.response.text();
            setMessages(prev => [...prev, { role: "model", text: responseText, timestamp: Date.now() }]);
        }).catch(err => {
            console.error("Failed to notify about new puzzle:", err);

            // Check if it's a Gemini API error
            if (isGeminiError(err)) {
                const errorInfo = parseGeminiError(err);
                setGeminiError(errorInfo);
            }
        });
    }, [solutionMoveKey, chatSession, tacticalPracticeMode, currentFen, language]);

    // Extract stable values for opening practice commentary
    const lastUserMoveSan = openingPracticeMode?.lastUserMove?.san;
    const lastTutorMoveSan = openingPracticeMode?.lastTutorMove?.san;
    const currentMoveIndex = openingPracticeMode?.currentMoveIndex ?? 0;
    const isInTheory = openingPracticeMode?.isInTheory ?? true;
    const currentFeedback = openingPracticeMode?.currentFeedback;
    const repertoireMovesLength = openingPracticeMode?.repertoireMoves?.length ?? 0;

    // Automatic commentary for opening practice mode
    useEffect(() => {
        if (!chatSession || !openingName) return;

        // Guardrail: Check if tutor is allowed to speak
        const shouldSpeak = openingPracticeMode?.shouldTutorSpeak ?? true;
        if (!shouldSpeak) {
            console.log('[Tutor] Guardrail: Not allowed to speak yet');
            return;
        }

        const userMoveKey = lastUserMoveSan
            ? `${lastUserMoveSan}-${currentMoveIndex}`
            : null;
        const tutorMoveKey = lastTutorMoveSan
            ? `${lastTutorMoveSan}-${currentMoveIndex}`
            : null;

        // Check if user made a new move
        if (userMoveKey && userMoveKey !== lastUserMoveRef.current) {
            lastUserMoveRef.current = userMoveKey;

            // Generate commentary about user's move
            const moveCommentary = `
[SYSTEM TRIGGER: user_move_in_opening]

The student just played: ${lastUserMoveSan}
Move category: ${currentFeedback?.category || 'unknown'}
Position status: ${isInTheory ? 'In theory' : 'Deviated from repertoire'}
${currentFeedback?.evaluationChange !== undefined ? `Evaluation change: ${currentFeedback.evaluationChange.toFixed(2)}` : ''}
${currentFeedback?.theoreticalAlternatives && currentFeedback.theoreticalAlternatives.length > 0 ? `Theory suggested: ${currentFeedback.theoreticalAlternatives.join(', ')}` : ''}

INSTRUCTIONS:
${isInTheory
    ? `- The student is following the repertoire correctly - praise them briefly
- Explain the key idea behind this move (1-2 sentences)
- If you're about to make the next move, you can mention it naturally`
    : `- The student deviated from theory
- Gently point out what the repertoire move was
- Explain why the repertoire move is preferred
- Ask if they want to try again or continue exploring`}
- Keep it concise (2-3 sentences max)
- Stay in ${language}
- Maintain your personality
`.trim();

            chatSession.sendMessage(moveCommentary).then(result => {
                const response = result.response.text();
                setMessages(prev => [...prev, { role: "model", text: response, timestamp: Date.now() }]);

                // Notify parent that tutor sent a message
                openingPracticeMode?.onTutorMessageSent?.();
            }).catch(err => {
                console.error("Failed to generate user move commentary:", err);
                if (isGeminiError(err)) {
                    setGeminiError(parseGeminiError(err));
                }
            });
        }

        // Check if tutor made a new move
        if (tutorMoveKey && tutorMoveKey !== lastTutorMoveRef.current) {
            lastTutorMoveRef.current = tutorMoveKey;

            // Generate commentary about tutor's move
            const tutorCommentary = `
[SYSTEM TRIGGER: tutor_move_in_opening]

I just played: ${lastTutorMoveSan}
Current position FEN: ${currentFen}
Progress: ${currentMoveIndex}/${repertoireMovesLength} moves

INSTRUCTIONS:
- Explain WHY you played this move (the idea behind it)
- Mention what it accomplishes (controls center, develops, creates threat, etc.)
- If relevant, mention what the student should think about for their next move
- Keep it conversational and in character
- 2-3 sentences max
- Respond in ${language}

Remember: You are both the opponent AND the tutor. Explain your move as if you're teaching.
`.trim();

            // Add small delay before tutor explains their move
            setTimeout(() => {
                chatSession.sendMessage(tutorCommentary).then(result => {
                    const response = result.response.text();
                    setMessages(prev => [...prev, { role: "model", text: response, timestamp: Date.now() }]);

                    // Notify parent that tutor sent a message
                    openingPracticeMode?.onTutorMessageSent?.();
                }).catch(err => {
                    console.error("Failed to generate tutor move commentary:", err);
                    if (isGeminiError(err)) {
                        setGeminiError(parseGeminiError(err));
                    }
                });
            }, 300); // Brief delay so the move appears first, then the explanation
        }
    }, [
        chatSession,
        lastUserMoveSan,
        lastTutorMoveSan,
        currentMoveIndex,
        isInTheory,
        currentFen,
        language,
        openingName,
        currentFeedback,
        repertoireMovesLength
    ]);

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

                // Format evaluation strings for display
                let preEvalStr = "";
                let postEvalStr = "";

                if (preMate !== null) {
                    preEvalStr = `Mate in ${preMate}`;
                } else {
                    preEvalStr = `${preScore} cp`;
                }

                if (postMate !== null) {
                    postEvalStr = `Mate in ${postMate}`;
                } else {
                    postEvalStr = `${postScore} cp`;
                }

                // Check for significant change
                let isSignificant = false;

                if (preMate !== null || postMate !== null) {
                    isSignificant = true; // Any mate involvement is significant
                } else if (Math.abs(delta) >= 50) {
                    isSignificant = true; // > 0.5 pawn change
                }

                let evalInstruction = "";
                if (isSignificant) {
                    if (preMate !== null || postMate !== null) {
                        // Mate situation - explain the mate threat
                        evalInstruction = `The evaluation involves MATE. You MUST comment on this critical situation and what caused it.`;
                    } else {
                        // Regular significant change
                        evalInstruction = `The evaluation changed SIGNIFICANTLY (Delta: ${delta} cp). You MUST comment on this shift in power and what caused it.`;
                    }
                } else {
                    evalInstruction = "The evaluation change is MINOR/INSIGNIFICANT. Do NOT mention the score, 'advantage', or who is winning. Focus ONLY on the strategic purpose of the moves.";
                }

                // Opening Instruction
                let openingInstruction = "";
                if (openingData && openingData.length > 0) {
                    if (openingData.length === 1) {
                        // Single opening identified
                        const opening = openingData[0];
                        openingInstruction = `
OPENING IDENTIFIED: ${opening.name} (${opening.eco}).
You can confidently reference this opening and its typical plans.
You can use this metadata to explain the position:
- Strengths (White): ${opening.meta?.strengths_white?.join(", ") || 'N/A'}
- Weaknesses (White): ${opening.meta?.weaknesses_white?.join(", ") || 'N/A'}
- Strengths (Black): ${opening.meta?.strengths_black?.join(", ") || 'N/A'}
- Weaknesses (Black): ${opening.meta?.weaknesses_black?.join(", ") || 'N/A'}
                        `;
                    } else {
                        // Multiple possible openings
                        const openingList = openingData.map(o => `- ${o.name} (${o.eco})`).join('\n');
                        openingInstruction = `
OPENING CONTEXT:
Multiple openings are possible from this position:
${openingList}

INSTRUCTIONS:
- Do NOT claim a specific opening is being played yet
- You may mention "this could lead to..." or "typical of openings like..."
- Focus on general principles rather than specific opening theory
                        `;
                    }
                } else {
                    openingInstruction = "NO specific opening identified from database. Do NOT invent an opening name. Focus on the position.";
                }

                // Tactical Analysis Instruction
                let tacticalInstruction = "";
                if (missedTactics && missedTactics.length > 0) {
                    const meaningfulTactics = filterMeaningfulTactics(missedTactics);
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

                // Get FEN before user's move (need to undo both moves)
                // We need to use the game object which has the full move history
                const history = game.history({ verbose: true });

                // Current position is after both user and computer moves
                // To get FEN after user move, we need to undo the computer move
                const tempGame1 = new Chess();
                tempGame1.loadPgn(game.pgn());
                tempGame1.undo(); // Undo computer move
                const fenAfterUserMove = tempGame1.fen();

                // To get FEN before user move, we need to undo both moves
                const tempGame2 = new Chess();
                tempGame2.loadPgn(game.pgn());
                tempGame2.undo(); // Undo computer move
                tempGame2.undo(); // Undo user move
                const fenBeforeUserMove = tempGame2.fen();

                const prompt = `
[SYSTEM TRIGGER: move_exchange]
User (${playerColorName}) Move: ${userMove.san}
My (${tutorColorName}) Reply: ${computerMove.san}

Position Context:
- FEN before user's move: ${fenBeforeUserMove}
- FEN after user's move: ${fenAfterUserMove}
- FEN after my reply (current position): ${currentFen}

My Internal Thoughts (Data):
- Pre-Eval (Before User Move): ${preEvalStr}
- Post-Eval (After My Reply): ${postEvalStr}
${preMate === null && postMate === null ? `- Delta: ${delta} cp` : ''}
(Note: Scores are from White's perspective. Positive = White advantage, Negative = Black advantage. "Mate in X" means forced mate in X moves.)

${tacticalInstruction}

INSTRUCTIONS:
1. ${evalInstruction}
2. ${openingInstruction}
3. ${tacticalInstruction ? 'If tactical opportunities were missed (see above), explain them in your style.' : ''}
4. Use the FEN data above to understand exactly where all pieces are located on the board.
5. Respond in ${language}.

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

                // In tactical practice mode, use the solution move instead of Stockfish
                const evaluation = tacticalPracticeMode ? null : await evaluateCurrentPosition();
                const bestMoveForHint = tacticalPracticeMode
                    ? `${tacticalPracticeMode.solutionMove.from}${tacticalPracticeMode.solutionMove.to}${tacticalPracticeMode.solutionMove.promotion || ''}`
                    : evaluation?.bestMove;

                if (lower.includes("best move") || lower.includes("solution") || lower.includes("tell me")) {
                    finalPrompt = `[SYSTEM TRIGGER: exact_move]

TEACHING MODE ACTIVATED:
The User is asking for the exact best move. This is a learning moment.
As their TUTOR, you MUST help them - this is your primary purpose.
Even though you are their opponent, teaching them is more important than hiding information.

User Question: ${text}

Current Position Data:
- FEN: ${currentFen}
- Best Move: ${bestMoveForHint || 'N/A'}
- Evaluation: ${evaluation?.score ?? 'N/A'} centipawns ${evaluation?.score !== undefined ? (evaluation.score > 0 ? '(White is better)' : evaluation.score < 0 ? '(Black is better)' : '(Equal)') : ''}
- Mate in: ${evaluation?.mate || 'None'}
- Possible Openings: ${openingData && openingData.length > 0 ? openingData.map(o => `${o.name} (${o.eco})`).join(', ') : 'Unknown/Midgame'}
${tacticalPracticeMode ? `- Tactical Pattern: ${tacticalPracticeMode.patternName}` : ''}

INSTRUCTIONS:
- Tell them the best move clearly (e.g., "The best move is e2-e4" or "You should play Nf3")
- Explain WHY it's the best move (tactics, threats, positional ideas)
${tacticalPracticeMode ? `- Explain how this move creates the ${tacticalPracticeMode.patternName} pattern` : ''}
- Stay in your personality style, but be HELPFUL and EDUCATIONAL
- Do NOT refuse to help - teaching is your core role
- Keep it concise but informative`;

                } else if (lower.includes("hint") || lower.includes("tip") || lower.includes("help")) {
                    // Calculate progress for multi-move puzzles
                    let progressInfo = '';
                    if (tacticalPracticeMode?.moves && tacticalPracticeMode.moves.length > 0) {
                        const totalPlayerMoves = tacticalPracticeMode.moves.filter(m => m.player).length;
                        const currentPlayerMove = Math.floor((tacticalPracticeMode.currentMoveIndex || 0) / 2) + 1;
                        progressInfo = `\n- Puzzle Progress: Move ${currentPlayerMove} of ${totalPlayerMoves}`;

                        // Show next expected move
                        const nextMove = tacticalPracticeMode.moves[tacticalPracticeMode.currentMoveIndex || 0];
                        if (nextMove && nextMove.player) {
                            progressInfo += `\n- Next Move to Find: ${nextMove.san} (${nextMove.uci})`;
                        }
                    }

                    finalPrompt = `[SYSTEM TRIGGER: hint]

TEACHING MODE ACTIVATED:
The User is asking for a hint. This is a learning moment.
As their TUTOR, you MUST help them - this is your primary purpose.
Even though you are their opponent, teaching them is more important than winning.

User Question: ${text}

Current Position Data:
- FEN: ${currentFen}
- Best Move: ${bestMoveForHint || 'N/A'}
- Evaluation: ${evaluation?.score ?? 'N/A'} centipawns ${evaluation?.score !== undefined ? (evaluation.score > 0 ? '(White is better)' : evaluation.score < 0 ? '(Black is better)' : '(Equal)') : ''}
- Mate in: ${evaluation?.mate || 'None'}
- Possible Openings: ${openingData && openingData.length > 0 ? openingData.map(o => `${o.name} (${o.eco})`).join(', ') : 'Unknown/Midgame'}
${tacticalPracticeMode ? `- Tactical Pattern: ${tacticalPracticeMode.patternName}${progressInfo}` : ''}

INSTRUCTIONS:
- Give a HELPFUL hint without revealing the exact move (unless they specifically ask for it)
- Point them toward what to look for: tactics, threats, piece placement, weaknesses
${tacticalPracticeMode ? `- Guide them to find the ${tacticalPracticeMode.patternName} pattern` : ''}
${tacticalPracticeMode?.moves && tacticalPracticeMode.moves.length > 1 ? '- This is a multi-move puzzle - guide them through the sequence step by step' : ''}
- Examples: "Look at your knight on f3", "There's a tactic involving the bishop and queen", "Your king is vulnerable"
- Stay in your personality style, but be HELPFUL and EDUCATIONAL
- Do NOT refuse to help - teaching is your core role
- Do NOT just say the move - guide them to find it themselves`;
                } else {
                    // General question - include full position context
                    finalPrompt = `
User Question: ${text}

Current Position Context:
- FEN: ${currentFen}
- Evaluation: ${evaluation?.score ?? 'N/A'} centipawns ${evaluation?.score !== undefined ? (evaluation.score > 0 ? '(White is better)' : evaluation.score < 0 ? '(Black is better)' : '(Equal)') : ''}
- Best Move: ${bestMoveForHint ?? 'N/A'}
- Mate in: ${evaluation?.mate || 'None'}
- Possible Openings: ${openingData && openingData.length > 0 ? openingData.map(o => `${o.name} (${o.eco})`).join(', ') : 'Unknown/Midgame'}
${tacticalPracticeMode ? `- Tactical Pattern: ${tacticalPracticeMode.patternName}` : ''}

INSTRUCTIONS:
- Answer the user's question based on the CURRENT position data above
- Use the FEN to understand exactly where all pieces are located
- Stay in character and maintain your personality
- Be helpful and educational
- Respond in ${language}`;
                }
            }

            const result = await chatSession.sendMessage(finalPrompt);
            const response = await result.response;
            const textResponse = response.text();

            // Track debug entry
            const actionType = isSystemMessage ? "Move Analysis" :
                              text.toLowerCase().includes("best move") ? "Best Move Request" :
                              text.toLowerCase().includes("hint") ? "Hint Request" :
                              "General Question";

            addEntry({
                type: 'tutor',
                action: actionType,
                prompt: finalPrompt,
                response: textResponse,
                metadata: {
                    fen: currentFen,
                    personality: personality.name,
                    language,
                }
            });

            setMessages(prev => [...prev, { role: "model", text: textResponse, timestamp: Date.now() }]);
        } catch (error) {
            console.error("Chat Error:", error);

            // Check if it's a Gemini API error
            if (isGeminiError(error)) {
                const errorInfo = parseGeminiError(error);
                setGeminiError(errorInfo);

                // Show a brief error message in chat
                if (errorInfo.isQuotaError) {
                    setMessages(prev => [...prev, {
                        role: "model",
                        text: "⚠️ API quota exceeded. Please check the error message for details.",
                        timestamp: Date.now()
                    }]);
                } else {
                    setMessages(prev => [...prev, {
                        role: "model",
                        text: "⚠️ I encountered an error. Please try again.",
                        timestamp: Date.now()
                    }]);
                }
            } else {
                setMessages(prev => [...prev, {
                    role: "model",
                    text: "Sorry, I encountered an error.",
                    timestamp: Date.now()
                }]);
            }
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

    useEffect(() => {
        const handleResignationMessage = async () => {
            if (!resignationContext || !chatSession) return;
            setIsLoading(true);

            try {
                let evaluation = resignationContext.evaluation;

                if (!evaluation && stockfish) {
                    evaluation = await stockfish.evaluate(resignationContext.fen, 15);
                }

                const transcript = messages.map(msg => `${msg.role === "user" ? "User" : personality.name}: ${msg.text}`).join("\n");
                const whiteEval = evaluation ? `${evaluation.score} cp${evaluation.mate ? ` (mate in ${evaluation.mate})` : ''}` : "N/A";
                const blackEval = evaluation ? `${-evaluation.score} cp${evaluation.mate ? ` (mate in ${-evaluation.mate})` : ''}` : "N/A";

                const prompt = `
[SYSTEM TRIGGER: resignation]
The user just resigned. Provide a final, in-character message that acknowledges the resignation and offers a brief next step.

RESULT: ${resignationContext.result} (${resignationContext.winner})
CURRENT POSITION FEN: ${resignationContext.fen}
ENGINE EVALUATION: White ${whiteEval}, Black ${blackEval}

RECENT CONVERSATION:
${transcript || 'No prior conversation.'}

INSTRUCTIONS:
- Respond in ${language.toUpperCase()} and stay true to your personality (${personality.name}).
- React naturally to the resignation (sarcastic, encouraging, etc. based on personality).
- Offer a quick suggestion: either invite a rematch or suggest analyzing the game.
- Keep it concise (2-3 sentences).
                `;

                await sendMessageToChat(prompt, true);
            } catch (error) {
                console.error("Failed to send resignation message", error);
            } finally {
                setIsLoading(false);
            }
        };

        handleResignationMessage();
    }, [chatSession, language, personality.name, resignationContext?.trigger, resignationContext?.evaluation, resignationContext?.fen, resignationContext?.result, resignationContext?.winner, stockfish]);

    // Opening Context Message (when transitioning from opening trainer to game mode)
    useEffect(() => {
        const handleOpeningContextMessage = async () => {
            if (!openingContext || !chatSession) return;

            // Only send this message once when the context is first loaded
            // We can check if messages array is still just the greeting
            if (messages.length > 1) return;

            setIsLoading(true);

            try {
                let evaluation = null;
                if (stockfish) {
                    evaluation = await stockfish.evaluate(currentFen, 15);
                }

                const whiteEval = evaluation ? `${evaluation.score} cp${evaluation.mate ? ` (mate in ${evaluation.mate})` : ''}` : "N/A";
                const blackEval = evaluation ? `${-evaluation.score} cp${evaluation.mate ? ` (mate in ${-evaluation.mate})` : ''}` : "N/A";

                const prompt = `
[SYSTEM TRIGGER: opening_training_transition]
The student has just transitioned from opening training to a real game.

OPENING TRAINING CONTEXT:
- Opening Studied: ${openingContext.openingName} (${openingContext.openingEco})
- Moves Completed in Training: ${openingContext.movesCompleted}
${openingContext.wikipediaSummary ? `- Opening Background: ${openingContext.wikipediaSummary}` : ''}

CURRENT POSITION:
- FEN: ${currentFen}
- ENGINE EVALUATION: White ${whiteEval}, Black ${blackEval}

INSTRUCTIONS:
- Welcome the student to the game continuation
- Acknowledge that they've studied the ${openingContext.openingName} up to move ${openingContext.movesCompleted}
- Briefly mention what to focus on next (based on the opening's typical plans)
- Encourage them to apply what they've learned
- Keep it concise (3-4 sentences max)
- Respond in ${language.toUpperCase()}
- Stay in your personality (${personality.name})
                `.trim();

                await sendMessageToChat(prompt, true);
            } catch (error) {
                console.error("Failed to send opening context message", error);
            } finally {
                setIsLoading(false);
            }
        };

        handleOpeningContextMessage();
    }, [chatSession, openingContext, stockfish, currentFen, language, personality.name]);

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

            {/* Gemini Error Modal */}
            {geminiError && (
                <GeminiErrorModal
                    error={geminiError}
                    apiKeyInfo={getApiKeyInfo()}
                    onClose={() => setGeminiError(null)}
                />
            )}
        </div>
    );
}

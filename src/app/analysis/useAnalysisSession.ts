"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";

import { useDebug } from "@/contexts/DebugContext";
import { buildMoveCommentaryPrompt } from "@/lib/analysisPrompts";
import { detectChessFormat, ChessFormat } from "@/lib/chessFormatDetector";
import { getGenAIModel } from "@/lib/gemini";
import { LLMChatSession } from "@/lib/llm/types";
import { getApiKeyInfo } from "@/lib/apiKeyHelper";
import { SupportedLanguage } from "@/lib/i18n/translations";
import { lookupPossibleOpenings, buildMoveSequenceFromSteps } from "@/lib/openings";
import { Personality, PERSONALITIES } from "@/lib/personalities";
import { Stockfish, StockfishEvaluation } from "@/lib/stockfish";
import { detectMissedTactics, DetectedTactic, uciToSan } from "@/lib/tacticDetection";

export interface MoveStep {
    san: string;
    color: "white" | "black";
    moveNumber: number;
    fenBefore: string;
    fenAfter: string;
}

export interface StepDetails {
    evalBefore?: StockfishEvaluation;
    evalAfter?: StockfishEvaluation;
    cpLoss?: number;
    missedTactics?: DetectedTactic[];
    bestMoveSan?: string | null;
}

const DEFAULT_START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

interface UseAnalysisSessionArgs {
    importError: string;
}

export function useAnalysisSession({ importError }: UseAnalysisSessionArgs) {
    const { addEntry } = useDebug();
    const [language, setLanguage] = useState<SupportedLanguage>("en");
    const [apiKey, setApiKey] = useState<string | null>(null);
    const [input, setInput] = useState("");
    const [detectedFormat, setDetectedFormat] = useState<ChessFormat | null>(null);
    const [selectedPersonality, setSelectedPersonality] = useState<Personality>(PERSONALITIES[0]);
    const [orientation, setOrientation] = useState<"white" | "black">("white");
    const [initialFen, setInitialFen] = useState<string>(DEFAULT_START);
    const [steps, setSteps] = useState<MoveStep[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [stockfish, setStockfish] = useState<Stockfish | null>(null);
    const [evaluationVersion, setEvaluationVersion] = useState(0);
    const [stepDetails, setStepDetails] = useState<Record<number, StepDetails>>({});
    const [isCommenting, setIsCommenting] = useState(false);
    const [comments, setComments] = useState<Record<number, string>>({});
    const [chatSession, setChatSession] = useState<LLMChatSession | null>(null);
    const evaluationCache = useRef<Record<string, StockfishEvaluation>>({});

    useEffect(() => {
        const storedKey = getApiKeyInfo().key;
        const storedLang = localStorage.getItem("chess_tutor_language");
        if (storedKey) setApiKey(storedKey);
        if (storedLang) setLanguage(storedLang as SupportedLanguage);
    }, []);

    useEffect(() => {
        const sf = new Stockfish();
        setStockfish(sf);
        return () => sf.terminate();
    }, []);

    useEffect(() => {
        if (!apiKey) return;

        const model = getGenAIModel(apiKey, "gemini-2.5-flash");
        const session = model.startChat({
            history: [
                {
                    role: "user",
                    parts: [{
                        text: `You are ${selectedPersonality.name}. You will analyze a chess game move by move.
Stay in character and maintain your personality throughout the analysis.
Language: ${language.toUpperCase()}.

IMPORTANT:
- You are analyzing moves sequentially
- Each move you analyze builds on the previous context
- If the user navigates backwards or forwards, you will see the move number
- Provide educational commentary in your characteristic style
- Be concise (3-4 sentences per move)
- Focus on what the move accomplishes and what was missed`,
                    }],
                },
                {
                    role: "model",
                    parts: [{
                        text: `Understood. I am ${selectedPersonality.name}, and I will analyze this game move by move in ${language}, maintaining my personality while providing educational insights. I'll keep track of the game's progression and provide context-aware commentary.`,
                    }],
                },
            ],
        });
        setChatSession(session);
    }, [apiKey, language, selectedPersonality]);

    const currentFen = useMemo(() => {
        if (currentIndex === 0) return initialFen;
        return steps[currentIndex - 1]?.fenAfter || initialFen;
    }, [currentIndex, initialFen, steps]);

    const possibleOpenings = useMemo(() => {
        if (currentIndex === 0) return [];
        return lookupPossibleOpenings(buildMoveSequenceFromSteps(steps, currentIndex), 5);
    }, [currentIndex, steps]);

    const ensureEvaluation = useCallback(async (fen: string) => {
        if (!stockfish) return null;
        if (evaluationCache.current[fen]) return evaluationCache.current[fen];
        const result = await stockfish.evaluate(fen, 14);
        evaluationCache.current[fen] = result;
        setEvaluationVersion((value) => value + 1);
        return result;
    }, [stockfish]);

    const loadGameFromPgnOrFen = useCallback((notation: string) => {
        const trimmed = notation.trim();
        const format = detectChessFormat(trimmed);

        if (!trimmed || format === "invalid") {
            setError(importError);
            return;
        }

        try {
            const parsedGame = new Chess();
            const nextSteps: MoveStep[] = [];
            let startFen = DEFAULT_START;

            if (format === "fen") {
                parsedGame.load(trimmed);
                startFen = parsedGame.fen();
            } else {
                parsedGame.loadPgn(trimmed);
                const headers = parsedGame.header();
                if (headers.FEN) {
                    const base = new Chess();
                    base.load(headers.FEN);
                    startFen = base.fen();
                } else {
                    parsedGame.reset();
                    startFen = parsedGame.fen();
                }

                const replay = new Chess();
                replay.load(startFen);
                const history = new Chess();
                history.loadPgn(trimmed);
                history.history({ verbose: true }).forEach((move, index) => {
                    const before = replay.fen();
                    const applied = replay.move({ from: move.from, to: move.to, promotion: move.promotion || "q" });
                    if (!applied) return;

                    nextSteps.push({
                        san: applied.san,
                        color: applied.color === "w" ? "white" : "black",
                        moveNumber: Math.floor(index / 2) + 1,
                        fenBefore: before,
                        fenAfter: replay.fen(),
                    });
                });
            }

            evaluationCache.current = {};
            setEvaluationVersion((value) => value + 1);
            setInitialFen(startFen);
            setSteps(nextSteps);
            setCurrentIndex(0);
            setStepDetails({});
            setComments({});
            setError(null);
            void ensureEvaluation(startFen);
        } catch (error) {
            console.error("Failed to load game", error);
            setError(importError);
        }
    }, [ensureEvaluation, importError]);

    useEffect(() => {
        const pendingAnalysis = localStorage.getItem("chess_tutor_pending_analysis");
        if (!pendingAnalysis) return;

        localStorage.removeItem("chess_tutor_pending_analysis");
        setInput(pendingAnalysis);
        setDetectedFormat(detectChessFormat(pendingAnalysis));

        const timeout = setTimeout(() => {
            loadGameFromPgnOrFen(pendingAnalysis);
        }, 100);

        return () => clearTimeout(timeout);
    }, [loadGameFromPgnOrFen]);

    const handleInputChange = useCallback((value: string) => {
        setInput(value);
        setDetectedFormat(value.trim() ? detectChessFormat(value) : null);
    }, []);

    const handleLoadGame = useCallback(() => {
        const trimmed = input.trim();
        const format = detectChessFormat(trimmed);

        if (!trimmed || format === "invalid") {
            setError(importError);
            return;
        }

        loadGameFromPgnOrFen(trimmed);
    }, [importError, input, loadGameFromPgnOrFen]);

    const handleImportGame = useCallback((pgn: string) => {
        setInput(pgn);
        setDetectedFormat(detectChessFormat(pgn));
        loadGameFromPgnOrFen(pgn);
    }, [loadGameFromPgnOrFen]);

    const handleResetAnalysis = useCallback(() => {
        setInput("");
        setDetectedFormat(null);
        setSteps([]);
        setCurrentIndex(0);
        setStepDetails({});
        setComments({});
        setInitialFen(DEFAULT_START);
        evaluationCache.current = {};
        setEvaluationVersion((value) => value + 1);
        setError(null);
    }, []);

    useEffect(() => {
        if (!stockfish || !currentFen) return;
        void ensureEvaluation(currentFen);

        const currentStep = steps[currentIndex - 1];
        if (currentStep) {
            void ensureEvaluation(currentStep.fenBefore);
        }
    }, [currentFen, currentIndex, ensureEvaluation, steps, stockfish]);

    useEffect(() => {
        if (currentIndex === 0) return;
        const step = steps[currentIndex - 1];
        if (!step) return;

        const evalBefore = evaluationCache.current[step.fenBefore];
        const evalAfter = evaluationCache.current[step.fenAfter];
        if (!evalBefore || !evalAfter) return;

        setStepDetails((previous) => {
            if (previous[currentIndex]?.evalBefore && previous[currentIndex]?.evalAfter) return previous;

            const cpLoss = step.color === "white"
                ? evalBefore.score - evalAfter.score
                : evalAfter.score - evalBefore.score;

            return {
                ...previous,
                [currentIndex]: {
                    evalBefore,
                    evalAfter,
                    cpLoss,
                    missedTactics: detectMissedTactics({
                        fen: step.fenBefore,
                        playerColor: step.color,
                        playerMoveSan: step.san,
                        bestMoveUci: evalBefore.bestMove,
                        cpLoss,
                    }),
                    bestMoveSan: uciToSan(step.fenBefore, evalBefore.bestMove),
                },
            };
        });
    }, [currentIndex, evaluationVersion, steps]);

    const requestMoveCommentary = useCallback(() => {
        if (!chatSession || currentIndex === 0) return;

        const step = steps[currentIndex - 1];
        const details = stepDetails[currentIndex];
        if (!step || !details?.evalBefore || !details?.evalAfter || comments[currentIndex]) return;

        const evalBefore = details.evalBefore;
        const evalAfter = details.evalAfter;

        let cancelled = false;
        setIsCommenting(true);

        const timeout = setTimeout(async () => {
            try {
                const delta = details.cpLoss ?? 0;
                const tactics = (details.missedTactics || [])
                    .filter((tactic) => tactic.tactic_type !== "none")
                    .map((tactic) => `${tactic.tactic_type}${tactic.material_delta ? ` (~${(tactic.material_delta / 100).toFixed(1)} pawns)` : ""}`)
                    .join("; ") || "None";

                const prompt = buildMoveCommentaryPrompt({
                    bestMove: details.bestMoveSan ?? evalBefore.bestMove,
                    color: step.color,
                    cpLoss: delta,
                    evalAfter: evalAfter.score / 100,
                    evalBefore: evalBefore.score / 100,
                    fenAfter: step.fenAfter,
                    fenBefore: step.fenBefore,
                    mateInfo: evalAfter.mate !== null ? `Mate in ${evalAfter.mate}` : "No mate detected",
                    moveNumber: step.moveNumber,
                    openings: possibleOpenings.length > 0 ? possibleOpenings.map((opening) => `${opening.name} (${opening.eco})`).join(", ") : "Unknown/Midgame",
                    san: step.san,
                    tactics,
                });

                const result = await chatSession.sendMessage(prompt);
                const responseText = result.response.text();

                if (!cancelled) {
                    setComments((previous) => ({ ...previous, [currentIndex]: responseText }));
                    addEntry({
                        type: "analysis",
                        action: `Move ${step.moveNumber} Analysis (${step.color})`,
                        prompt,
                        response: responseText,
                        metadata: {
                            moveNumber: step.moveNumber,
                            san: step.san,
                            color: step.color,
                            fenBefore: step.fenBefore,
                            fenAfter: step.fenAfter,
                            cpLoss: delta,
                            personality: selectedPersonality.name,
                            language,
                        },
                    });
                }
            } catch (error) {
                console.error("Commentary failed", error);
            } finally {
                if (!cancelled) setIsCommenting(false);
            }
        }, 400);

        return () => {
            cancelled = true;
            clearTimeout(timeout);
            setIsCommenting(false);
        };
    }, [addEntry, chatSession, comments, currentIndex, language, possibleOpenings, selectedPersonality.name, stepDetails, steps]);

    useEffect(() => requestMoveCommentary(), [requestMoveCommentary]);

    const currentDetails = currentIndex > 0 ? stepDetails[currentIndex] : undefined;
    const tacticSummary = (currentDetails?.missedTactics || []).filter((tactic) => tactic.tactic_type !== "none");

    return {
        apiKey,
        comments,
        currentDetails,
        currentFen,
        currentIndex,
        detectedFormat,
        error,
        formatCpLoss: (cp: number | undefined) => {
            if (cp === undefined) return null;
            const pawns = (cp / 100).toFixed(2);
            return `${cp > 0 ? "+" : ""}${pawns}`;
        },
        formatEval: (evaluation?: StockfishEvaluation) => {
            if (!evaluation) return null;
            if (evaluation.mate !== null) return `#${evaluation.mate}`;
            return `${evaluation.score >= 0 ? "+" : ""}${(evaluation.score / 100).toFixed(2)}`;
        },
        handleImportGame,
        handleInputChange,
        handleLoadGame,
        handleResetAnalysis,
        input,
        isCommenting,
        language,
        orientation,
        possibleOpenings,
        selectedPersonality,
        setCurrentIndex,
        setOrientation,
        setSelectedPersonality,
        steps,
        stockfish,
        tacticSummary,
    };
}

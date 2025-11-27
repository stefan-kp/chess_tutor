"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { Brain, ChevronLeft, ChevronRight, Loader2, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

import Header from "@/components/Header";
import { SupportedLanguage } from "@/lib/i18n/translations";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { Personality, PERSONALITIES } from "@/lib/personalities";
import { Stockfish, StockfishEvaluation } from "@/lib/stockfish";
import { detectChessFormat, ChessFormat } from "@/lib/chessFormatDetector";
import { detectMissedTactics, DetectedTactic, uciToSan } from "@/lib/tacticDetection";
import { lookupPossibleOpenings, buildMoveSequenceFromSteps, OpeningMetadata } from "@/lib/openings";
import { getGenAIModel } from "@/lib/gemini";
import { ChatSession } from "@google/generative-ai";
import ReactMarkdown from "react-markdown";
import { useDebug } from "@/contexts/DebugContext";

interface MoveStep {
    san: string;
    color: "white" | "black";
    moveNumber: number;
    fenBefore: string;
    fenAfter: string;
}

interface StepDetails {
    evalBefore?: StockfishEvaluation;
    evalAfter?: StockfishEvaluation;
    cpLoss?: number;
    missedTactics?: DetectedTactic[];
    bestMoveSan?: string | null;
    comment?: string;
}

const DEFAULT_START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export default function AnalysisPage() {
    const router = useRouter();
    const [language, setLanguage] = useState<SupportedLanguage>("en");
    const [apiKey, setApiKey] = useState<string | null>(null);
    const t = useTranslation(language);
    const { addEntry } = useDebug();

    const [input, setInput] = useState("");
    const [detectedFormat, setDetectedFormat] = useState<ChessFormat | null>(null);
    const [selectedPersonality, setSelectedPersonality] = useState<Personality>(PERSONALITIES[0]);
    const [orientation, setOrientation] = useState<"white" | "black">("white");

    const [initialFen, setInitialFen] = useState<string>(DEFAULT_START);
    const [steps, setSteps] = useState<MoveStep[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0); // 0 = starting position
    const [error, setError] = useState<string | null>(null);

    const [stockfish, setStockfish] = useState<Stockfish | null>(null);
    const evaluationCache = useRef<Record<string, StockfishEvaluation>>({});
    const [evaluationVersion, setEvaluationVersion] = useState(0);
    const [stepDetails, setStepDetails] = useState<Record<number, StepDetails>>({});
    const [isCommenting, setIsCommenting] = useState(false);
    const [comments, setComments] = useState<Record<number, string>>({});
    const [chatSession, setChatSession] = useState<ChatSession | null>(null);

    useEffect(() => {
        const storedKey = localStorage.getItem("gemini_api_key");
        const storedLang = localStorage.getItem("chess_tutor_language");
        if (storedKey) setApiKey(storedKey);
        if (storedLang) setLanguage(storedLang as SupportedLanguage);
    }, []);

    useEffect(() => {
        const sf = new Stockfish();
        setStockfish(sf);
        return () => sf.terminate();
    }, []);

    // Initialize chat session for conversational analysis
    useEffect(() => {
        if (apiKey) {
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
- Focus on what the move accomplishes and what was missed`
                        }]
                    },
                    {
                        role: "model",
                        parts: [{
                            text: `Understood. I am ${selectedPersonality.name}, and I will analyze this game move by move in ${language}, maintaining my personality while providing educational insights. I'll keep track of the game's progression and provide context-aware commentary.`
                        }]
                    }
                ]
            });
            setChatSession(session);
        }
    }, [apiKey, selectedPersonality, language]);

    const currentFen = useMemo(() => {
        if (currentIndex === 0) return initialFen;
        return steps[currentIndex - 1]?.fenAfter || initialFen;
    }, [currentIndex, steps, initialFen]);

    const possibleOpenings = useMemo(() => {
        if (currentIndex === 0) return [];
        const moveSequence = buildMoveSequenceFromSteps(steps, currentIndex);
        return lookupPossibleOpenings(moveSequence, 5);
    }, [currentIndex, steps]);

    const handleInputChange = (value: string) => {
        setInput(value);
        setDetectedFormat(value.trim() ? detectChessFormat(value) : null);
    };

    const ensureEvaluation = useCallback(async (fen: string) => {
        if (!stockfish) return null;
        if (evaluationCache.current[fen]) return evaluationCache.current[fen];
        const result = await stockfish.evaluate(fen, 14);
        evaluationCache.current[fen] = result;
        setEvaluationVersion(v => v + 1);
        return result;
    }, [stockfish]);

    const handleLoadGame = () => {
        const trimmed = input.trim();
        const format = detectChessFormat(trimmed);

        if (!trimmed || format === "invalid") {
            setError(t.analysis.importError);
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
                history.history({ verbose: true }).forEach((move, idx) => {
                    const before = replay.fen();
                    const applied = replay.move({ from: move.from, to: move.to, promotion: move.promotion || "q" });
                    if (applied) {
                        nextSteps.push({
                            san: applied.san,
                            color: applied.color === "w" ? "white" : "black",
                            moveNumber: Math.floor(idx / 2) + 1,
                            fenBefore: before,
                            fenAfter: replay.fen(),
                        });
                    }
                });
            }

            evaluationCache.current = {};
            setEvaluationVersion(v => v + 1);
            setInitialFen(startFen);
            setSteps(nextSteps);
            setCurrentIndex(0);
            setStepDetails({});
            setComments({});
            setError(null);
            ensureEvaluation(startFen);
        } catch (e) {
            console.error("Failed to load game", e);
            setError(t.analysis.importError);
        }
    };

    useEffect(() => {
        if (!stockfish || !currentFen) return;
        ensureEvaluation(currentFen);
        const currentStep = steps[currentIndex - 1];
        if (currentStep) {
            ensureEvaluation(currentStep.fenBefore);
        }
    }, [stockfish, currentFen, steps, currentIndex, ensureEvaluation]);

    useEffect(() => {
        if (currentIndex === 0) return;
        const step = steps[currentIndex - 1];
        if (!step) return;

        const evalBefore = evaluationCache.current[step.fenBefore];
        const evalAfter = evaluationCache.current[step.fenAfter];
        if (!evalBefore || !evalAfter) return;

        setStepDetails(prev => {
            if (prev[currentIndex]?.evalBefore && prev[currentIndex]?.evalAfter) return prev;
            const cpLoss = step.color === "white"
                ? evalBefore.score - evalAfter.score
                : evalAfter.score - evalBefore.score;
            const missedTactics = detectMissedTactics({
                fen: step.fenBefore,
                playerColor: step.color,
                playerMoveSan: step.san,
                bestMoveUci: evalBefore.bestMove,
                cpLoss,
            });
            const bestMoveSan = uciToSan(step.fenBefore, evalBefore.bestMove);
            return {
                ...prev,
                [currentIndex]: {
                    evalBefore,
                    evalAfter,
                    cpLoss,
                    missedTactics,
                    bestMoveSan,
                }
            };
        });
    }, [currentIndex, steps, evaluationVersion]);

    useEffect(() => {
        if (!chatSession) return;
        if (currentIndex === 0) return;
        const step = steps[currentIndex - 1];
        const details = stepDetails[currentIndex];
        if (!step || !details?.evalBefore || !details?.evalAfter) return;
        if (comments[currentIndex]) return;

        let cancelled = false;
        setIsCommenting(true);
        const timeout = setTimeout(async () => {
            try {
                const delta = details.cpLoss ?? 0;
                const evalBefore = details.evalBefore!.score / 100;
                const evalAfter = details.evalAfter!.score / 100;
                const mateInfo = details.evalAfter!.mate !== null ? `Mate in ${details.evalAfter!.mate}` : "No mate detected";
                const tactics = (details.missedTactics || [])
                    .filter(t => t.tactic_type !== "none")
                    .map(t => `${t.tactic_type}${t.material_delta ? ` (~${(t.material_delta / 100).toFixed(1)} pawns)` : ""}`)
                    .join("; ") || "None";

                const prompt = `
Analyze this move:

DATA:
- Move number: ${step.moveNumber}
- Side to move: ${step.color}
- Move played (SAN): ${step.san}
- FEN before move: ${step.fenBefore}
- FEN after move: ${step.fenAfter}
- Evaluation before move: ${evalBefore.toFixed(2)} pawns
- Evaluation after move: ${evalAfter.toFixed(2)} pawns
- Best move suggestion: ${details.bestMoveSan ?? details.evalBefore!.bestMove}
- Evaluation shift (centipawns): ${delta}
- Possible Openings: ${possibleOpenings.length > 0 ? possibleOpenings.map(o => `${o.name} (${o.eco})`).join(', ') : "Unknown/Midgame"}
- Missed tactics: ${tactics}
- Mate hint: ${mateInfo}

INSTRUCTIONS:
- Be concise (3-4 sentences).
- Mention whether the move improved or worsened the position and why.
- Highlight any tactical ideas the player may have missed.
- Refer to the player's side as ${step.color}.
- Keep it educational and stay true to your personality tone.`;

                const result = await chatSession.sendMessage(prompt);
                const responseText = result.response.text();

                if (!cancelled) {
                    setComments(prev => ({ ...prev, [currentIndex]: responseText }));

                    // Track debug entry
                    addEntry({
                        type: 'analysis',
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
                        }
                    });
                }
            } catch (err) {
                console.error("Commentary failed", err);
            } finally {
                if (!cancelled) setIsCommenting(false);
            }
        }, 400);

        return () => {
            cancelled = true;
            clearTimeout(timeout);
            setIsCommenting(false);
        };
    }, [chatSession, currentIndex, stepDetails, steps, comments, possibleOpenings]);

    const formatEval = (evaluation?: StockfishEvaluation) => {
        if (!evaluation) return t.analysis.enginePending;
        if (evaluation.mate !== null) return `#${evaluation.mate}`;
        return `${evaluation.score >= 0 ? "+" : ""}${(evaluation.score / 100).toFixed(2)}`;
    };

    const formatCpLoss = (cp?: number) => {
        if (cp === undefined) return t.analysis.enginePending;
        const pawns = (cp / 100).toFixed(2);
        return `${cp > 0 ? "+" : ""}${pawns}`;
    };

    const currentDetails = currentIndex > 0 ? stepDetails[currentIndex] : undefined;
    const tacticSummary = (currentDetails?.missedTactics || []).filter(t => t.tactic_type !== "none");

    return (
        <div className="flex flex-col min-h-screen bg-gray-100 dark:bg-gray-900">
            <Header language={language} />

            {/* Back Button */}
            <div className="w-full px-4 pt-4">
                <div className="max-w-6xl mx-auto">
                    <button
                        onClick={() => router.push('/')}
                        className="p-2 md:px-4 md:py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 text-sm font-medium transition-colors"
                        aria-label={t.game.backToMenu}
                    >
                        <span className="hidden md:inline">{t.game.backToMenu}</span>
                        <ArrowLeft className="md:hidden" size={20} />
                    </button>
                </div>
            </div>

            <main className="flex-grow w-full flex justify-center px-4 py-8">
                <div className="w-full max-w-6xl space-y-8">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 md:p-8 border border-gray-200 dark:border-gray-700">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <Brain className="text-purple-600" /> {t.analysis.modeTitle}
                                </h1>
                                <p className="text-gray-600 dark:text-gray-300 mt-2">{t.analysis.modeDescription}</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t.analysis.orientation}</label>
                                <select
                                    value={orientation}
                                    onChange={(e) => setOrientation(e.target.value as "white" | "black")}
                                    className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                                >
                                    <option value="white">White</option>
                                    <option value="black">Black</option>
                                </select>
                            </div>
                        </div>

                        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">{t.analysis.pasteLabel}</label>
                                <textarea
                                    value={input}
                                    onChange={(e) => handleInputChange(e.target.value)}
                                    placeholder={t.analysis.pastePlaceholder}
                                    className="w-full p-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600 font-mono text-sm min-h-[180px]"
                                />
                                {detectedFormat && (
                                    <p className="text-xs text-gray-500">Detected: {detectedFormat.toUpperCase()}</p>
                                )}
                                {error && <p className="text-sm text-red-500">{error}</p>}
                                <div className="space-y-2">
                                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t.analysis.chooseCoach}</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {PERSONALITIES.map(p => (
                                            <button
                                                key={p.id}
                                                onClick={() => setSelectedPersonality(p)}
                                                className={`p-3 rounded-lg border flex items-center gap-2 ${selectedPersonality.id === p.id
                                                    ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
                                                    : "border-gray-200 dark:border-gray-700"}`}
                                            >
                                                <span className="text-xl">{p.image}</span>
                                                <span className="text-sm text-left text-gray-800 dark:text-gray-100">{p.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <button
                                    onClick={handleLoadGame}
                                    className="w-full py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 font-semibold shadow-lg"
                                >
                                    {t.analysis.startButton}
                                </button>
                            </div>

                            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 flex flex-col items-center gap-3 border border-gray-200 dark:border-gray-700">
                                <Chessboard
                                    options={{
                                        position: currentFen,
                                        boardOrientation: orientation,
                                        allowDragging: false,
                                        darkSquareStyle: { backgroundColor: '#779954' },
                                        lightSquareStyle: { backgroundColor: '#e9edcc' },
                                        animationDurationInMs: 200,
                                        boardStyle: { borderRadius: "12px", boxShadow: "0 8px 30px rgba(0,0,0,0.12)" }
                                    }}
                                />
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
                                        className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
                                        disabled={currentIndex === 0}
                                        aria-label={t.analysis.previous}
                                    >
                                        <ChevronLeft size={20} />
                                    </button>
                                    <div className="text-sm text-gray-600 dark:text-gray-300">
                                        {t.analysis.step} {currentIndex} / {steps.length}
                                    </div>
                                    <button
                                        onClick={() => setCurrentIndex(i => Math.min(steps.length, i + 1))}
                                        className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
                                        disabled={currentIndex >= steps.length}
                                        aria-label={t.analysis.next}
                                    >
                                        <ChevronRight size={20} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-200 dark:border-gray-700 p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t.analysis.title}</h2>
                                {possibleOpenings.length > 0 && (
                                    <span className="text-sm text-blue-700 dark:text-blue-300">
                                        {t.analysis.opening}: {possibleOpenings.length === 1
                                            ? `${possibleOpenings[0].name} (${possibleOpenings[0].eco})`
                                            : `${possibleOpenings.length} possible openings`
                                        }
                                    </span>
                                )}
                            </div>
                            {currentIndex === 0 ? (
                                <p className="text-gray-600 dark:text-gray-300">{t.analysis.currentPosition}</p>
                            ) : (
                                <div className="space-y-3">
                                    <div className="flex flex-wrap gap-4 text-sm text-gray-700 dark:text-gray-200">
                                        <div>
                                            <div className="font-semibold">{t.analysis.step} {currentIndex}</div>
                                            <div>{steps[currentIndex - 1]?.san}</div>
                                        </div>
                                        <div>
                                            <div className="font-semibold">{t.analysis.evaluation}</div>
                                            <div>{formatEval(currentDetails?.evalAfter)}</div>
                                        </div>
                                        <div>
                                            <div className="font-semibold">{t.analysis.cpLoss}</div>
                                            <div>{formatCpLoss(currentDetails?.cpLoss)}</div>
                                        </div>
                                        <div>
                                            <div className="font-semibold">{t.analysis.bestMove}</div>
                                            <div>{currentDetails?.bestMoveSan || t.analysis.enginePending}</div>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="font-semibold text-gray-800 dark:text-gray-100 mb-2">{t.analysis.missedTactics}</div>
                                        {tacticSummary.length === 0 && (
                                            <p className="text-sm text-gray-600 dark:text-gray-400">{t.analysis.none}</p>
                                        )}
                                        {tacticSummary.length > 0 && (
                                            <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700 dark:text-gray-300">
                                                {tacticSummary.map((tactic, idx) => (
                                                    <li key={`${tactic.move}-${idx}`}>
                                                        {tactic.tactic_type}
                                                        {tactic.material_delta ? ` (~${(tactic.material_delta / 100).toFixed(1)} pawns)` : ""}
                                                        {tactic.affected_squares ? ` on ${tactic.affected_squares.join(", ")}` : ""}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-200 dark:border-gray-700 p-6 space-y-4">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t.analysis.aiAnalysis}</h2>
                            {!apiKey && (
                                <p className="text-sm text-gray-600 dark:text-gray-400">Please add an API key in settings to receive commentary.</p>
                            )}
                            {currentIndex === 0 && (
                                <p className="text-sm text-gray-600 dark:text-gray-400">{t.analysis.currentPosition}</p>
                            )}
                            {currentIndex > 0 && (
                                <div className="min-h-[140px]">
                                    {isCommenting && (
                                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                                            <Loader2 className="animate-spin" size={18} />
                                            <span>{t.analysis.coachPending}</span>
                                        </div>
                                    )}
                                    {!isCommenting && comments[currentIndex] && (
                                        <div className="prose prose-sm dark:prose-invert max-w-none">
                                            <ReactMarkdown>{comments[currentIndex]}</ReactMarkdown>
                                        </div>
                                    )}
                                    {!isCommenting && !comments[currentIndex] && (
                                        <p className="text-sm text-gray-600 dark:text-gray-400">{t.analysis.coachPending}</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

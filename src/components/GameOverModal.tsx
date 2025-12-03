"use client";

import { useState, useEffect, useRef } from "react";
import { getGenAIModel } from "@/lib/gemini";
import { Loader2, X, Trophy, AlertTriangle, RefreshCw } from "lucide-react";
import { StockfishEvaluation } from "@/lib/stockfish";
import { DetectedTactic } from "@/lib/tacticDetection";
import ReactMarkdown from "react-markdown";
import { SupportedLanguage } from "@/lib/i18n/translations";

export interface MoveHistoryItem {
    moveNumber: number;

    // Player's move data
    playerMove: string;
    playerColor: 'white' | 'black';
    fenBeforePlayerMove: string;
    evalBeforePlayerMove: StockfishEvaluation;  // P0 - evaluation before player's move
    fenAfterPlayerMove: string;
    evalAfterPlayerMove: StockfishEvaluation;   // P1 - evaluation after player's move

    // Computer's move data
    computerMove: string;
    fenAfterComputerMove: string;
    evalAfterComputerMove: StockfishEvaluation; // P2 - evaluation after computer's move

    // Opening info (optional)
    opening?: string;

    // Analysis metadata (computed during game-over analysis)
    category?: 'inaccuracy' | 'mistake' | 'blunder';
    cpLoss?: number;

    // Missed tactical opportunities on the engine's best move
    missedTactics?: DetectedTactic[];
    bestMoveSan?: string | null;

    // Legacy fields for backward compatibility (deprecated)
    /** @deprecated Use playerMove instead */
    move?: string;
    /** @deprecated Use evalBeforePlayerMove.score instead */
    evalBefore?: number;
    /** @deprecated Use evalAfterPlayerMove.score instead */
    evalAfter?: number;
    /** @deprecated Use evalBeforePlayerMove.bestMove instead */
    bestMove?: string;
}

interface GameOverModalProps {
    result: string; // "Checkmate", "Draw", etc.
    winner: "White" | "Black" | "Draw";
    history: MoveHistoryItem[];
    apiKey: string | null;
    language: SupportedLanguage;
    onClose: () => void;
    onNewGame: () => void;
    onAnalyze: () => void;
}

export function GameOverModal({ result, winner, history, apiKey, language, onClose, onNewGame, onAnalyze }: GameOverModalProps) {
    const [analysis, setAnalysis] = useState<string>("");
    const [isLoading, setIsLoading] = useState(true);
    const [mistakes, setMistakes] = useState<MoveHistoryItem[]>([]);
    const hasAnalyzedRef = useRef(false);

    useEffect(() => {
        // Prevent duplicate analysis runs
        if (hasAnalyzedRef.current) {
            return;
        }
        hasAnalyzedRef.current = true;

        const analyzeGame = async () => {
            setIsLoading(true);
            try {
                // 1. Identify Mistakes with proper categorization
                // Standard chess analysis thresholds:
                // - Inaccuracy: 50-100 centipawns loss
                // - Mistake: 100-300 centipawns loss
                // - Blunder: 300+ centipawns loss
                const detectedMistakes = history.map(item => {
                    // Use new enhanced data if available, fall back to legacy fields
                    let evalBefore: number;
                    let evalAfter: number;
                    let playerMove: string;
                    let bestMove: string | undefined;
                    let bestMoveSan: string | null | undefined;
                    let missedTactics = item.missedTactics;
                    let cpLoss: number | undefined = item.cpLoss;

                    if (item.evalBeforePlayerMove && item.evalAfterPlayerMove) {
                        // New enhanced format
                        // Convert evaluations to player's perspective
                        const isWhite = item.playerColor === 'white';

                        // P0: Before player's move (from player's perspective)
                        evalBefore = isWhite ? item.evalBeforePlayerMove.score : -item.evalBeforePlayerMove.score;

                        // P1: After player's move (from opponent's perspective, so negate it)
                        evalAfter = isWhite ? -item.evalAfterPlayerMove.score : item.evalAfterPlayerMove.score;

                        playerMove = item.playerMove;
                        bestMove = item.evalBeforePlayerMove.bestMove;
                        bestMoveSan = item.bestMoveSan;
                    } else {
                        // Legacy format (backward compatibility)
                        evalBefore = item.evalBefore || 0;
                        evalAfter = item.evalAfter || 0;
                        playerMove = item.move || '';
                        bestMove = item.bestMove;
                    }

                    // Calculate centipawn loss
                    // Positive delta = position got worse for player
                    const delta = evalBefore - evalAfter;
                    const cpLossValue = cpLoss ?? delta;
                    let category: 'inaccuracy' | 'mistake' | 'blunder' | null = null;

                    if (cpLossValue >= 300) category = 'blunder';
                    else if (cpLossValue >= 100) category = 'mistake';
                    else if (cpLossValue >= 50) category = 'inaccuracy';

                    return {
                        ...item,
                        category,
                        cpLoss: cpLossValue,
                        // Ensure legacy fields are populated for display
                        move: playerMove,
                        evalBefore: evalBefore,
                        evalAfter: evalAfter,
                        bestMove: bestMove,
                        bestMoveSan,
                        missedTactics,
                    };
                }).filter(item => item.category !== null) as MoveHistoryItem[];

                setMistakes(detectedMistakes);

                // 2. LLM Analysis
                if (apiKey) {
                    const model = getGenAIModel(apiKey, "gemini-2.5-flash");

                    const blunders = detectedMistakes.filter(m => m.category === 'blunder');
                    const mistakes = detectedMistakes.filter(m => m.category === 'mistake');
                    const inaccuracies = detectedMistakes.filter(m => m.category === 'inaccuracy');

                    const describeTactics = (tactics?: DetectedTactic[]) => {
                        if (!tactics || tactics.length === 0) return "";
                        const meaningful = tactics.filter(t => t.tactic_type !== 'none');
                        if (meaningful.length === 0) return "";
                        return meaningful.map(t => {
                            const material = t.material_delta ? ` (~${t.material_delta}cp)` : '';
                            const pieces = t.piece_roles ? ` [${t.piece_roles.join(', ')}]` : '';
                            return `${t.tactic_type}${material}${pieces}`;
                        }).join('; ');
                    };

                    const mistakesText = detectedMistakes.map(m => {
                        const tacticSummary = describeTactics(m.missedTactics);
                        const bestMoveDisplay = m.bestMoveSan || m.bestMove || 'N/A';
                        const tacticNote = tacticSummary ? ` Tactics missed: ${tacticSummary}.` : '';
                        return `Move ${m.moveNumber}: ${m.move} (${m.category?.toUpperCase()}: -${Math.round(m.cpLoss || 0)}cp loss, eval ${Math.round(m.evalBefore || 0)} → ${Math.round(m.evalAfter || 0)}). Best was: ${bestMoveDisplay}.${tacticNote}`;
                    }).join("\n");

                    // Build a complete game narrative for better LLM analysis
                    const gameNarrative = history.map((item, idx) => {
                        const moveNum = item.moveNumber || idx + 1;
                        const playerMv = item.playerMove || item.move || '?';
                        const computerMv = item.computerMove || '?';
                        const opening = item.opening ? ` [${item.opening}]` : '';

                        // Evaluation swing
                        let evalInfo = '';
                        if (item.evalBeforePlayerMove && item.evalAfterPlayerMove && item.evalAfterComputerMove) {
                            const isWhite = item.playerColor === 'white';
                            const p0 = isWhite ? item.evalBeforePlayerMove.score : -item.evalBeforePlayerMove.score;
                            const p1 = isWhite ? -item.evalAfterPlayerMove.score : item.evalAfterPlayerMove.score;
                            const p2 = isWhite ? item.evalAfterComputerMove.score : -item.evalAfterComputerMove.score;
                            evalInfo = ` (eval: ${Math.round(p0)} → ${Math.round(p1)} → ${Math.round(p2)})`;
                        }

                        return `${moveNum}. ${playerMv} - ${computerMv}${opening}${evalInfo}`;
                    }).join("\n");

                    const prompt = `
You are a Chess Coach analyzing a completed game.

GAME RESULT: ${result} (${winner === "Draw" ? "Draw" : winner + " Won"})

PLAYER'S PERFORMANCE SUMMARY:
- Blunders (300+ cp loss): ${blunders.length}
- Mistakes (100-300 cp loss): ${mistakes.length}
- Inaccuracies (50-100 cp loss): ${inaccuracies.length}
- Total moves played: ${history.length}

${mistakesText ? `CRITICAL MISTAKES:\n${mistakesText}` : "No significant mistakes detected - excellent play!"}

COMPLETE GAME MOVES:
${gameNarrative}

INSTRUCTIONS:
1. Briefly comment on the game result and overall performance.
2. If there were mistakes, explain WHY the worst ones were bad:
   - What tactical or positional themes were missed?
   - What should the player have looked for? (hanging pieces, forks, pins, back rank threats, etc.)
   - Were there patterns in the mistakes? (time pressure, opening knowledge, endgame technique?)
3. Identify any TURNING POINTS where the evaluation swung significantly.
4. If no mistakes, praise the solid play and suggest specific areas for improvement.
5. Be encouraging but educational. Focus on actionable learning points.
6. Keep your response concise (3-5 paragraphs maximum).
7. Respond in ${language.toUpperCase()}.

Remember: Your goal is to help the player LEARN and IMPROVE, not just list mistakes.

OUTPUT FORMAT:
Plain text paragraph (2-3 sentences).
                    `;

                    const resultGen = await model.generateContent(prompt);
                    setAnalysis(resultGen.response.text());
                } else {
                    setAnalysis("Please provide an API Key to get an AI analysis of your game.");
                }
            } catch (e) {
                console.error("Game Over Analysis failed:", e);
                setAnalysis("Failed to generate analysis.");
            } finally {
                setIsLoading(false);
            }
        };

        analyzeGame();
    }, [history, apiKey, language, result, winner]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden border border-gray-200 dark:border-gray-700 animate-in fade-in zoom-in duration-300">
                {/* Header */}
                <div className={`p-6 text-center ${winner === "White" ? "bg-green-100 dark:bg-green-900/30" : winner === "Black" ? "bg-red-100 dark:bg-red-900/30" : "bg-gray-100 dark:bg-gray-800"}`}>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        {winner === "White" ? "Victory!" : winner === "Black" ? "Defeat" : "Draw"}
                    </h2>
                    <p className="text-lg text-gray-600 dark:text-gray-300">{result}</p>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-8 space-y-4">
                            <Loader2 className="animate-spin text-purple-600" size={48} />
                            <p className="text-gray-500">Analyzing your performance...</p>
                        </div>
                    ) : (
                        <>
                            {/* Mistakes List */}
                            {mistakes.length > 0 && (
                                <div className="space-y-3">
                                    <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                        <AlertTriangle className="text-orange-500" size={20} />
                                        Key Moments / Mistakes
                                    </h3>
                                    <div className="max-h-40 overflow-y-auto space-y-2 pr-2">
                                        {mistakes.map((m, idx) => {
                                            const categoryColors = {
                                                inaccuracy: 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-900/30 text-yellow-700 dark:text-yellow-400',
                                                mistake: 'bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-900/30 text-orange-700 dark:text-orange-400',
                                                blunder: 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30 text-red-700 dark:text-red-400'
                                            };
                                            const categoryColor = categoryColors[m.category || 'inaccuracy'];

                                            return (
                                                <div key={idx} className={`p-3 border rounded-lg text-sm ${categoryColor}`}>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-gray-900 dark:text-white">Move {m.moveNumber}: {m.move}</span>
                                                        <span className="px-2 py-0.5 rounded text-xs font-semibold uppercase bg-white/50 dark:bg-black/20">
                                                            {m.category}
                                                        </span>
                                                    </div>
                                                    <div className="mt-1 text-xs">
                                                        <span className="font-medium">Loss: -{m.cpLoss}cp</span>
                                                        <span className="mx-2 text-gray-400">|</span>
                                                        <span>Eval: {m.evalBefore} → {m.evalAfter}</span>
                                                    </div>
                                                    {m.bestMove && (
                                                        <div className="text-gray-600 dark:text-gray-400 mt-1 text-xs">
                                                            Best: <span className="font-mono">{m.bestMove}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* AI Analysis */}
                            <div>
                                <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                                    <Trophy size={20} className="text-yellow-500" />
                                    Coach's Feedback
                                </h3>
                                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-gray-800 dark:text-gray-200 leading-relaxed prose prose-sm dark:prose-invert max-w-none">
                                    <ReactMarkdown
                                        components={{
                                            // Customize markdown rendering for better styling
                                            p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                                            strong: ({ children }) => <strong className="font-bold text-gray-900 dark:text-white">{children}</strong>,
                                            em: ({ children }) => <em className="italic">{children}</em>,
                                            ul: ({ children }) => <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>,
                                            ol: ({ children }) => <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>,
                                            li: ({ children }) => <li className="ml-2">{children}</li>,
                                            h1: ({ children }) => <h1 className="text-xl font-bold mb-2 mt-4 first:mt-0">{children}</h1>,
                                            h2: ({ children }) => <h2 className="text-lg font-bold mb-2 mt-3 first:mt-0">{children}</h2>,
                                            h3: ({ children }) => <h3 className="text-base font-bold mb-2 mt-2 first:mt-0">{children}</h3>,
                                        }}
                                    >
                                        {analysis}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3 bg-gray-50 dark:bg-gray-900">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
                    >
                        Close
                    </button>
                    <button
                        onClick={onAnalyze}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 shadow-sm"
                    >
                        <Trophy size={16} />
                        Analyze Game
                    </button>
                    <button
                        onClick={onNewGame}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 shadow-sm"
                    >
                        <RefreshCw size={16} />
                        Play Again
                    </button>
                </div>
            </div>
        </div>
    );
}

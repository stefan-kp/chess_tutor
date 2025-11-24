"use client";

import { useState, useEffect } from "react";
import { getGenAIModel } from "@/lib/gemini";
import { Loader2, X, Trophy, AlertTriangle, RefreshCw } from "lucide-react";

export interface MoveHistoryItem {
    moveNumber: number;
    move: string;
    evalBefore: number; // cp
    evalAfter: number; // cp
    bestMove?: string;
    category?: 'inaccuracy' | 'mistake' | 'blunder';
    cpLoss?: number;
}

interface GameOverModalProps {
    result: string; // "Checkmate", "Draw", etc.
    winner: "White" | "Black" | "Draw";
    history: MoveHistoryItem[];
    apiKey: string | null;
    language: 'en' | 'de' | 'fr' | 'it';
    onClose: () => void;
    onNewGame: () => void;
}

export function GameOverModal({ result, winner, history, apiKey, language, onClose, onNewGame }: GameOverModalProps) {
    const [analysis, setAnalysis] = useState<string>("");
    const [isLoading, setIsLoading] = useState(true);
    const [mistakes, setMistakes] = useState<MoveHistoryItem[]>([]);

    useEffect(() => {
        const analyzeGame = async () => {
            setIsLoading(true);
            try {
                // 1. Identify Mistakes with proper categorization
                // Standard chess analysis thresholds:
                // - Inaccuracy: 50-100 centipawns loss
                // - Mistake: 100-300 centipawns loss
                // - Blunder: 300+ centipawns loss
                const detectedMistakes = history.map(item => {
                    const delta = item.evalBefore - item.evalAfter; // Positive = eval got worse for player
                    let category: 'inaccuracy' | 'mistake' | 'blunder' | null = null;

                    if (delta >= 300) category = 'blunder';
                    else if (delta >= 100) category = 'mistake';
                    else if (delta >= 50) category = 'inaccuracy';

                    return { ...item, category, cpLoss: delta };
                }).filter(item => item.category !== null) as MoveHistoryItem[];

                setMistakes(detectedMistakes);

                // 2. LLM Analysis
                if (apiKey) {
                    const model = getGenAIModel(apiKey, "gemini-2.5-flash");

                    const blunders = detectedMistakes.filter(m => m.category === 'blunder');
                    const mistakes = detectedMistakes.filter(m => m.category === 'mistake');
                    const inaccuracies = detectedMistakes.filter(m => m.category === 'inaccuracy');

                    const mistakesText = detectedMistakes.map(m =>
                        `Move ${m.moveNumber}: ${m.move} (${m.category?.toUpperCase()}: -${m.cpLoss}cp, eval ${m.evalBefore} → ${m.evalAfter}). Best: ${m.bestMove}`
                    ).join("\n");

                    const prompt = `
You are a Chess Coach. The game is over.
Result: ${result} (${winner === "Draw" ? "Draw" : winner + " Won"}).

Player's Performance Summary:
- Blunders (300+ cp loss): ${blunders.length}
- Mistakes (100-300 cp loss): ${mistakes.length}
- Inaccuracies (50-100 cp loss): ${inaccuracies.length}

${mistakesText ? `Detailed Mistakes:\n${mistakesText}` : "No significant mistakes detected - excellent play!"}

INSTRUCTIONS:
1. Briefly comment on the game result.
2. If there were mistakes, explain WHY the worst ones were bad and what the player should have looked for (tactics, hanging pieces, positional errors, etc.).
3. If no mistakes, praise the solid play and suggest areas for improvement.
4. Be encouraging but educational. Focus on learning.
5. Respond in ${language.toUpperCase()}.

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
                                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-gray-800 dark:text-gray-200 leading-relaxed">
                                    {analysis}
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

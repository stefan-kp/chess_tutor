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
                // 1. Identify Mistakes (Blunders)
                // A blunder is roughly a drop of > 100cp (1 pawn) or missing a mate
                const detectedMistakes = history.filter(item => {
                    const delta = item.evalAfter - item.evalBefore;
                    // Note: eval is from White's perspective.
                    // If White moves, eval should ideally go up or stay same.
                    // If eval drops significantly, it's a mistake.
                    return delta <= -100;
                });
                setMistakes(detectedMistakes);

                // 2. LLM Analysis
                if (apiKey) {
                    const model = getGenAIModel(apiKey, "gemini-2.5-flash");

                    const mistakesText = detectedMistakes.map(m =>
                        `Move ${m.moveNumber}: Played ${m.move} (Eval dropped from ${m.evalBefore} to ${m.evalAfter}). Best move was likely ${m.bestMove}.`
                    ).join("\n");

                    const prompt = `
You are a Chess Coach. The game is over.
Result: ${result} (${winner === "Draw" ? "Draw" : winner + " Won"}).

Here are the player's (White) key mistakes (Blunders):
${mistakesText || "No major blunders detected."}

INSTRUCTIONS:
1. Briefly comment on the game result.
2. If there were mistakes, explain WHY they were bad and what the player should have looked for (tactics, hanging pieces, etc.).
3. If no mistakes, praise the solid play.
4. Be encouraging but educational.
5. Respond in ${language.toUpperCase()}.

OUTPUT FORMAT:
Plain text paragraph.
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
                                        {mistakes.map((m, idx) => (
                                            <div key={idx} className="p-3 bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/30 rounded-lg text-sm">
                                                <span className="font-bold text-gray-900 dark:text-white">Move {m.moveNumber}: {m.move}</span>
                                                <span className="mx-2 text-gray-400">|</span>
                                                <span className="text-red-600 dark:text-red-400">Eval: {m.evalBefore} ➝ {m.evalAfter}</span>
                                                {m.bestMove && (
                                                    <div className="text-gray-500 dark:text-gray-400 mt-1">
                                                        Best was likely: <span className="font-mono">{m.bestMove}</span>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
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

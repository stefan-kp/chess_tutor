"use client";

import { useState, useEffect } from "react";
import { Stockfish, StockfishEvaluation } from "@/lib/stockfish";
import { OpeningMetadata, lookupOpening } from "@/lib/openings";
import { getGenAIModel } from "@/lib/gemini";
import { Loader2, X, Brain, Trophy, AlertTriangle } from "lucide-react";
import { SupportedLanguage } from "@/lib/i18n/translations";

interface GameAnalysisModalProps {
    fen: string;
    stockfish: Stockfish | null;
    apiKey: string | null;
    language: SupportedLanguage;
    onClose: () => void;
}

export function GameAnalysisModal({ fen, stockfish, apiKey, language, onClose }: GameAnalysisModalProps) {
    const [evaluation, setEvaluation] = useState<StockfishEvaluation | null>(null);
    const [opening, setOpening] = useState<OpeningMetadata | null>(null);
    const [summary, setSummary] = useState<string>("");
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const analyze = async () => {
            setIsLoading(true);
            try {
                // 1. Stockfish Evaluation
                let evalResult: StockfishEvaluation | null = null;
                if (stockfish) {
                    evalResult = await stockfish.evaluate(fen, 15); // Quick depth
                    setEvaluation(evalResult);
                }

                // 2. Opening Lookup
                const openingData = lookupOpening(fen);
                setOpening(openingData);

                // 3. LLM Summary
                if (apiKey && evalResult) {
                    const model = getGenAIModel(apiKey, "gemini-2.5-flash");
                    const evalInPawns = (evalResult.score / 100).toFixed(2);
                    const prompt = `
You are a Chess Grandmaster Analyst.
Analyze this position for the user.

DATA:
- FEN: ${fen}
- Evaluation: ${evalInPawns} pawns (${evalResult.score} centipawns)
  Note: Positive = White advantage, Negative = Black advantage
  100 centipawns = 1 pawn
- Mate in: ${evalResult.mate ?? "N/A"}
- Best Move: ${evalResult.bestMove}
- Opening: ${openingData ? `${openingData.name} (${openingData.eco})` : "Unknown/Midgame"}

INSTRUCTIONS:
1. Summarize who is winning and why (based on score). Use the pawn value (e.g., "White is up 2.5 pawns" not "250 centipawns").
2. Identify the key strategic factors (space, piece activity, king safety).
3. Mention the opening if relevant.
4. Keep it concise (max 3-4 sentences).
5. Respond in ${language.toUpperCase()}.

OUTPUT FORMAT:
Plain text paragraph.
                    `;

                    const result = await model.generateContent(prompt);
                    setSummary(result.response.text());
                } else if (!apiKey) {
                    setSummary("Please provide an API Key to get an AI summary.");
                }
            } catch (e) {
                console.error("Analysis failed:", e);
                setSummary("Failed to generate analysis.");
            } finally {
                setIsLoading(false);
            }
        };

        analyze();
    }, [fen, stockfish, apiKey, language]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-200 dark:border-gray-700 animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
                    <h2 className="text-lg font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                        <Brain className="text-purple-600" />
                        Game Analysis
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-8 space-y-4">
                            <Loader2 className="animate-spin text-purple-600" size={48} />
                            <p className="text-gray-500">Analyzing position...</p>
                        </div>
                    ) : (
                        <>
                            {/* Evaluation Score */}
                            <div className="flex items-center justify-between p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Evaluation</p>
                                    <p className={`text-2xl font-bold ${(evaluation?.score || 0) > 0 ? "text-green-600" : (evaluation?.score || 0) < 0 ? "text-red-600" : "text-gray-600"
                                        }`}>
                                        {evaluation?.mate
                                            ? `Mate in ${evaluation.mate}`
                                            : `${(evaluation?.score || 0) > 0 ? "+" : ""}${(evaluation?.score || 0) / 100}`}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Best Move</p>
                                    <p className="text-xl font-mono font-bold text-gray-900 dark:text-white">
                                        {evaluation?.bestMove}
                                    </p>
                                </div>
                            </div>

                            {/* Opening Info */}
                            {opening && (
                                <div className="p-4 border border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800 rounded-lg">
                                    <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-1">Opening Identified</h3>
                                    <p className="text-blue-900 dark:text-blue-100">{opening.name} ({opening.eco})</p>
                                </div>
                            )}

                            {/* AI Summary */}
                            <div>
                                <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                                    <Trophy size={16} className="text-yellow-500" />
                                    Coach's Summary
                                </h3>
                                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-gray-800 dark:text-gray-200 leading-relaxed">
                                    {summary}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

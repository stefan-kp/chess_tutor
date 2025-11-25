"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Settings, ChevronDown, ChevronUp } from "lucide-react";
import { Personality, PERSONALITIES } from "@/lib/personalities";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { SupportedLanguage } from "@/lib/i18n/translations";
import { detectChessFormat, ChessFormat } from "@/lib/chessFormatDetector";
import Header from "./Header";

interface StartScreenProps {
    onStartGame: (options: {
        personality: Personality;
        color: 'white' | 'black' | 'random';
        fen?: string;
        pgn?: string;
    }) => void;
    onResumeGame: () => void;
    hasSavedGame: boolean;
}

export default function StartScreen({ onStartGame, onResumeGame, hasSavedGame }: StartScreenProps) {
    const router = useRouter();
    const [language, setLanguage] = useState<SupportedLanguage>('en');
    const [showNewGameOptions, setShowNewGameOptions] = useState(false);
    const [importInput, setImportInput] = useState("");
    const [detectedFormat, setDetectedFormat] = useState<ChessFormat | null>(null);
    const [colorSelection, setColorSelection] = useState<'white' | 'black' | 'random'>('white');
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const storedLang = localStorage.getItem("chess_tutor_language");
        if (storedLang) setLanguage(storedLang as SupportedLanguage);
        setMounted(true);
    }, []);

    const t = useTranslation(language);

    const handleImportChange = (value: string) => {
        setImportInput(value);
        const format = detectChessFormat(value);
        setDetectedFormat(format);
    };

    const handleNewGame = (personality: Personality) => {
        const trimmedInput = importInput.trim();
        const format = trimmedInput ? detectChessFormat(trimmedInput) : null;

        onStartGame({
            personality,
            color: colorSelection,
            fen: format === 'fen' ? trimmedInput : undefined,
            pgn: format === 'pgn' ? trimmedInput : undefined
        });
    };

    if (!mounted) return null;

    return (
        <>
            <Header language={language} />
            <div className="flex-grow bg-gray-100 dark:bg-gray-900 p-4 flex flex-col items-center justify-center relative">
                <div className="absolute top-4 right-4 md:top-8 md:right-8">
                    <button
                        onClick={() => router.push("/settings")}
                        className="p-3 bg-white dark:bg-gray-800 rounded-full shadow-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all text-gray-700 dark:text-gray-200"
                        title={t.start.settings}
                    >
                        <Settings size={24} />
                    </button>
                </div>

                <h1 className="text-5xl font-bold mb-12 text-gray-800 dark:text-white tracking-tight">
                    {t.start.title}
                </h1>

                <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl max-w-3xl w-full space-y-8">
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-4">
                            {t.start.startGame}
                        </h2>

                        <div className="space-y-4">
                            {/* Resume Option */}
                            {hasSavedGame && !showNewGameOptions && (
                                <div className="space-y-4">
                                    <button
                                        onClick={onResumeGame}
                                        className="w-full py-5 bg-green-600 text-white rounded-xl hover:bg-green-700 font-bold text-xl shadow-lg transition-transform transform hover:scale-[1.02] flex items-center justify-center gap-3"
                                    >
                                        <span>▶</span> {t.start.resumeGame}
                                    </button>
                                    <div className="relative flex py-2 items-center">
                                        <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
                                        <span className="flex-shrink-0 mx-4 text-gray-400 text-sm">OR</span>
                                        <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
                                    </div>
                                    <button
                                        onClick={() => setShowNewGameOptions(true)}
                                        className="w-full py-3 bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 font-semibold transition-colors"
                                    >
                                        {t.start.startNewGame}
                                    </button>
                                </div>
                            )}

                            {/* New Game Options */}
                            {(!hasSavedGame || showNewGameOptions) && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-300">
                                    {/* Color Selection */}
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
                                            {t.start.colorSelection}
                                        </label>
                                        <div className="grid grid-cols-3 gap-4">
                                            <button
                                                onClick={() => setColorSelection('white')}
                                                className={`py-4 px-4 rounded-xl border-2 text-sm font-bold transition-all flex flex-col items-center gap-2 ${colorSelection === 'white'
                                                    ? 'bg-blue-50 border-blue-600 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                                                    : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500'
                                                    }`}
                                            >
                                                <span className="text-3xl">♔</span> {t.start.playAsWhite}
                                            </button>
                                            <button
                                                onClick={() => setColorSelection('black')}
                                                className={`py-4 px-4 rounded-xl border-2 text-sm font-bold transition-all flex flex-col items-center gap-2 ${colorSelection === 'black'
                                                    ? 'bg-blue-50 border-blue-600 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                                                    : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500'
                                                    }`}
                                            >
                                                <span className="text-3xl">♚</span> {t.start.playAsBlack}
                                            </button>
                                            <button
                                                onClick={() => setColorSelection('random')}
                                                className={`py-4 px-4 rounded-xl border-2 text-sm font-bold transition-all flex flex-col items-center gap-2 ${colorSelection === 'random'
                                                    ? 'bg-blue-50 border-blue-600 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                                                    : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500'
                                                    }`}
                                            >
                                                <span className="text-3xl">🎲</span> {t.start.randomColor}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Personality Grid */}
                                    <div>
                                        <p className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
                                            {t.start.chooseCoach}
                                        </p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {PERSONALITIES.map(p => (
                                                <button
                                                    key={p.id}
                                                    onClick={() => handleNewGame(p)}
                                                    className="group relative bg-gray-50 dark:bg-gray-700 p-5 rounded-xl hover:bg-white dark:hover:bg-gray-600 transition-all border-2 border-transparent hover:border-blue-500 dark:hover:border-blue-400 shadow-sm hover:shadow-md text-left flex items-start gap-4"
                                                >
                                                    <div className="text-4xl shrink-0 group-hover:scale-110 transition-transform">{p.image}</div>
                                                    <div>
                                                        <h3 className="font-bold text-gray-900 dark:text-white text-lg">{p.name}</h3>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{p.description}</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Advanced Options (Accordion) */}
                                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                                        <button
                                            onClick={() => setShowAdvanced(!showAdvanced)}
                                            className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
                                        >
                                            {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                            Advanced Options
                                        </button>

                                        {showAdvanced && (
                                            <div className="mt-4 animate-in fade-in slide-in-from-top-2 space-y-2">
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    {t.start.importPosition}
                                                </label>
                                                <textarea
                                                    placeholder={t.start.importPositionPlaceholder}
                                                    value={importInput}
                                                    onChange={(e) => handleImportChange(e.target.value)}
                                                    className="w-full p-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600 font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-vertical min-h-[80px]"
                                                    rows={4}
                                                />

                                                {/* Format Detection Indicator */}
                                                {importInput && (
                                                    <div className="text-xs">
                                                        {detectedFormat === 'fen' && (
                                                            <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                </svg>
                                                                {t.start.formatDetected} {t.start.formatFen}
                                                            </span>
                                                        )}
                                                        {detectedFormat === 'pgn' && (
                                                            <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                </svg>
                                                                {t.start.formatDetected} {t.start.formatPgn}
                                                            </span>
                                                        )}
                                                        {detectedFormat === 'invalid' && (
                                                            <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                                </svg>
                                                                {t.start.formatInvalid}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {hasSavedGame && (
                                        <button
                                            onClick={() => setShowNewGameOptions(false)}
                                            className="w-full py-3 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                                        >
                                            {t.common.cancel}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

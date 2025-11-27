"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Settings, ChevronDown, ChevronUp, Brain, Trash2 } from "lucide-react";
import { Personality, PERSONALITIES } from "@/lib/personalities";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { SupportedLanguage } from "@/lib/i18n/translations";
import { detectChessFormat, ChessFormat } from "@/lib/chessFormatDetector";
import Header from "./Header";
import { SavedGame } from "@/lib/savedGames";
import { Chessboard } from "react-chessboard";

interface StartScreenProps {
    onStartGame: (options: {
        personality: Personality;
        color: 'white' | 'black' | 'random';
        fen?: string;
        pgn?: string;
    }) => void;
    onResumeGame: (game: SavedGame) => void;
    savedGames: SavedGame[];
    onDeleteSavedGame: (id: string) => void;
}

export default function StartScreen({ onStartGame, onResumeGame, savedGames, onDeleteSavedGame }: StartScreenProps) {
    const router = useRouter();
    const [language, setLanguage] = useState<SupportedLanguage>('en');
    const [showNewGameOptions, setShowNewGameOptions] = useState(false);
    const [importInput, setImportInput] = useState("");
    const [detectedFormat, setDetectedFormat] = useState<ChessFormat | null>(null);
    const [colorSelection, setColorSelection] = useState<'white' | 'black' | 'random'>('white');
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [mounted, setMounted] = useState(false);
    const hasSavedGames = savedGames.length > 0;

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

    const sortedSavedGames = useMemo(
        () => [...savedGames].sort((a, b) => b.updatedAt - a.updatedAt),
        [savedGames]
    );

    const formatEvaluation = (game: SavedGame) => {
        if (!game.evaluation) return t.start.noEvaluation;

        if (game.evaluation.mate !== null && game.evaluation.mate !== undefined) {
            const movesToMate = Math.abs(game.evaluation.mate);
            const side = game.evaluation.mate > 0 ? t.game.white : t.game.black;
            return `${side} #${movesToMate}`;
        }

        if (typeof game.evaluation.score === 'number') {
            const score = game.playerColor === 'black'
                ? -(game.evaluation.score || 0)
                : (game.evaluation.score || 0);
            const display = (score / 100).toFixed(2);
            return `${score >= 0 ? '+' : ''}${display}`;
        }

        return t.start.noEvaluation;
    };

    useEffect(() => {
        if (!hasSavedGames) {
            setShowNewGameOptions(true);
        }
    }, [hasSavedGames]);

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

                        <div className="space-y-6">
                            {hasSavedGames && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                            {t.start.savedGamesTitle}
                                        </h3>
                                        <button
                                            onClick={() => setShowNewGameOptions(true)}
                                            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                                        >
                                            {t.start.startNewGame}
                                        </button>
                                    </div>

                                    {sortedSavedGames.length === 0 && (
                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                            {t.start.savedGamesEmpty}
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {sortedSavedGames.map(game => (
                                            <div
                                                key={game.id}
                                                onClick={() => onResumeGame(game)}
                                                className="group relative bg-gray-50 dark:bg-gray-700 p-4 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-300 shadow-sm hover:shadow-md transition-all cursor-pointer"
                                            >
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onDeleteSavedGame(game.id);
                                                    }}
                                                    aria-label={t.start.deleteGame}
                                                    className="absolute top-2 right-2 p-2 rounded-full bg-white dark:bg-gray-800 text-gray-500 hover:text-red-600 shadow opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <Trash2 size={16} />
                                                </button>

                                                <div className="bg-[#779954] p-[2px] rounded-sm">
                                                    <Chessboard
                                                        options={{
                                                            position: game.fen,
                                                            boardOrientation: game.playerColor,
                                                            allowDragging: false,
                                                            darkSquareStyle: { backgroundColor: '#779954' },
                                                            lightSquareStyle: { backgroundColor: '#e9edcc' },
                                                            animationDurationInMs: 150,
                                                            boardStyle: { width: '100%', aspectRatio: '1' }
                                                        }}
                                                    />
                                                </div>

                                                <div className="mt-3 flex items-start justify-between gap-2 text-sm">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-lg">{game.selectedPersonality.image}</span>
                                                            <div>
                                                                <div className="font-semibold text-gray-900 dark:text-white">{game.selectedPersonality.name}</div>
                                                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                                                    {t.start.opponentLabel}: {game.playerColor === 'white' ? t.game.black : t.game.white}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-xs uppercase text-gray-500 dark:text-gray-400">{t.start.evaluationLabel}</div>
                                                        <div className="font-semibold text-gray-900 dark:text-white">{formatEvaluation(game)}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* New Game Options */}
                            {(!hasSavedGames || showNewGameOptions) && (
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

                                    {hasSavedGames && (
                                        <button
                                            onClick={() => setShowNewGameOptions(false)}
                                            className="w-full py-3 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                                        >
                                            {t.common.cancel}
                                        </button>
                                    )}
                                </div>

                                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                                    <p className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
                                        {t.start.analyzeGame}
                                    </p>
                                    <button
                                        onClick={() => router.push("/analysis")}
                                        className="w-full py-4 px-4 bg-purple-600 text-white rounded-xl hover:bg-purple-700 font-semibold shadow-lg transition-transform transform hover:scale-[1.02] flex items-center justify-center gap-2"
                                    >
                                        <Brain size={18} />
                                        {t.start.analyzeGame}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

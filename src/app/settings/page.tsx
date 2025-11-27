"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { SupportedLanguage } from "@/lib/i18n/translations";
import { ArrowLeft, Save } from "lucide-react";

export default function SettingsPage() {
    const router = useRouter();
    const [apiKey, setApiKey] = useState("");
    const [language, setLanguage] = useState<SupportedLanguage>('en');
    const [chesscomUsername, setChesscomUsername] = useState("");
    const [lichessUsername, setLichessUsername] = useState("");
    const [mounted, setMounted] = useState(false);

    // Load settings on mount
    useEffect(() => {
        const storedKey = localStorage.getItem("gemini_api_key");
        const storedLang = localStorage.getItem("chess_tutor_language");
        const storedChesscomUsername = localStorage.getItem("chesscom_username");
        const storedLichessUsername = localStorage.getItem("lichess_username");

        if (storedKey) setApiKey(storedKey);
        if (storedLang) setLanguage(storedLang as SupportedLanguage);
        if (storedChesscomUsername) setChesscomUsername(storedChesscomUsername);
        if (storedLichessUsername) setLichessUsername(storedLichessUsername);

        setMounted(true);
    }, []);

    const t = useTranslation(language);

    const handleSave = () => {
        if (apiKey.trim()) {
            localStorage.setItem("gemini_api_key", apiKey.trim());
        } else {
            localStorage.removeItem("gemini_api_key");
        }

        localStorage.setItem("chess_tutor_language", language);

        // Save online platform usernames
        if (chesscomUsername.trim()) {
            localStorage.setItem("chesscom_username", chesscomUsername.trim());
        } else {
            localStorage.removeItem("chesscom_username");
        }

        if (lichessUsername.trim()) {
            localStorage.setItem("lichess_username", lichessUsername.trim());
        } else {
            localStorage.removeItem("lichess_username");
        }

        // Go back to home
        router.push("/");
    };

    if (!mounted) return null;

    return (
        <>
            <Header language={language} />
            <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
                <div className="max-w-2xl mx-auto pt-8">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 space-y-8">
                        <div className="flex items-center gap-4 border-b border-gray-200 dark:border-gray-700 pb-6">
                            <button
                                onClick={() => router.push("/")}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                            >
                                <ArrowLeft size={24} className="text-gray-600 dark:text-gray-300" />
                            </button>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                {t.start.settings}
                            </h1>
                        </div>

                        <div className="space-y-6">
                            {/* Language Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    {t.start.language}
                                </label>
                                <div className="flex gap-3">
                                    {(['en', 'de', 'fr', 'it'] as SupportedLanguage[]).map((lang) => (
                                        <button
                                            key={lang}
                                            onClick={() => setLanguage(lang)}
                                            className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${language === lang
                                                    ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                                                    : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200'
                                                }`}
                                        >
                                            {lang.toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* API Key Input */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    {t.start.apiKey}
                                </label>
                                <div className="space-y-2">
                                    <input
                                        type="password"
                                        value={apiKey}
                                        onChange={(e) => setApiKey(e.target.value)}
                                        placeholder={t.start.apiKeyPlaceholder}
                                        className="w-full p-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    />
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {t.start.apiKeyRequired} <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{t.start.getApiKey}</a>
                                    </p>
                                </div>
                            </div>

                            {/* Online Platform Usernames */}
                            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                    Online Platform Integration
                                </h2>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                    Save your usernames to quickly import games from Chess.com and Lichess in the Analysis page.
                                </p>

                                <div className="space-y-4">
                                    {/* Chess.com Username */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Chess.com Username
                                        </label>
                                        <input
                                            type="text"
                                            value={chesscomUsername}
                                            onChange={(e) => setChesscomUsername(e.target.value)}
                                            placeholder="Enter your Chess.com username"
                                            className="w-full p-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none transition-all"
                                        />
                                    </div>

                                    {/* Lichess Username */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Lichess Username
                                        </label>
                                        <input
                                            type="text"
                                            value={lichessUsername}
                                            onChange={(e) => setLichessUsername(e.target.value)}
                                            placeholder="Enter your Lichess username"
                                            className="w-full p-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                            <button
                                onClick={handleSave}
                                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-md transition-transform transform hover:scale-[1.02]"
                            >
                                <Save size={20} />
                                {t.common?.save || "Save Settings"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

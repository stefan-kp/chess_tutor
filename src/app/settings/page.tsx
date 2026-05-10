"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { SupportedLanguage } from "@/lib/i18n/translations";
import { ArrowLeft, Save, Trash2, RefreshCw, Loader2 } from "lucide-react";
import { useHasHydrated } from "@/lib/useHasHydrated";
import { clearWikipediaLocalStorage } from "@/lib/openingTrainer/wikipediaService";
import { useEffect } from "react";

export default function SettingsPage() {
    const router = useRouter();
    const [apiKey, setApiKey] = useState(() => typeof window === "undefined" ? "" : localStorage.getItem("gemini_api_key") || "");
    const [language, setLanguage] = useState<SupportedLanguage>(() => {
        if (typeof window === "undefined") {
            return "en";
        }

        return (localStorage.getItem("chess_tutor_language") as SupportedLanguage) || "en";
    });
    const [chesscomUsername, setChesscomUsername] = useState(() => typeof window === "undefined" ? "" : localStorage.getItem("chesscom_username") || "");
    const [lichessUsername, setLichessUsername] = useState(() => typeof window === "undefined" ? "" : localStorage.getItem("lichess_username") || "");
    const [consentGiven, setConsentGiven] = useState(false);
    const [showConsentError, setShowConsentError] = useState(false);
    const [isRebuilding, setIsRebuilding] = useState(false);
    const hasHydrated = useHasHydrated();

    const t = useTranslation(language);

    // Check if rebuild is in progress on mount
    useEffect(() => {
        if (hasHydrated) {
            checkRebuildStatus();
        }
    }, [hasHydrated]);

    const checkRebuildStatus = async () => {
        try {
            const response = await fetch("/api/v1/cache/wikipedia");
            const data = await response.json();
            setIsRebuilding(data.isRebuilding);
        } catch (error) {
            console.error("Failed to check rebuild status:", error);
        }
    };

    // Poll if rebuilding
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isRebuilding) {
            interval = setInterval(checkRebuildStatus, 5000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isRebuilding]);

    const handleSave = () => {
        // Check consent if API key is being set
        if (apiKey.trim() && !consentGiven) {
            setShowConsentError(true);
            return;
        }

        setShowConsentError(false);

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

    const handleClearAllData = async () => {
        if (window.confirm(t.common.clearAllDataConfirm)) {
            try {
                // Clear server-side cache
                await fetch("/api/v1/cache/wikipedia", {
                    method: "DELETE",
                });
            } catch (error) {
                console.error("Failed to clear server-side cache during full wipe:", error);
            }
            
            localStorage.clear();
            router.push("/onboarding");
        }
    };

    const handleClearWikipediaCache = async () => {
        if (window.confirm(t.common.clearWikipediaCacheConfirm)) {
            try {
                const response = await fetch("/api/v1/cache/wikipedia", {
                    method: "DELETE",
                });
                const data = await response.json();
                if (data.success) {
                    clearWikipediaLocalStorage();
                    alert(t.common.clearWikipediaCacheSuccess);
                } else {
                    alert(t.common.error + ": " + data.error);
                }
            } catch (error) {
                alert(t.common.error);
            }
        }
    };

    const handleRebuildWikipediaCache = async () => {
        if (window.confirm(t.common.rebuildWikipediaCacheConfirm)) {
            try {
                const response = await fetch("/api/v1/cache/wikipedia", {
                    method: "POST",
                });
                const data = await response.json();
                if (data.success) {
                    setIsRebuilding(true);
                    alert(t.common.rebuildWikipediaCacheStarted);
                } else {
                    alert(t.common.error + ": " + data.error);
                }
            } catch (error) {
                alert(t.common.error);
            }
        }
    };

    if (!hasHydrated) return null;

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
                                    {(['en', 'de', 'fr', 'it', 'pl'] as SupportedLanguage[]).map((lang) => (
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
                                <div className="space-y-3">
                                    <input
                                        type="password"
                                        value={apiKey}
                                        onChange={(e) => setApiKey(e.target.value)}
                                        placeholder={t.start.apiKeyPlaceholder}
                                        className="w-full p-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    />

                                    {/* Consent Checkbox */}
                                    <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                        <input
                                            type="checkbox"
                                            id="settings-consent-checkbox"
                                            checked={consentGiven}
                                            onChange={(e) => setConsentGiven(e.target.checked)}
                                            className="mt-1 w-4 h-4 text-blue-600 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500"
                                        />
                                        <label htmlFor="settings-consent-checkbox" className="text-sm text-gray-800 dark:text-gray-200 cursor-pointer">
                                            {t.onboarding.api.consentLabel}
                                        </label>
                                    </div>

                                    {showConsentError && (
                                        <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                                            {t.onboarding.api.consentRequired}
                                        </p>
                                    )}

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

                            {/* Data Management */}
                            <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                    Data Management
                                </h2>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                    {t.common.clearWikipediaCacheDescription}
                                </p>
                                <div className="flex flex-wrap gap-3">
                                    <button
                                        onClick={handleClearWikipediaCache}
                                        className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 font-medium transition-all"
                                    >
                                        <Trash2 size={18} />
                                        {t.common.clearWikipediaCache}
                                    </button>
                                    <button
                                        onClick={handleRebuildWikipediaCache}
                                        disabled={isRebuilding}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all border ${isRebuilding 
                                            ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700 cursor-not-allowed'
                                            : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/50 border-blue-200 dark:border-blue-800'}`}
                                    >
                                        {isRebuilding ? (
                                            <Loader2 size={18} className="animate-spin" />
                                        ) : (
                                            <RefreshCw size={18} />
                                        )}
                                        {t.common.rebuildWikipediaCache}
                                    </button>
                                </div>
                            </div>

                            {/* Danger Zone - Clear All Data */}
                            <div className="pt-6 border-t border-red-200 dark:border-red-800">
                                <h2 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">
                                    Danger Zone
                                </h2>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                    {t.common.clearAllDataDescription}
                                </p>
                                <button
                                    onClick={handleClearAllData}
                                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium shadow-md transition-all"
                                >
                                    <Trash2 size={18} />
                                    {t.common.clearAllData}
                                </button>
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

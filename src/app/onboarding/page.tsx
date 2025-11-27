"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, KeyRound, Languages, Sparkles } from "lucide-react";
import Header from "@/components/Header";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { SupportedLanguage } from "@/lib/i18n/translations";

const STEPS = 4;

export default function OnboardingPage() {
    const router = useRouter();
    const [step, setStep] = useState(0);
    const [language, setLanguage] = useState<SupportedLanguage>("en");
    const [apiKey, setApiKey] = useState("");
    const [mounted, setMounted] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        const storedKey = localStorage.getItem("gemini_api_key");
        const storedLang = localStorage.getItem("chess_tutor_language");

        if (storedLang) {
            setLanguage(storedLang as SupportedLanguage);
        }

        if (storedKey) {
            router.push("/");
            return;
        }

        setMounted(true);
    }, [router]);

    const t = useTranslation(language);

    useEffect(() => {
        if (!mounted) return;
        localStorage.setItem("chess_tutor_language", language);
    }, [language, mounted]);

    const progress = useMemo(() => ((step + 1) / STEPS) * 100, [step]);

    const handleNext = () => {
        setError("");
        if (step < STEPS - 1) {
            setStep(step + 1);
        }
    };

    const handleBack = () => {
        setError("");
        if (step > 0) {
            setStep(step - 1);
        }
    };

    const handleFinish = () => {
        const trimmed = apiKey.trim();
        if (!trimmed) {
            setError(t.start.apiKeyRequired);
            return;
        }

        localStorage.setItem("gemini_api_key", trimmed);
        localStorage.setItem("chess_tutor_language", language);
        router.push("/");
    };

    if (!mounted) return null;

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
            <Header language={language} />

            <div className="max-w-4xl mx-auto px-4 py-10">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700">
                    <div className="h-1 bg-gray-200 dark:bg-gray-700">
                        <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${progress}%` }} />
                    </div>

                    <div className="p-6 md:p-10 space-y-8">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide font-semibold">
                                    {t.onboarding.stepIndicator(step + 1, STEPS)}
                                </p>
                                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                                    {step === 0 && t.onboarding.welcome.title}
                                    {step === 1 && t.onboarding.language.title}
                                    {step === 2 && t.onboarding.value.title}
                                    {step === 3 && t.onboarding.api.title}
                                </h1>
                            </div>
                            <div className="flex items-center gap-2">
                                {Array.from({ length: STEPS }).map((_, index) => (
                                    <div
                                        key={index}
                                        className={`w-3 h-3 rounded-full transition-all duration-200 ${index <= step ? 'bg-blue-600 scale-105' : 'bg-gray-300 dark:bg-gray-600'}`}
                                    />
                                ))}
                            </div>
                        </div>

                        {step === 0 && (
                            <div className="space-y-6">
                                <div className="flex flex-col md:flex-row items-center gap-8">
                                    <div className="flex-1 space-y-4">
                                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">
                                            <Sparkles size={16} />
                                            {t.onboarding.welcome.subtitle}
                                        </div>
                                        <p className="text-xl text-gray-700 dark:text-gray-200 leading-relaxed">
                                            {t.onboarding.welcome.claim}
                                        </p>
                                    </div>
                                    <div className="flex-1">
                                        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white shadow-lg">
                                            <div className="p-6 space-y-3">
                                                <p className="text-5xl">♟️</p>
                                                <p className="text-lg font-semibold">{t.start.title}</p>
                                                <p className="text-sm text-blue-100">Gemini • Stockfish • Tactics</p>
                                            </div>
                                            <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 1 && (
                            <div className="space-y-6">
                                <p className="text-gray-700 dark:text-gray-300">{t.onboarding.language.description}</p>
                                <div className="flex flex-wrap gap-3">
                                    {["en", "de", "fr", "it"].map((lang) => (
                                        <button
                                            key={lang}
                                            onClick={() => setLanguage(lang as SupportedLanguage)}
                                            className={`px-4 py-3 rounded-xl border text-sm font-semibold transition-all ${language === lang
                                                ? 'bg-blue-600 text-white border-blue-600 shadow-lg'
                                                : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:border-blue-400'}
                                            `}
                                        >
                                            <span className="inline-flex items-center gap-2">
                                                <Languages size={16} />
                                                {lang.toUpperCase()}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="grid md:grid-cols-2 gap-6">
                                {t.onboarding.value.bullets.map((bullet, index) => (
                                    <div key={index} className="flex items-start gap-3 bg-gray-50 dark:bg-gray-700/60 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
                                        <CheckCircle2 className="text-blue-600" size={20} />
                                        <p className="text-gray-800 dark:text-gray-100 leading-relaxed">{bullet}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {step === 3 && (
                            <div className="grid md:grid-cols-2 gap-8 items-start">
                                <div className="space-y-4">
                                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{t.onboarding.api.description}</p>
                                    <ul className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                                        <li className="flex gap-2 items-start">
                                            <KeyRound className="mt-0.5 text-blue-600" size={18} />
                                            <span>{t.onboarding.api.storage}</span>
                                        </li>
                                        <li className="flex gap-2 items-start">
                                            <KeyRound className="mt-0.5 text-blue-600" size={18} />
                                            <span>{t.onboarding.api.serverUse}</span>
                                        </li>
                                        <li className="flex gap-2 items-start">
                                            <KeyRound className="mt-0.5 text-blue-600" size={18} />
                                            <span>{t.onboarding.api.costNote}</span>
                                        </li>
                                        <li className="flex gap-2 items-start">
                                            <KeyRound className="mt-0.5 text-blue-600" size={18} />
                                            <span>{t.onboarding.api.privacy}</span>
                                        </li>
                                    </ul>
                                    <a
                                        href="https://aistudio.google.com/app/apikey"
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-2 text-blue-600 hover:underline font-semibold"
                                    >
                                        <ArrowRight size={16} /> {t.onboarding.api.getKey}
                                    </a>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-700/60 rounded-xl p-6 border border-gray-100 dark:border-gray-700 space-y-4">
                                    <label className="block text-sm font-semibold text-gray-800 dark:text-gray-100">
                                        {t.onboarding.api.inputLabel}
                                    </label>
                                    <input
                                        type="password"
                                        value={apiKey}
                                        onChange={(e) => setApiKey(e.target.value)}
                                        placeholder={t.onboarding.api.placeholder}
                                        className="w-full p-3 rounded-lg border dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                    {error && <p className="text-sm text-red-600">{error}</p>}
                                    <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                                        <p>There is no such thing as a free lunch – LLM usage requires your own key.</p>
                                        <p>{t.onboarding.api.storage}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
                            <button
                                onClick={handleBack}
                                disabled={step === 0}
                                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${step === 0
                                    ? 'text-gray-400 cursor-not-allowed'
                                    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                            >
                                <ArrowLeft size={18} /> {t.onboarding.actions.back}
                            </button>
                            <div className="flex items-center gap-3">
                                {step < STEPS - 1 && (
                                    <button
                                        onClick={handleNext}
                                        className="inline-flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-lg font-semibold shadow-md hover:bg-blue-700 transition"
                                    >
                                        {t.onboarding.actions.next} <ArrowRight size={18} />
                                    </button>
                                )}
                                {step === STEPS - 1 && (
                                    <button
                                        onClick={handleFinish}
                                        className="inline-flex items-center gap-2 px-5 py-3 bg-green-600 text-white rounded-lg font-semibold shadow-md hover:bg-green-700 transition"
                                    >
                                        {t.onboarding.actions.finish}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

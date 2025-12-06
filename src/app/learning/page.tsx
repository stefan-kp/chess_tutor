"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Target, BookOpen } from "lucide-react";
import Header from "@/components/Header";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { SupportedLanguage } from "@/lib/i18n/translations";
import { Personality, PERSONALITIES } from "@/lib/personalities";

const TACTICAL_PATTERNS = [
    { id: 'PIN', icon: '📌' },
    { id: 'SKEWER', icon: '🎯' },
    { id: 'FORK', icon: '🍴' },
    { id: 'DISCOVERED_CHECK', icon: '🔍' },
    { id: 'DOUBLE_ATTACK', icon: '⚔️' },
    { id: 'OVERLOADING', icon: '⚖️' },
    { id: 'BACK_RANK_WEAKNESS', icon: '🏰' },
    { id: 'TRAPPED_PIECE', icon: '🪤' },
] as const;

export default function LearningAreaPage() {
    const router = useRouter();
    const [language, setLanguage] = useState<SupportedLanguage>('en');
    const [mounted, setMounted] = useState(false);
    const [selectedPersonality, setSelectedPersonality] = useState<Personality>(PERSONALITIES[0]);

    useEffect(() => {
        const storedLang = localStorage.getItem("chess_tutor_language");
        if (storedLang) setLanguage(storedLang as SupportedLanguage);

        const storedPersonalityId = localStorage.getItem("chess_tutor_personality");
        if (storedPersonalityId) {
            const personality = PERSONALITIES.find(p => p.id === storedPersonalityId);
            if (personality) setSelectedPersonality(personality);
        }

        setMounted(true);
    }, []);

    const t = useTranslation(language);

    if (!mounted) return null;

    const getPatternName = (patternId: string): string => {
        const key = patternId.toLowerCase().replace(/_/g, '') as keyof typeof t.learning.patterns;
        // Map pattern IDs to translation keys
        const mapping: Record<string, keyof typeof t.learning.patterns> = {
            'PIN': 'pin',
            'SKEWER': 'skewer',
            'FORK': 'fork',
            'DISCOVERED_CHECK': 'discoveredCheck',
            'DOUBLE_ATTACK': 'doubleAttack',
            'OVERLOADING': 'overloading',
            'BACK_RANK_WEAKNESS': 'backRankWeakness',
            'TRAPPED_PIECE': 'trappedPiece',
        };
        return t.learning.patterns[mapping[patternId]];
    };

    return (
        <>
            <Header language={language} />
            <div className="flex-grow bg-gray-100 dark:bg-gray-900 p-4 flex flex-col">
                <div className="max-w-6xl mx-auto w-full">
                    {/* Header */}
                    <div className="mb-8 flex items-center justify-between">
                        <button
                            onClick={() => router.push("/")}
                            className="p-2 md:px-4 md:py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 text-sm font-medium transition-colors flex items-center gap-2"
                        >
                            <ArrowLeft size={20} />
                            <span className="hidden md:inline">{t.learning.backToMenu}</span>
                        </button>
                    </div>

                    <h1 className="text-4xl font-bold mb-4 text-gray-800 dark:text-white">
                        {t.learning.title}
                    </h1>
                    <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
                        {t.learning.subtitle}
                    </p>

                    {/* Coach Selection */}
                    <div className="mb-12 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                            {t.analysis.chooseCoach}
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {PERSONALITIES.map((personality) => (
                                <button
                                    key={personality.id}
                                    onClick={() => {
                                        setSelectedPersonality(personality);
                                        localStorage.setItem("chess_tutor_personality", personality.id);
                                    }}
                                    className={`p-4 rounded-lg border-2 transition-all ${
                                        selectedPersonality.id === personality.id
                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                            : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
                                    }`}
                                >
                                    <div className="text-2xl mb-1">{personality.image}</div>
                                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                                        {personality.name}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Tactical Patterns Section */}
                    <div className="mb-12">
                        <div className="flex items-center gap-3 mb-6">
                            <Target className="text-blue-600 dark:text-blue-400" size={32} />
                            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                                {t.learning.tacticalPatterns}
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {TACTICAL_PATTERNS.map((pattern) => (
                                <button
                                    key={pattern.id}
                                    onClick={() => router.push(`/learning/tactics/${pattern.id.toLowerCase()}`)}
                                    className="group bg-white dark:bg-gray-800 p-6 rounded-xl hover:bg-blue-50 dark:hover:bg-gray-700 transition-all border-2 border-transparent hover:border-blue-500 dark:hover:border-blue-400 shadow-sm hover:shadow-md text-left"
                                >
                                    <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">
                                        {pattern.icon}
                                    </div>
                                    <h3 className="font-bold text-gray-900 dark:text-white text-lg">
                                        {getPatternName(pattern.id)}
                                    </h3>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Openings Section */}
                    <div>
                        <div className="flex items-center gap-3 mb-6">
                            <BookOpen className="text-purple-600 dark:text-purple-400" size={32} />
                            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                                {t.learning.openings}
                            </h2>
                        </div>

                        <div className="bg-white dark:bg-gray-800 p-8 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 text-center">
                            <p className="text-gray-500 dark:text-gray-400 text-lg">
                                {t.learning.comingSoon}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}


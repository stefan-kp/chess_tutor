"use client";

import { useState, useEffect, useRef } from "react";
import { X, Loader2, Send, BookOpen } from "lucide-react";
import { OpeningMetadata } from "@/lib/openings";
import { getGenAIModel } from "@/lib/gemini";
import { ChatSession } from "@google/generative-ai";
import ReactMarkdown from "react-markdown";
import { SupportedLanguage, translations } from "@/lib/i18n/translations";
import { Personality } from "@/lib/personalities";

interface OpeningsModalProps {
    openings: OpeningMetadata[];
    currentFen: string;
    language: SupportedLanguage;
    personality: Personality;
    onClose: () => void;
}

interface OpeningExplanation {
    content: string;
    isLoading: boolean;
    chatSession?: ChatSession;
    messages: { role: "user" | "assistant"; content: string }[];
}

export function OpeningsModal({
    openings,
    currentFen,
    language,
    personality,
    onClose,
}: OpeningsModalProps) {
    const t = translations[language];
    const [activeTab, setActiveTab] = useState(0);
    const [explanations, setExplanations] = useState<Record<number, OpeningExplanation>>({});
    const [followUpInput, setFollowUpInput] = useState("");
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [explanations, activeTab]);

    // Generate explanation when tab is clicked
    const generateExplanation = async (index: number) => {
        if (explanations[index]?.content || explanations[index]?.isLoading) return;

        const opening = openings[index];
        const apiKey = typeof window !== "undefined" ? localStorage.getItem("gemini_api_key") : null;
        if (!apiKey) return;

        setExplanations(prev => ({
            ...prev,
            [index]: { content: "", isLoading: true, messages: [] }
        }));

        try {
            const model = getGenAIModel(apiKey);
            const chat = model.startChat({
                history: [],
                generationConfig: { maxOutputTokens: 1024 },
            });

            const prompt = `You are ${personality.name}, a chess coach with this style: "${personality.systemPrompt}".

The player is analyzing a game and has reached this position (FEN): ${currentFen}

The opening being played is: ${opening.name} (ECO: ${opening.eco})
Move sequence: ${opening.moves}

Please provide a brief but insightful explanation about this opening. Cover:
1. What strategy is White pursuing with this opening?
2. What is Black's typical response and counter-strategy?
3. How do these strategies pair against each other? Is this a good matchup for one side?
4. One interesting historical fact or famous game featuring this opening (keep it brief)

Be conversational and engaging, matching your personality. Keep your response concise (about 150-200 words).
Respond in ${language === 'de' ? 'German' : language === 'fr' ? 'French' : language === 'it' ? 'Italian' : 'English'}.`;

            const result = await chat.sendMessage(prompt);
            const responseText = result.response.text();

            setExplanations(prev => ({
                ...prev,
                [index]: {
                    content: responseText,
                    isLoading: false,
                    chatSession: chat,
                    messages: [{ role: "assistant", content: responseText }]
                }
            }));
        } catch (err) {
            console.error("Failed to generate opening explanation:", err);
            setExplanations(prev => ({
                ...prev,
                [index]: { content: "Failed to generate explanation. Please check your API key.", isLoading: false, messages: [] }
            }));
        }
    };

    // Generate explanation for first tab on mount
    useEffect(() => {
        if (openings.length > 0) {
            generateExplanation(0);
        }
    }, []);

    // Handle tab change
    const handleTabChange = (index: number) => {
        setActiveTab(index);
        setFollowUpInput("");
        generateExplanation(index);
    };

    // Handle follow-up question
    const handleFollowUp = async () => {
        if (!followUpInput.trim() || isSending) return;

        const currentExplanation = explanations[activeTab];
        if (!currentExplanation?.chatSession) return;

        const userMessage = followUpInput.trim();
        setFollowUpInput("");
        setIsSending(true);

        // Add user message immediately
        setExplanations(prev => ({
            ...prev,
            [activeTab]: {
                ...prev[activeTab],
                messages: [...prev[activeTab].messages, { role: "user", content: userMessage }]
            }
        }));

        try {
            const result = await currentExplanation.chatSession.sendMessage(userMessage);
            const responseText = result.response.text();

            setExplanations(prev => ({
                ...prev,
                [activeTab]: {
                    ...prev[activeTab],
                    messages: [...prev[activeTab].messages, { role: "assistant", content: responseText }]
                }
            }));
        } catch (err) {
            console.error("Failed to send follow-up:", err);
        } finally {
            setIsSending(false);
        }
    };

    const currentOpening = openings[activeTab];
    const currentExplanation = explanations[activeTab];

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                        <BookOpen className="text-purple-600" size={24} />
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                            {t.analysis.openingsExplorer || "Opening Explorer"}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex overflow-x-auto border-b border-gray-200 dark:border-gray-700 px-4">
                    {openings.map((opening, index) => (
                        <button
                            key={`${opening.eco}-${index}`}
                            onClick={() => handleTabChange(index)}
                            className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === index
                                    ? "border-purple-600 text-purple-600"
                                    : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                                }`}
                        >
                            {opening.eco}: {opening.name.length > 20 ? opening.name.substring(0, 20) + "..." : opening.name}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {currentOpening && (
                        <div className="space-y-4">
                            {/* Opening Info */}
                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                                <h3 className="font-bold text-blue-900 dark:text-blue-100 text-lg">
                                    {currentOpening.name}
                                </h3>
                                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                                    ECO: {currentOpening.eco} • {currentOpening.moves}
                                </p>
                            </div>

                            {/* Messages/Explanation */}
                            <div className="space-y-4">
                                {currentExplanation?.isLoading && !currentExplanation.content ? (
                                    <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300 py-8 justify-center">
                                        <Loader2 className="animate-spin" size={24} />
                                        <span>{t.analysis.generatingExplanation || "Generating explanation..."}</span>
                                    </div>
                                ) : currentExplanation?.messages.length > 0 ? (
                                    currentExplanation.messages.map((msg, idx) => (
                                        <div
                                            key={idx}
                                            className={`p-4 rounded-lg ${msg.role === "user"
                                                    ? "bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 ml-8"
                                                    : "bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700"
                                                }`}
                                        >
                                            {msg.role === "user" ? (
                                                <p className="text-gray-800 dark:text-gray-200">{msg.content}</p>
                                            ) : (
                                                <div className="prose prose-sm dark:prose-invert max-w-none">
                                                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                                        {t.analysis.noApiKey || "Please add an API key in settings to get opening explanations."}
                                    </p>
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                        </div>
                    )}
                </div>

                {/* Follow-up Input */}
                {currentExplanation?.chatSession && (
                    <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={followUpInput}
                                onChange={(e) => setFollowUpInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleFollowUp()}
                                placeholder={t.analysis.askFollowUp || "Ask a follow-up question about this opening..."}
                                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                disabled={isSending}
                            />
                            <button
                                onClick={handleFollowUp}
                                disabled={!followUpInput.trim() || isSending}
                                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {isSending ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}


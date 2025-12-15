"use client";

import { useState, useEffect } from "react";
import { Key } from "lucide-react";

interface APIKeyInputProps {
    onKeySubmit: (key: string) => void;
}

export function APIKeyInput({ onKeySubmit }: APIKeyInputProps) {
    const [key, setKey] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const [consentGiven, setConsentGiven] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        const envKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
        const storedKey = localStorage.getItem("gemini_api_key");

        if (envKey) {
            onKeySubmit(envKey);
        } else if (storedKey) {
            onKeySubmit(storedKey);
        } else {
            setIsOpen(true);
        }
    }, [onKeySubmit]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!key.trim()) {
            setError("API key is required");
            return;
        }

        if (!consentGiven) {
            setError("You must agree to store the API key in local storage to continue");
            return;
        }

        localStorage.setItem("gemini_api_key", key.trim());
        onKeySubmit(key.trim());
        setIsOpen(false);
        setError("");
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-4 right-4 p-2 bg-gray-200 dark:bg-gray-800 rounded-full hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
                title="Update API Key"
            >
                <Key size={20} />
            </button>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
                <h2 className="text-xl font-bold mb-4">Enter Gemini API Key</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    To receive AI feedback, please enter your Google Gemini API key.
                    It will be stored locally in your browser.
                </p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input
                        type="password"
                        value={key}
                        onChange={(e) => setKey(e.target.value)}
                        placeholder="AIzaSy..."
                        className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                        required
                    />

                    {/* Consent Checkbox */}
                    <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <input
                            type="checkbox"
                            id="api-key-consent-checkbox"
                            checked={consentGiven}
                            onChange={(e) => setConsentGiven(e.target.checked)}
                            className="mt-0.5 w-4 h-4 text-blue-600 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <label htmlFor="api-key-consent-checkbox" className="text-xs text-gray-800 dark:text-gray-200 cursor-pointer">
                            I understand and agree that my API key will be stored in my browser's local storage
                        </label>
                    </div>

                    {error && (
                        <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                            {error}
                        </p>
                    )}

                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                            Save Key
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

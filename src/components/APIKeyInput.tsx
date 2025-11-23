"use client";

import { useState, useEffect } from "react";
import { Key } from "lucide-react";

interface APIKeyInputProps {
    onKeySubmit: (key: string) => void;
}

export function APIKeyInput({ onKeySubmit }: APIKeyInputProps) {
    const [key, setKey] = useState("");
    const [isOpen, setIsOpen] = useState(false);

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
        if (key.trim()) {
            localStorage.setItem("gemini_api_key", key.trim());
            onKeySubmit(key.trim());
            setIsOpen(false);
        }
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

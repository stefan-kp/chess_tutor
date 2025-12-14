import React from 'react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { SupportedLanguage } from '@/lib/i18n/translations';

interface HeaderProps {
    language: SupportedLanguage;
}

export default function Header({ language }: HeaderProps) {
    const t = useTranslation(language);

    return (
        <header className="w-full border-b border-gray-300 bg-white dark:border-neutral-800 dark:bg-zinc-900">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* App Title/Branding */}
                    <Link href="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity cursor-pointer">
                        <div className="text-2xl">♞</div>
                        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                            Chess Tutor
                        </h1>
                        <span className="hidden sm:inline-block text-sm text-gray-500 dark:text-gray-400">
                            {t.header.tagline}
                        </span>
                    </Link>

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-3">
                        {/* Buy Me a Beer Button */}
                        <a
                            href="https://paypal.me/stefan1"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                        >
                            <span className="mr-2">🍺</span>
                            <span className="hidden sm:inline">{t.header.buyMeABeer}</span>
                        </a>

                        {/* GitHub Button */}
                        <a
                            href="https://github.com/stefan-kp/chess_tutor"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                            aria-label="View on GitHub"
                        >
                            <svg
                                className="w-5 h-5"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                                    clipRule="evenodd"
                                />
                            </svg>
                            <span className="ml-2 hidden sm:inline">{t.header.github}</span>
                        </a>
                    </div>
                </div>
            </div>
        </header>
    );
}

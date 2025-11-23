import Link from "next/link";

export default function Footer() {
    // Read environment variables at runtime (Server Component)
    const imprintUrl = process.env.IMPRINT_URL;

    return (
        <footer className="bg-gray-100 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 py-6 mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                        © {new Date().getFullYear()} Chess Tutor AI. All rights reserved.
                    </div>

                    <div className="flex gap-6 text-sm">
                        {imprintUrl ? (
                            <a
                                href={imprintUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            >
                                Imprint
                            </a>
                        ) : (
                            <Link
                                href="/imprint"
                                className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            >
                                Imprint
                            </Link>
                        )}

                        <Link
                            href="/privacy"
                            className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        >
                            Data Privacy
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}

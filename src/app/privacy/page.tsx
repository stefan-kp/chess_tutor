import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function PrivacyPage() {
    // Read environment variable at runtime (Server Component)
    const responsiblePerson = process.env.DATA_PRIVACY_RESPONSIBLE_PERSON || "[Name of Responsible Person]";

    return (
        <div className="min-h-screen flex flex-col bg-white dark:bg-gray-900">
            <Header language="en" />

            <main className="flex-grow container mx-auto px-4 py-12 max-w-3xl">
                <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">Data Privacy Policy</h1>

                <div className="prose dark:prose-invert max-w-none space-y-8">
                    <section>
                        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">1. Responsible Person</h2>
                        <p className="text-gray-600 dark:text-gray-300">
                            Responsible for data processing according to GDPR:
                        </p>
                        <div className="mt-2 p-4 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 font-mono text-sm">
                            {responsiblePerson}
                        </div>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">2. Data Collection and Storage</h2>
                        <p className="text-gray-600 dark:text-gray-300">
                            This application is designed to be privacy-friendly. We do not collect personal data on our servers.
                        </p>
                        <ul className="list-disc pl-5 mt-2 space-y-2 text-gray-600 dark:text-gray-300">
                            <li>
                                <strong>Local Storage:</strong> Your settings (language preference, API key) are stored locally in your browser's Local Storage. This data never leaves your device unless you explicitly send it (e.g., the API key is sent to Google's servers to generate AI responses).
                            </li>
                            <li>
                                <strong>Cookies:</strong> We do not use cookies for tracking or analytics.
                            </li>
                            <li>
                                <strong>Server Logs:</strong> We do not store personal information in server logs.
                            </li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">3. Third-Party Services</h2>
                        <p className="text-gray-600 dark:text-gray-300">
                            <strong>Google Gemini API:</strong> When you use the AI Tutor feature, your game state (FEN string) and your API key are sent to Google's servers to generate the response. Please refer to <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google's Privacy Policy</a> for more information on how they handle data.
                        </p>
                    </section>
                </div>
            </main>

            <Footer />
        </div>
    );
}

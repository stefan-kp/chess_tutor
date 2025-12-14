import { redirect } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

// Force dynamic rendering to read environment variables at runtime
export const dynamic = 'force-dynamic';

export default function ImprintPage() {
    // If external imprint URL is configured, redirect to it
    const imprintUrl = process.env.IMPRINT_URL;

    if (imprintUrl) {
        redirect(imprintUrl);
    }

    return (
        <div className="min-h-screen flex flex-col bg-white dark:bg-gray-900">
            <Header language="en" />

            <main className="flex-grow container mx-auto px-4 py-12 max-w-3xl">
                <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">Imprint</h1>

                <div className="prose dark:prose-invert max-w-none">
                    <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                        <p className="text-gray-600 dark:text-gray-300">
                            Currently no imprint information is available.
                        </p>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}

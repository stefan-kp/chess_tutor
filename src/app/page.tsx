import ChessGame from "@/components/ChessGame";

export default function Home() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-between p-8 bg-gray-50 dark:bg-gray-900">
            <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex">
                <p className="fixed left-0 top-0 flex w-full justify-center border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 dark:from-inherit lg:static lg:w-auto  lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4 lg:dark:bg-zinc-800/30">
                    Chess Tutor with Gemini & Stockfish
                </p>
            </div>

            <div className="w-full max-w-6xl mt-8">
                <ChessGame />
            </div>

            <div className="mb-32 grid text-center lg:mb-0 lg:grid-cols-4 lg:text-left">

            </div>
        </main>
    );
}

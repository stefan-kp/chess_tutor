"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ChessGame from "@/components/ChessGame";
import StartScreen from "@/components/StartScreen";
import { Personality } from "@/lib/personalities";

type ViewState = 'start' | 'game';

export default function Home() {
    const router = useRouter();
    const [view, setView] = useState<ViewState>('start');
    const [mounted, setMounted] = useState(false);

    // Game Initialization State
    const [gameProps, setGameProps] = useState<{
        initialFen?: string;
        initialPersonality: Personality;
        initialColor: 'white' | 'black';
    } | null>(null);

    const [hasSavedGame, setHasSavedGame] = useState(false);

    useEffect(() => {
        // Check for API Key
        const apiKey = localStorage.getItem("gemini_api_key");
        if (!apiKey) {
            router.push("/settings");
            return;
        }

        // Check for saved game
        const savedGame = localStorage.getItem("chess_tutor_save");
        if (savedGame) {
            setHasSavedGame(true);
        }

        setMounted(true);
    }, [router]);

    const handleStartGame = (options: {
        personality: Personality;
        color: 'white' | 'black' | 'random';
        fen?: string;
    }) => {
        const color = options.color === 'random'
            ? (Math.random() < 0.5 ? 'white' : 'black')
            : options.color;

        setGameProps({
            initialFen: options.fen,
            initialPersonality: options.personality,
            initialColor: color
        });
        setView('game');
    };

    const handleResumeGame = () => {
        const savedGame = localStorage.getItem("chess_tutor_save");
        if (savedGame) {
            try {
                const data = JSON.parse(savedGame);
                if (data.fen && data.selectedPersonality) {
                    setGameProps({
                        initialFen: data.fen,
                        initialPersonality: data.selectedPersonality,
                        initialColor: data.playerColor || 'white'
                    });
                    setView('game');
                }
            } catch (e) {
                console.error("Failed to resume game:", e);
            }
        }
    };

    const handleBackToMenu = () => {
        setView('start');
        // Re-check saved game status as it might have changed
        const savedGame = localStorage.getItem("chess_tutor_save");
        setHasSavedGame(!!savedGame);
    };

    if (!mounted) return null;

    return (
        <main>
            {view === 'start' && (
                <StartScreen
                    onStartGame={handleStartGame}
                    onResumeGame={handleResumeGame}
                    hasSavedGame={hasSavedGame}
                />
            )}
            {view === 'game' && gameProps && (
                <ChessGame
                    initialFen={gameProps.initialFen}
                    initialPersonality={gameProps.initialPersonality}
                    initialColor={gameProps.initialColor}
                    onBack={handleBackToMenu}
                />
            )}
        </main>
    );
}

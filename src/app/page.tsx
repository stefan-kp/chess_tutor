"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ChessGame from "@/components/ChessGame";
import StartScreen from "@/components/StartScreen";
import { Personality, PERSONALITIES } from "@/lib/personalities";
import { SavedGame, deleteSavedGame, loadSavedGames } from "@/lib/savedGames";

type ViewState = 'start' | 'game';

export default function Home() {
    const router = useRouter();
    const [view, setView] = useState<ViewState>('start');
    const [mounted, setMounted] = useState(false);

    // Game Initialization State
    const [gameProps, setGameProps] = useState<{
        gameId: string;
        initialFen?: string;
        initialPgn?: string;
        initialPersonality: Personality;
        initialColor: 'white' | 'black';
        initialStockfishDepth?: number;
    } | null>(null);

    const [savedGames, setSavedGames] = useState<SavedGame[]>([]);

    useEffect(() => {
        // Check for API Key
        const apiKey = localStorage.getItem("gemini_api_key");
        if (!apiKey) {
            router.push("/onboarding");
            return;
        }

        setSavedGames(loadSavedGames());

        const pendingGameRaw = localStorage.getItem("chess_tutor_pending_game");
        if (pendingGameRaw) {
            try {
                const pendingGame = JSON.parse(pendingGameRaw) as {
                    fen: string;
                    personalityId: string;
                    color: 'white' | 'black';
                    stockfishDepth?: number;
                };

                const personality = PERSONALITIES.find(p => p.id === pendingGame.personalityId) || PERSONALITIES[0];

                setGameProps({
                    gameId: crypto.randomUUID ? crypto.randomUUID() : `game-${Date.now()}`,
                    initialFen: pendingGame.fen,
                    initialPersonality: personality,
                    initialColor: pendingGame.color,
                    initialStockfishDepth: pendingGame.stockfishDepth,
                });
                setView('game');
            } catch (err) {
                console.error("Failed to load pending game", err);
            } finally {
                localStorage.removeItem("chess_tutor_pending_game");
            }
        }

        setMounted(true);
    }, [router]);

    const handleStartGame = (options: {
        personality: Personality;
        color: 'white' | 'black' | 'random';
        fen?: string;
        pgn?: string;
    }) => {
        const color = options.color === 'random'
            ? (Math.random() < 0.5 ? 'white' : 'black')
            : options.color;

        setGameProps({
            gameId: crypto.randomUUID ? crypto.randomUUID() : `game-${Date.now()}`,
            initialFen: options.fen,
            initialPgn: options.pgn,
            initialPersonality: options.personality,
            initialColor: color
        });
        setView('game');
    };

    const handleResumeGame = (game: SavedGame) => {
        setGameProps({
            gameId: game.id,
            initialFen: game.fen,
            initialPgn: game.pgn,
            initialPersonality: game.selectedPersonality,
            initialColor: game.playerColor || 'white'
        });
        setView('game');
    };

    const handleBackToMenu = () => {
        setView('start');
        setSavedGames(loadSavedGames());
    };

    const handleDeleteSavedGame = (id: string) => {
        deleteSavedGame(id);
        setSavedGames(loadSavedGames());
    };

    if (!mounted) return null;

    return (
        <main className="flex-grow flex flex-col">
            {view === 'start' && (
                <StartScreen
                    onStartGame={handleStartGame}
                    onResumeGame={handleResumeGame}
                    savedGames={savedGames}
                    onDeleteSavedGame={handleDeleteSavedGame}
                />
            )}
            {view === 'game' && gameProps && (
                <ChessGame
                    gameId={gameProps.gameId}
                    initialFen={gameProps.initialFen}
                    initialPgn={gameProps.initialPgn}
                    initialPersonality={gameProps.initialPersonality}
                    initialColor={gameProps.initialColor}
                    initialStockfishDepth={gameProps.initialStockfishDepth}
                    onBack={handleBackToMenu}
                />
            )}
        </main>
    );
}

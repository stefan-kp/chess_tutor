"use client";

import { useState, useEffect } from "react";
import { Chessboard } from "react-chessboard";
import { X, Loader2, Download, ExternalLink } from "lucide-react";
import { fetchChessComGames, fetchLichessGames, GameMetadata, Platform } from "@/lib/gameImport";
import { SupportedLanguage } from "@/lib/i18n/translations";

interface GameImportModalProps {
    onClose: () => void;
    onSelectGame: (pgn: string) => void;
    language: SupportedLanguage;
}

export function GameImportModal({ onClose, onSelectGame, language }: GameImportModalProps) {
    const [platform, setPlatform] = useState<Platform>('chesscom');
    const [username, setUsername] = useState('');
    const [games, setGames] = useState<GameMetadata[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load saved usernames from localStorage
    useEffect(() => {
        const savedChessComUsername = localStorage.getItem('chesscom_username');
        const savedLichessUsername = localStorage.getItem('lichess_username');
        
        if (platform === 'chesscom' && savedChessComUsername) {
            setUsername(savedChessComUsername);
        } else if (platform === 'lichess' && savedLichessUsername) {
            setUsername(savedLichessUsername);
        } else {
            setUsername('');
        }
    }, [platform]);

    const handleFetchGames = async () => {
        if (!username.trim()) {
            setError('Please enter a username');
            return;
        }

        setIsLoading(true);
        setError(null);
        setGames([]);

        try {
            let fetchedGames: GameMetadata[];
            
            if (platform === 'chesscom') {
                fetchedGames = await fetchChessComGames(username.trim(), 20);
                // Save username to localStorage
                localStorage.setItem('chesscom_username', username.trim());
            } else {
                fetchedGames = await fetchLichessGames(username.trim(), 20);
                // Save username to localStorage
                localStorage.setItem('lichess_username', username.trim());
            }

            if (fetchedGames.length === 0) {
                setError('No games found for this user');
            } else {
                setGames(fetchedGames);
            }
        } catch (err) {
            console.error('Error fetching games:', err);
            setError(`Failed to fetch games. Please check the username and try again.`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectGame = (game: GameMetadata) => {
        onSelectGame(game.pgn);
        onClose();
    };

    const formatDate = (isoDate: string) => {
        const date = new Date(isoDate);
        return date.toLocaleDateString(language, { year: 'numeric', month: 'short', day: 'numeric' });
    };

    const getResultColor = (result: string, white: string, black: string, currentUsername: string) => {
        if (result === '1/2-1/2') return 'text-gray-600 dark:text-gray-400';
        
        const isWhite = white.toLowerCase() === currentUsername.toLowerCase();
        const won = (result === '1-0' && isWhite) || (result === '0-1' && !isWhite);
        
        return won ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
    };

    const getResultText = (result: string) => {
        if (result === '1-0') return 'White Won';
        if (result === '0-1') return 'Black Won';
        if (result === '1/2-1/2') return 'Draw';
        return 'In Progress';
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-700 animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
                    <h2 className="text-lg font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                        <Download className="text-purple-600" />
                        Import Game from Online Platform
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                    {/* Platform Selection */}
                    <div className="space-y-3">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                            Select Platform
                        </label>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => setPlatform('chesscom')}
                                className={`py-3 px-4 rounded-lg border-2 font-semibold transition-all ${
                                    platform === 'chesscom'
                                        ? 'bg-green-50 border-green-600 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                                        : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-green-300'
                                }`}
                            >
                                Chess.com
                            </button>
                            <button
                                onClick={() => setPlatform('lichess')}
                                className={`py-3 px-4 rounded-lg border-2 font-semibold transition-all ${
                                    platform === 'lichess'
                                        ? 'bg-blue-50 border-blue-600 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                                        : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-blue-300'
                                }`}
                            >
                                Lichess
                            </button>
                        </div>
                    </div>

                    {/* Username Input */}
                    <div className="space-y-3">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                            Username
                        </label>
                        <div className="flex gap-3">
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleFetchGames()}
                                placeholder={`Enter ${platform === 'chesscom' ? 'Chess.com' : 'Lichess'} username`}
                                className="flex-1 px-4 py-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            />
                            <button
                                onClick={handleFetchGames}
                                disabled={isLoading || !username.trim()}
                                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
                                Fetch Games
                            </button>
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
                            {error}
                        </div>
                    )}

                    {/* Loading State */}
                    {isLoading && (
                        <div className="flex flex-col items-center justify-center py-12 space-y-4">
                            <Loader2 className="animate-spin text-purple-600" size={48} />
                            <p className="text-gray-500">Fetching games from {platform === 'chesscom' ? 'Chess.com' : 'Lichess'}...</p>
                        </div>
                    )}

                    {/* Games Grid */}
                    {!isLoading && games.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                Recent Games ({games.length})
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {games.map((game) => (
                                    <div
                                        key={game.id}
                                        onClick={() => handleSelectGame(game)}
                                        className="group relative bg-gray-50 dark:bg-gray-700 p-4 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-purple-400 dark:hover:border-purple-300 shadow-sm hover:shadow-md transition-all cursor-pointer"
                                    >
                                        {/* Game Info */}
                                        <div className="flex gap-4">
                                            {/* Mini Chessboard */}
                                            <div className="w-24 h-24 shrink-0">
                                                <Chessboard
                                                    options={{
                                                        position: game.finalFen,
                                                        boardOrientation: 'white',
                                                        allowDragging: false,
                                                        darkSquareStyle: { backgroundColor: '#779954' },
                                                        lightSquareStyle: { backgroundColor: '#e9edcc' },
                                                        boardStyle: { borderRadius: '8px' }
                                                    }}
                                                />
                                            </div>

                                            {/* Game Details */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2 mb-2">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-semibold text-gray-900 dark:text-white truncate">
                                                            {game.white} vs {game.black}
                                                        </p>
                                                        <p className={`text-sm font-medium ${getResultColor(game.result, game.white, game.black, username)}`}>
                                                            {getResultText(game.result)}
                                                        </p>
                                                    </div>
                                                    {game.url && (
                                                        <a
                                                            href={game.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                                                            title="View on platform"
                                                        >
                                                            <ExternalLink size={16} />
                                                        </a>
                                                    )}
                                                </div>

                                                <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                                                    <p>{formatDate(game.date)}</p>
                                                    <p className="capitalize">{game.timeControl}</p>
                                                    {game.opening && (
                                                        <p className="truncate" title={game.opening}>
                                                            {game.opening}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Hover Effect */}
                                        <div className="absolute inset-0 bg-purple-500/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}


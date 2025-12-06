"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { Chess, Move } from "chess.js";
import { Chessboard } from "react-chessboard";
import { ArrowLeft, CheckCircle, XCircle, RefreshCw, SkipForward } from "lucide-react";
import Header from "@/components/Header";
import { Tutor } from "@/components/Tutor";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { SupportedLanguage } from "@/lib/i18n/translations";
import { Personality, PERSONALITIES } from "@/lib/personalities";
import {
    generateTacticExercise,
    TacticalPatternType,
    TacticExercise
} from "@/lib/tacticalLibrary";
import pinFixtures from "../../../../../fixtures/tactics/pin.json";

type FeedbackState = 'none' | 'correct' | 'incorrect';

export default function TacticalPracticePage() {
    const router = useRouter();
    const params = useParams();
    const pattern = (params.pattern as string).toUpperCase() as TacticalPatternType;

    const [language, setLanguage] = useState<SupportedLanguage>('en');
    const [mounted, setMounted] = useState(false);
    const [exercise, setExercise] = useState<TacticExercise | null>(null);
    const [fen, setFen] = useState<string>('');
    const [feedback, setFeedback] = useState<FeedbackState>('none');
    const [selectedPersonality, setSelectedPersonality] = useState<Personality>(PERSONALITIES[0]);
    const [apiKey, setApiKey] = useState<string>('');
    const [userMove, setUserMove] = useState<Move | null>(null);
    const [setupError, setSetupError] = useState<string | null>(null);
    const [showSetupWarning, setShowSetupWarning] = useState<boolean>(false);
    const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
    const [currentMoveIndex, setCurrentMoveIndex] = useState<number>(0);  // Track progress in move sequence

    // Statistics tracking
    const [stats, setStats] = useState({
        totalCorrect: 0,
        totalIncorrect: 0,
        currentStreak: 0,
        bestStreak: 0,
    });

    const gameRef = useRef<Chess>(new Chess());

    // Sound Refs
    const moveSound = useRef<HTMLAudioElement | null>(null);
    const captureSound = useRef<HTMLAudioElement | null>(null);
    const successSound = useRef<HTMLAudioElement | null>(null);
    const errorSound = useRef<HTMLAudioElement | null>(null);

    // Initialize sound effects
    useEffect(() => {
        moveSound.current = new Audio('/sounds/move.wav');
        captureSound.current = new Audio('/sounds/capture.wav');
        successSound.current = new Audio('/sounds/victory.wav');
        errorSound.current = new Audio('/sounds/defeat.wav');
    }, []);

    const playMoveSound = (captured: boolean) => {
        if (captured) {
            captureSound.current?.play().catch(e => console.error("Audio play failed", e));
        } else {
            moveSound.current?.play().catch(e => console.error("Audio play failed", e));
        }
    };

    useEffect(() => {
        const storedLang = localStorage.getItem("chess_tutor_language");
        if (storedLang) setLanguage(storedLang as SupportedLanguage);

        // Load API key from the correct localStorage key
        const storedApiKey = localStorage.getItem("gemini_api_key");
        if (storedApiKey) setApiKey(storedApiKey);

        const storedPersonalityId = localStorage.getItem("chess_tutor_personality");
        if (storedPersonalityId) {
            const personality = PERSONALITIES.find(p => p.id === storedPersonalityId);
            if (personality) setSelectedPersonality(personality);
        }

        // Check if high-quality puzzles have been set up by checking the fixture metadata
        // Lichess puzzles have source: "https://database.lichess.org/"
        const isLichessPuzzles = pinFixtures.source === "https://database.lichess.org/";
        const warningDismissed = localStorage.getItem("tactical_puzzles_warning_dismissed");

        if (!isLichessPuzzles && !warningDismissed) {
            setShowSetupWarning(true);
        }

        setMounted(true);
    }, []);

    useEffect(() => {
        if (mounted) {
            loadNewExercise();
        }
    }, [mounted, pattern]);

    const loadNewExercise = () => {
        try {
            // Try to load a puzzle for either side (white or black)
            // The library will randomly pick from available puzzles
            const randomSide = Math.random() > 0.5 ? 'white' : 'black';
            const newExercise = generateTacticExercise({
                patternType: pattern,
                side: randomSide,
                difficulty: difficulty,  // Use selected difficulty
            });

            console.log('📚 Loaded new exercise:');
            console.log('  FEN:', newExercise.startPosition.fen);
            console.log('  Solution move:', newExercise.solutionMove);
            console.log('  Move sequence:', newExercise.moves);
            console.log('  Rating:', newExercise.rating);

            setExercise(newExercise);
            setFen(newExercise.startPosition.fen);
            gameRef.current = new Chess(newExercise.startPosition.fen);
            setFeedback('none');
            setCurrentMoveIndex(0);  // Reset move sequence progress
            setSetupError(null);
        } catch (error) {
            console.error('Error loading exercise:', error);

            // Check if error is due to missing fixtures
            if (error instanceof Error && error.message.includes('No fixture available')) {
                setSetupError(`No ${difficulty} puzzles available for this pattern. Try a different difficulty.`);
            } else {
                setSetupError('Failed to load tactical exercise. Please try again.');
            }
        }
    };

    const t = useTranslation(language);

    // Determine which side is to move from the current position
    const getSideToMove = (): 'white' | 'black' => {
        if (!exercise) return 'white';
        const chess = new Chess(exercise.startPosition.fen);
        return chess.turn() === 'w' ? 'white' : 'black';
    };

    const sideToMove = getSideToMove();

    if (!mounted) return null;

    // Show setup error if puzzles are not configured
    if (setupError) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
                <Header language={language} onLanguageChange={setLanguage} />
                <div className="container mx-auto px-4 py-8">
                    <div className="max-w-2xl mx-auto">
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
                            <div className="flex items-start">
                                <XCircle className="w-6 h-6 text-red-600 dark:text-red-400 mt-0.5 mr-3 flex-shrink-0" />
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-red-900 dark:text-red-100 mb-2">
                                        Setup Required
                                    </h3>
                                    <p className="text-red-800 dark:text-red-200 mb-4">
                                        {setupError}
                                    </p>
                                    <div className="bg-gray-900 dark:bg-gray-950 rounded-lg p-4 mb-4">
                                        <p className="text-sm text-gray-300 mb-2 font-mono">
                                            Run this command in your terminal:
                                        </p>
                                        <code className="text-green-400 font-mono text-sm">
                                            cd chess_tutor && python3 scripts/setup_tactical_puzzles.py
                                        </code>
                                    </div>
                                    <p className="text-sm text-red-700 dark:text-red-300">
                                        This one-time setup will download high-quality tactical puzzles from Lichess.
                                        It may take 5-10 minutes depending on your internet connection.
                                    </p>
                                    <div className="mt-4 flex gap-3">
                                        <button
                                            onClick={() => router.push('/learning')}
                                            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                                        >
                                            ← Back to Learning Area
                                        </button>
                                        <button
                                            onClick={() => window.location.reload()}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                        >
                                            <RefreshCw className="w-4 h-4 inline mr-2" />
                                            Retry
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!exercise) return null;

    const getPatternName = (): string => {
        const mapping: Record<string, keyof typeof t.learning.patterns> = {
            'PIN': 'pin',
            'SKEWER': 'skewer',
            'FORK': 'fork',
            'DISCOVERED_CHECK': 'discoveredCheck',
            'DOUBLE_ATTACK': 'doubleAttack',
            'OVERLOADING': 'overloading',
            'BACK_RANK_WEAKNESS': 'backRankWeakness',
            'TRAPPED_PIECE': 'trappedPiece',
        };
        return t.learning.patterns[mapping[pattern]];
    };

    const onDrop = ({ sourceSquare, targetSquare }: { sourceSquare: string; targetSquare: string | null }) => {
        if (!targetSquare || feedback !== 'none') return false;

        // Additional validation: Check if there's actually a piece on the source square
        const piece = gameRef.current.get(sourceSquare);
        if (!piece) {
            console.warn('⚠️ No piece found on source square:', sourceSquare);
            return false;
        }

        console.log('🎯 Attempting move:', {
            from: sourceSquare,
            to: targetSquare,
            piece: piece.type,
            color: piece.color
        });

        const move = {
            from: sourceSquare,
            to: targetSquare,
            promotion: "q",
        };

        try {
            const result = gameRef.current.move(move);
            if (!result) {
                console.warn('❌ Invalid move attempted:', move);
                return false;
            }

            // Track the user's move for the Tutor (store the full Move object)
            setUserMove(result);

            // Check if this is the correct move in the sequence
            const moves = exercise.moves || [];

            // If no move sequence (old format), fall back to single-move check
            if (moves.length === 0) {
                const isCorrect =
                    result.from === exercise.solutionMove.from &&
                    result.to === exercise.solutionMove.to;

                if (isCorrect) {
                    playMoveSound(!!result.captured);
                    successSound.current?.play().catch(e => console.error("Audio play failed", e));
                    setFeedback('correct');
                    setFen(gameRef.current.fen());

                    // Update stats for correct answer
                    setStats(prev => ({
                        totalCorrect: prev.totalCorrect + 1,
                        totalIncorrect: prev.totalIncorrect,
                        currentStreak: prev.currentStreak + 1,
                        bestStreak: Math.max(prev.bestStreak, prev.currentStreak + 1),
                    }));
                } else {
                    errorSound.current?.play().catch(e => console.error("Audio play failed", e));
                    setFeedback('incorrect');
                    gameRef.current = new Chess(exercise.startPosition.fen);

                    // Update stats for incorrect answer
                    setStats(prev => ({
                        totalCorrect: prev.totalCorrect,
                        totalIncorrect: prev.totalIncorrect + 1,
                        currentStreak: 0,
                        bestStreak: prev.bestStreak,
                    }));
                }
                return true;
            }

            // Multi-move sequence handling
            const expectedMove = moves[currentMoveIndex];

            if (!expectedMove || !expectedMove.player) {
                // This shouldn't happen - we should only be waiting for player moves
                console.error('Unexpected state: waiting for player move but none expected');
                return false;
            }

            // Check if the move matches (compare UCI notation)
            const playerMoveUci = result.from + result.to + (result.promotion || '');
            const isCorrect = playerMoveUci === expectedMove.uci;

            // Debug logging
            console.log('🔍 Move Validation Debug:');
            console.log('  Player move UCI:', playerMoveUci);
            console.log('  Expected move UCI:', expectedMove.uci);
            console.log('  Current move index:', currentMoveIndex);
            console.log('  Is correct?', isCorrect);
            console.log('  Move result:', result);

            if (!isCorrect) {
                errorSound.current?.play().catch(e => console.error("Audio play failed", e));
                setFeedback('incorrect');
                // Reset the board to starting position
                gameRef.current = new Chess(exercise.startPosition.fen);
                setFen(exercise.startPosition.fen);
                setCurrentMoveIndex(0);

                // Update stats for incorrect answer
                setStats(prev => ({
                    totalCorrect: prev.totalCorrect,
                    totalIncorrect: prev.totalIncorrect + 1,
                    currentStreak: 0,
                    bestStreak: prev.bestStreak,
                }));

                return true;
            }

            // Correct move! Play sound and update the board
            playMoveSound(!!result.captured);
            setFen(gameRef.current.fen());

            // Check if this was the last move in the sequence
            if (currentMoveIndex >= moves.length - 1) {
                // Puzzle complete!
                successSound.current?.play().catch(e => console.error("Audio play failed", e));
                setFeedback('correct');

                // Update stats for correct answer (only when puzzle is complete)
                setStats(prev => ({
                    totalCorrect: prev.totalCorrect + 1,
                    totalIncorrect: prev.totalIncorrect,
                    currentStreak: prev.currentStreak + 1,
                    bestStreak: Math.max(prev.bestStreak, prev.currentStreak + 1),
                }));

                return true;
            }

            // More moves to go - make the opponent's response automatically
            const nextMoveIndex = currentMoveIndex + 1;
            const opponentMove = moves[nextMoveIndex];

            if (opponentMove && !opponentMove.player) {
                // Make opponent's move after a short delay
                setTimeout(() => {
                    try {
                        const oppMove = gameRef.current.move(opponentMove.uci);
                        if (oppMove) {
                            // Play sound for opponent's move
                            playMoveSound(!!oppMove.captured);
                            setFen(gameRef.current.fen());
                            setCurrentMoveIndex(nextMoveIndex + 1);  // Ready for next player move
                        }
                    } catch (e) {
                        console.error('Failed to make opponent move:', e);
                    }
                }, 500);  // 500ms delay so user can see their move
            } else {
                // No opponent response - puzzle complete
                successSound.current?.play().catch(e => console.error("Audio play failed", e));
                setFeedback('correct');
            }

            return true;
        } catch (e) {
            return false;
        }
    };

    const handleTryAgain = () => {
        gameRef.current = new Chess(exercise.startPosition.fen);
        setFen(exercise.startPosition.fen);
        setFeedback('none');
        setCurrentMoveIndex(0);  // Reset move sequence progress
        // Don't reset userMove - keep the chat context
        // The Tutor will know the user tried again because feedback changed to 'none'
    };

    const handleSkipPuzzle = () => {
        // Skip counts as incorrect for stats
        setStats(prev => ({
            totalCorrect: prev.totalCorrect,
            totalIncorrect: prev.totalIncorrect + 1,
            currentStreak: 0,
            bestStreak: prev.bestStreak,
        }));
        loadNewExercise();
    };

    const handleNextExercise = () => {
        loadNewExercise();
    };

    return (
        <>
            <Header language={language} />
            <div className="flex-grow bg-gray-100 dark:bg-gray-900 p-4 flex flex-col">
                <div className="max-w-6xl mx-auto w-full">
                    {/* Header */}
                    <div className="mb-8 flex items-center justify-between">
                        <button
                            onClick={() => router.push("/learning")}
                            className="p-2 md:px-4 md:py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 text-sm font-medium transition-colors flex items-center gap-2"
                        >
                            <ArrowLeft size={20} />
                            <span className="hidden md:inline">{t.learning.practice.backToLearning}</span>
                        </button>

                        {/* Difficulty Selector */}
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Difficulty:
                            </span>
                            <div className="flex gap-1 bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
                                <button
                                    onClick={() => {
                                        setDifficulty('easy');
                                        loadNewExercise();
                                    }}
                                    className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                                        difficulty === 'easy'
                                            ? 'bg-green-500 text-white'
                                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                                    }`}
                                >
                                    Easy (800-1400)
                                </button>
                                <button
                                    onClick={() => {
                                        setDifficulty('medium');
                                        loadNewExercise();
                                    }}
                                    className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                                        difficulty === 'medium'
                                            ? 'bg-yellow-500 text-white'
                                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                                    }`}
                                >
                                    Medium (1400-1800)
                                </button>
                                <button
                                    onClick={() => {
                                        setDifficulty('hard');
                                        loadNewExercise();
                                    }}
                                    className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                                        difficulty === 'hard'
                                            ? 'bg-red-500 text-white'
                                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                                    }`}
                                >
                                    Hard (1800-2200)
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Setup Warning Banner */}
                    {showSetupWarning && (
                        <div className="mb-6 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4 rounded-r-lg">
                            <div className="flex items-start">
                                <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="ml-3 flex-1">
                                    <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">
                                        ⚠️ Using basic tactical puzzles
                                    </p>
                                    <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
                                        For better quality puzzles from Lichess (5.6M verified puzzles), run:
                                    </p>
                                    <div className="mt-2 bg-gray-900 dark:bg-gray-950 rounded px-3 py-2">
                                        <code className="text-xs text-green-400 font-mono">
                                            cd chess_tutor && python3 scripts/setup_tactical_puzzles.py
                                        </code>
                                    </div>
                                    <p className="mt-2 text-xs text-yellow-600 dark:text-yellow-400">
                                        One-time setup (~5-10 minutes). Current puzzles will work but may have quality issues.
                                    </p>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowSetupWarning(false);
                                        localStorage.setItem("tactical_puzzles_warning_dismissed", "true");
                                    }}
                                    className="ml-3 flex-shrink-0 text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-200"
                                >
                                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h1 className="text-3xl font-bold mb-2 text-gray-800 dark:text-white">
                                {getPatternName()}
                            </h1>
                            <p className="text-lg text-gray-600 dark:text-gray-400">
                                {t.learning.practice.findTheMove} {getPatternName().toLowerCase()}
                            </p>
                        </div>

                        {/* Puzzle Rating Display */}
                        {exercise.rating && (
                            <div className="flex flex-col items-end">
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                    Puzzle Rating
                                </span>
                                <div className={`text-2xl font-bold ${
                                    exercise.rating < 1400 ? 'text-green-600 dark:text-green-400' :
                                    exercise.rating < 1800 ? 'text-yellow-600 dark:text-yellow-400' :
                                    'text-red-600 dark:text-red-400'
                                }`}>
                                    {exercise.rating}
                                </div>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {exercise.rating < 1400 ? 'Easy' :
                                     exercise.rating < 1800 ? 'Medium' : 'Hard'}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Statistics Display */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                            <div className="text-sm text-gray-500 dark:text-gray-400">Correct</div>
                            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.totalCorrect}</div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                            <div className="text-sm text-gray-500 dark:text-gray-400">Incorrect</div>
                            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.totalIncorrect}</div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                            <div className="text-sm text-gray-500 dark:text-gray-400">Current Streak</div>
                            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.currentStreak}</div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                            <div className="text-sm text-gray-500 dark:text-gray-400">Best Streak</div>
                            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.bestStreak}</div>
                        </div>
                    </div>

                    {/* Main Content Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Chessboard */}
                        <div className="md:col-span-2">
                            <div className="bg-[#779954] p-[2px] rounded-sm max-w-[600px] mx-auto">
                                <Chessboard
                                    key={fen}
                                    options={{
                                        position: fen,
                                        onPieceDrop: ({ sourceSquare, targetSquare }) => {
                                            console.log('🎲 onPieceDrop called with:', { sourceSquare, targetSquare });
                                            return onDrop({ sourceSquare, targetSquare });
                                        },
                                        darkSquareStyle: { backgroundColor: '#779954' },
                                        lightSquareStyle: { backgroundColor: '#e9edcc' },
                                        animationDurationInMs: 200,
                                        boardOrientation: sideToMove
                                    }}
                                />
                            </div>
                        </div>

                        {/* Coach Chat */}
                        <div className="md:col-span-1">
                            {apiKey ? (
                                <Tutor
                                    game={gameRef.current}
                                    currentFen={fen}
                                    userMove={userMove}
                                    computerMove={null}
                                    stockfish={null}
                                    evalP0={null}
                                    evalP2={null}
                                    openingData={[]}
                                    missedTactics={[]}
                                    onAnalysisComplete={() => {}}
                                    apiKey={apiKey}
                                    personality={selectedPersonality}
                                    language={language}
                                    playerColor={sideToMove}
                                    onCheckComputerMove={() => {}}
                                    resignationContext={null}
                                    tacticalPracticeMode={{
                                        patternName: getPatternName(),
                                        solutionMove: exercise.solutionMove,
                                        feedback: feedback,
                                        moves: exercise.moves || [],
                                        currentMoveIndex: currentMoveIndex,
                                        stats: stats,
                                    }}
                                />
                            ) : (
                                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-6">
                                    <div className="text-center">
                                        <div className="text-4xl mb-4">🔑</div>
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                                            API Key Required
                                        </h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                            To chat with your coach, please set up your Gemini API key in the settings.
                                        </p>
                                        <button
                                            onClick={() => router.push('/onboarding')}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                        >
                                            Set Up API Key
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="mt-4 space-y-3">
                                {feedback === 'correct' && (
                                    <button
                                        onClick={handleNextExercise}
                                        className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold shadow-lg transition-all flex items-center justify-center gap-2"
                                    >
                                        <RefreshCw size={18} />
                                        {t.learning.practice.nextExercise}
                                    </button>
                                )}
                                {feedback === 'incorrect' && (
                                    <>
                                        <button
                                            onClick={handleTryAgain}
                                            className="w-full py-3 px-4 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-semibold shadow-lg transition-all flex items-center justify-center gap-2"
                                        >
                                            <RefreshCw size={18} />
                                            {t.learning.practice.tryAgain}
                                        </button>
                                        <button
                                            onClick={handleSkipPuzzle}
                                            className="w-full py-2 px-4 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-medium transition-all flex items-center justify-center gap-2"
                                        >
                                            <SkipForward size={18} />
                                            Skip Puzzle
                                        </button>
                                    </>
                                )}
                                {feedback === 'none' && (
                                    <button
                                        onClick={handleSkipPuzzle}
                                        className="w-full py-2 px-4 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-medium transition-all flex items-center justify-center gap-2"
                                    >
                                        <SkipForward size={18} />
                                        Skip Puzzle
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}


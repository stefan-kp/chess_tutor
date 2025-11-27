"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Chess, Move } from "chess.js";
import { Chessboard } from "react-chessboard";
import { Stockfish, StockfishEvaluation } from "@/lib/stockfish";
import { Tutor } from "./Tutor";
import { EvaluationBar } from "./EvaluationBar";
import { Personality } from "@/lib/personalities";
import Header from "./Header";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { SupportedLanguage } from "@/lib/i18n/translations";
import { lookupOpening, OpeningMetadata } from "@/lib/openings";
import { GameAnalysisModal } from "./GameAnalysisModal";
import { GameOverModal, MoveHistoryItem } from "./GameOverModal";
import { Brain, ArrowLeft } from "lucide-react";
import { CapturedPieces } from "./CapturedPieces";
import { detectMissedTactics, uciToSan, DetectedTactic } from "@/lib/tacticDetection";
import { upsertSavedGame } from "@/lib/savedGames";

interface ChessGameProps {
    gameId: string;
    initialFen?: string;
    initialPgn?: string;
    initialPersonality: Personality;
    initialColor: 'white' | 'black';
    onBack: () => void;
}

const PIECE_VALUES: Record<string, number> = {
    'p': 1,
    'n': 3,
    'b': 3,
    'r': 5,
    'q': 9,
    'k': 0
};

export default function ChessGame({ gameId, initialFen, initialPgn, initialPersonality, initialColor, onBack }: ChessGameProps) {
    const gameRef = useRef(new Chess(initialFen || "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"));
    const [fen, setFen] = useState(gameRef.current.fen());
    const [stockfish, setStockfish] = useState<Stockfish | null>(null);

    // Analysis States
    const [evalP0, setEvalP0] = useState<StockfishEvaluation | null>(null);
    const [evalP2, setEvalP2] = useState<StockfishEvaluation | null>(null);

    // Opening Data
    const [openingData, setOpeningData] = useState<OpeningMetadata | null>(null);

    // Tactical Analysis Data
    const [latestMissedTactics, setLatestMissedTactics] = useState<DetectedTactic[] | null>(null);

    const [userMove, setUserMove] = useState<Move | null>(null);
    const [computerMove, setComputerMove] = useState<Move | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [apiKey, setApiKey] = useState<string | null>(null);
    const [stockfishDepth, setStockfishDepth] = useState(15);

    // Settings
    const [language, setLanguage] = useState<SupportedLanguage>('en');

    // Game State
    const [playerColor, setPlayerColor] = useState<'white' | 'black'>(initialColor);
    const [showAnalysisModal, setShowAnalysisModal] = useState(false);
    const [gameOverState, setGameOverState] = useState<{ result: string, winner: "White" | "Black" | "Draw" } | null>(null);
    const [moveHistory, setMoveHistory] = useState<MoveHistoryItem[]>([]);
    const [selectedPersonality, setSelectedPersonality] = useState<Personality>(initialPersonality);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Sound Refs
    const moveSound = useRef<HTMLAudioElement | null>(null);
    const captureSound = useRef<HTMLAudioElement | null>(null);
    const checkSound = useRef<HTMLAudioElement | null>(null);
    const victorySound = useRef<HTMLAudioElement | null>(null);
    const defeatSound = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        moveSound.current = new Audio('/sounds/move.wav');
        captureSound.current = new Audio('/sounds/capture.wav');
        checkSound.current = new Audio('/sounds/check.wav');
        victorySound.current = new Audio('/sounds/victory.wav');
        defeatSound.current = new Audio('/sounds/defeat.wav');
    }, []);

    const playMoveSound = (captured: boolean) => {
        if (captured) {
            captureSound.current?.play().catch(e => console.error("Audio play failed", e));
        } else {
            moveSound.current?.play().catch(e => console.error("Audio play failed", e));
        }
    };

    // Removed auto-scroll to prevent page jumping when moves are added
    // Users can manually scroll to see move history if needed

    // Captured Pieces State
    const [capturedWhitePieces, setCapturedWhitePieces] = useState<string[]>([]);
    const [capturedBlackPieces, setCapturedBlackPieces] = useState<string[]>([]);
    const [materialScore, setMaterialScore] = useState<{ white: number, black: number }>({ white: 0, black: 0 });

    const t = useTranslation(language);

    // Initialize Stockfish
    useEffect(() => {
        const sf = new Stockfish();
        setStockfish(sf);
        return () => sf.terminate();
    }, []);

    // Load Settings & Initial State
    useEffect(() => {
        const storedKey = localStorage.getItem("gemini_api_key");
        const storedLang = localStorage.getItem("chess_tutor_language");

        if (storedKey) setApiKey(storedKey);
        if (storedLang) setLanguage(storedLang as SupportedLanguage);

        // If initialFen is provided, ensure gameRef is synced
        if (initialFen && initialFen !== gameRef.current.fen()) {
            gameRef.current = new Chess(initialFen);
            setFen(initialFen);
            updateCapturedPieces(); // Update captured pieces for loaded game
        }

        // If initialPgn is provided, load it to restore history
        if (initialPgn) {
            try {
                gameRef.current.loadPgn(initialPgn);
                setFen(gameRef.current.fen());
                updateCapturedPieces();
            } catch (e) {
                console.error("Failed to load PGN:", e);
            }
        }

        // If computer is white (player is black) and it's the start of the game, make a move
        // But only if we are at the start position
        if (initialColor === 'black' &&
            gameRef.current.fen() === "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1" &&
            stockfish) {

            // Small delay to ensure stockfish is ready
            setTimeout(() => {
                stockfish.evaluate(gameRef.current.fen(), 10).then(evalResult => {
                    const computerMoveData = {
                        from: evalResult.bestMove.substring(0, 2),
                        to: evalResult.bestMove.substring(2, 4),
                        promotion: evalResult.bestMove.length > 4 ? evalResult.bestMove.substring(4, 5) : "q"
                    };
                    makeAMove(computerMoveData);
                });
            }, 1000);
        }

    }, [initialFen, initialColor, stockfish]); // Run when these change

    // Save Game State on Change
    useEffect(() => {
        const saveData = {
            id: gameId,
            fen,
            language,
            selectedPersonality,
            apiKey,
            playerColor, // Save player color too
            pgn: gameRef.current.pgn(),
            updatedAt: Date.now(),
            evaluation: evalP0 ? {
                score: evalP0.score,
                mate: evalP0.mate,
                depth: evalP0.depth
            } : null
        };

        upsertSavedGame(saveData);
        localStorage.setItem("chess_tutor_save", JSON.stringify(saveData));
    }, [fen, language, selectedPersonality, apiKey, playerColor, gameId, evalP0]);

    // Game Over Detection
    useEffect(() => {
        const game = gameRef.current;
        if (game.isGameOver()) {
            let result = "";
            let winner: "White" | "Black" | "Draw" = "Draw";

            if (game.isCheckmate()) {
                if (game.turn() === 'w') {
                    result = "Checkmate! You lost.";
                    winner = "Black";
                    if (playerColor === 'white') defeatSound.current?.play().catch(e => console.error(e));
                    else victorySound.current?.play().catch(e => console.error(e));
                } else {
                    result = "Checkmate! You won!";
                    winner = "White";
                    if (playerColor === 'white') victorySound.current?.play().catch(e => console.error(e));
                    else defeatSound.current?.play().catch(e => console.error(e));
                }
            } else if (game.isDraw()) {
                result = "Draw!";
                winner = "Draw";
            } else if (game.isStalemate()) {
                result = "Stalemate!";
                winner = "Draw";
            } else if (game.inCheck()) {
                checkSound.current?.play().catch(e => console.error(e));
            }

            setGameOverState({ result, winner });
        }
    }, [fen, playerColor]);

    // Pre-Analysis (P0)
    useEffect(() => {
        const playerTurn = playerColor === 'white' ? 'w' : 'b';
        if (stockfish && gameRef.current.turn() === playerTurn && !isAnalyzing && !gameOverState) {
            stockfish.evaluate(gameRef.current.fen(), stockfishDepth).then(evalResult => {
                setEvalP0(evalResult);
            }).catch(err => console.error("Pre-analysis failed:", err));
        }
    }, [playerColor, fen, stockfish, stockfishDepth, isAnalyzing, gameOverState]);

    const updateCapturedPieces = useCallback(() => {
        const history = gameRef.current.history({ verbose: true });
        const whitePiecesLost: string[] = [];
        const blackPiecesLost: string[] = [];
        let whiteLostScore = 0;
        let blackLostScore = 0;

        history.forEach(move => {
            if (move.captured) {
                if (move.color === 'w') { // White moved, captured a black piece. So a black piece was lost.
                    blackPiecesLost.push(move.captured);
                    blackLostScore += PIECE_VALUES[move.captured] || 0;
                } else { // Black moved, captured a white piece. So a white piece was lost.
                    whitePiecesLost.push(move.captured);
                    whiteLostScore += PIECE_VALUES[move.captured] || 0;
                }
            }
        });

        setCapturedWhitePieces(whitePiecesLost);
        setCapturedBlackPieces(blackPiecesLost);
        setMaterialScore({ white: whiteLostScore, black: blackLostScore });
    }, []);

    const makeAMove = useCallback(
        (move: { from: string; to: string; promotion?: string }) => {
            try {
                const game = gameRef.current;
                const result = game.move(move);

                if (result) {
                    const newFen = game.fen();
                    setFen(newFen);
                    updateCapturedPieces();
                    playMoveSound(!!result.captured);

                    // If it was computer's move, update state
                    if (game.turn() === 'w') { // Computer just moved (assuming computer is Black? No, wait)
                        // Logic below handles turns
                    }

                    return { result, newFen };
                }
            } catch (e) {
                return null;
            }
            return null;
        },
        [updateCapturedPieces]
    );

    function onDrop({ sourceSquare, targetSquare }: { sourceSquare: string; targetSquare: string | null }) {
        if (!targetSquare || !stockfish || gameOverState) return false;

        // Check if it's the player's turn
        const currentTurn = gameRef.current.turn(); // 'w' or 'b'
        const playerTurn = playerColor === 'white' ? 'w' : 'b';

        if (currentTurn !== playerTurn) {
            // Not the player's turn - prevent move
            return false;
        }

        const move = {
            from: sourceSquare,
            to: targetSquare,
            promotion: "q",
        };

        // Capture FEN BEFORE player's move (P0)
        const fenP0 = gameRef.current.fen();

        // 1. User Move (P0 -> P1)
        const moveResult = makeAMove(move);

        if (!moveResult) return false;

        setUserMove(moveResult.result);

        // Reset Computer State
        setComputerMove(null);
        setEvalP2(null);
        setOpeningData(null);

        setIsAnalyzing(true);
        const { newFen: fenP1 } = moveResult;

        // 2. Bot Move (P1 -> P2)
        stockfish.evaluate(fenP1, stockfishDepth).then(p1Eval => {
            // Store partial history data if evalP0 is available
            const partialHistoryItem = evalP0 ? {
                moveNumber: gameRef.current.moveNumber(),
                playerMove: moveResult.result.san,
                playerColor: playerColor,
                fenBeforePlayerMove: fenP0,
                evalBeforePlayerMove: evalP0,
                fenAfterPlayerMove: fenP1,
                evalAfterPlayerMove: p1Eval,
            } : null;

            // Computer should ALWAYS move, even if evalP0 is missing
            setTimeout(() => {
                const computerMoveData = {
                    from: p1Eval.bestMove.substring(0, 2),
                    to: p1Eval.bestMove.substring(2, 4),
                    promotion: p1Eval.bestMove.length > 4 ? p1Eval.bestMove.substring(4, 5) : "q"
                };

                const compResult = makeAMove(computerMoveData);
                if (compResult) {
                    setComputerMove(compResult.result);
                    const { newFen: fenP2 } = compResult;

                    // 3. Post-Eval (P2)
                    stockfish.evaluate(fenP2, stockfishDepth).then(p2Eval => {
                        setEvalP2(p2Eval);

                        // 4. Opening Lookup
                        const opening = lookupOpening(fenP2);
                        setOpeningData(opening);

                        // 5. Complete the history item with computer's move data (only if we have evalP0)
                        if (partialHistoryItem && evalP0) {
                            const isWhite = playerColor === 'white';
                            const evalBefore = isWhite ? evalP0.score : -evalP0.score;
                            const evalAfterPlayerMove = isWhite ? -p1Eval.score : p1Eval.score;
                            const cpLoss = evalBefore - evalAfterPlayerMove;
                            const bestMoveSan = uciToSan(fenP0, evalP0.bestMove);
                            const missedTactics = detectMissedTactics({
                                fen: fenP0,
                                playerColor,
                                playerMoveSan: moveResult.result.san,
                                bestMoveUci: evalP0.bestMove,
                                cpLoss,
                            });

                            // Store the latest tactics for the Tutor component
                            setLatestMissedTactics(missedTactics);

                            const completeHistoryItem: MoveHistoryItem = {
                                ...partialHistoryItem,
                                computerMove: compResult.result.san,
                                fenAfterComputerMove: fenP2,
                                evalAfterComputerMove: p2Eval,
                                opening: opening?.name,
                                // Legacy fields for backward compatibility
                                move: moveResult.result.san,
                                evalBefore: evalP0.score,
                                evalAfter: p1Eval.score,
                                bestMove: evalP0.bestMove,
                                bestMoveSan,
                                cpLoss,
                                missedTactics,
                            };
                            setMoveHistory(prev => [...prev, completeHistoryItem]);
                        } else {
                            console.warn("Skipping move history - evalP0 was not available when player moved");
                        }

                        setIsAnalyzing(false);
                    }).catch(err => {
                        console.error("P2 analysis failed:", err);
                        setIsAnalyzing(false);
                    });
                } else {
                    setIsAnalyzing(false);
                }
            }, 500);
        }).catch(err => {
            console.error("Bot move analysis failed:", err);
            setIsAnalyzing(false);
        });

        return true;
    }

    // Check if computer needs to move (safety net for race conditions)
    const checkAndMakeComputerMove = useCallback(() => {
        if (!stockfish || gameOverState || isAnalyzing) return;

        const currentTurn = gameRef.current.turn();
        const computerTurn = playerColor === 'white' ? 'b' : 'w';

        // If it's the computer's turn and we're not already analyzing, make a move
        if (currentTurn === computerTurn) {
            console.log("Safety check: Computer's turn detected, making move...");
            setIsAnalyzing(true);

            const currentFen = gameRef.current.fen();
            stockfish.evaluate(currentFen, stockfishDepth).then(evalResult => {
                const computerMoveData = {
                    from: evalResult.bestMove.substring(0, 2),
                    to: evalResult.bestMove.substring(2, 4),
                    promotion: evalResult.bestMove.length > 4 ? evalResult.bestMove.substring(4, 5) : "q"
                };

                const compResult = makeAMove(computerMoveData);
                if (compResult) {
                    setComputerMove(compResult.result);
                    const { newFen } = compResult;

                    // Evaluate the position after computer's move
                    stockfish.evaluate(newFen, stockfishDepth).then(p2Eval => {
                        setEvalP2(p2Eval);
                        const opening = lookupOpening(newFen);
                        setOpeningData(opening);
                        setIsAnalyzing(false);
                    }).catch(err => {
                        console.error("Post-computer-move analysis failed:", err);
                        setIsAnalyzing(false);
                    });
                } else {
                    setIsAnalyzing(false);
                }
            }).catch(err => {
                console.error("Computer move evaluation failed:", err);
                setIsAnalyzing(false);
            });
        }
    }, [stockfish, gameOverState, isAnalyzing, playerColor, stockfishDepth, makeAMove]);

    const handleNewGame = () => {
        // Reset game to initial props or just reload?
        // For now, let's just reset the board
        const newGame = new Chess();
        gameRef.current = newGame;
        setFen(newGame.fen());
        setGameOverState(null);
        setMoveHistory([]);
        setUserMove(null);
        setComputerMove(null);
        setEvalP0(null);
        setEvalP2(null);
        setOpeningData(null);
        updateCapturedPieces();
    };

    // Determine material advantage
    // If Black lost more value, White has advantage
    const whiteAdvantage = materialScore.black - materialScore.white;
    const blackAdvantage = materialScore.white - materialScore.black;

    const [showStrengthSlider, setShowStrengthSlider] = useState(false);

    return (
        <>
            <Header language={language} />
            <div className="flex-grow grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8 w-full max-w-6xl mx-auto p-4">


                {/* 1. Header (Col 1-3) */}
                <div className="md:col-span-3 flex justify-between items-center">
                    <button
                        onClick={onBack}
                        className="p-2 md:px-4 md:py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 text-sm font-medium transition-colors"
                        aria-label={t.game.backToMenu}
                    >
                        <span className="hidden md:inline">{t.game.backToMenu}</span>
                        <ArrowLeft className="md:hidden" size={20} />
                    </button>
                    <div className="text-sm text-gray-500 hidden md:block">
                        {t.game.playingAs} {playerColor === 'white' ? t.game.white : t.game.black} {t.game.vs} {selectedPersonality?.name}
                    </div>
                </div>

                {/* 2. Board Area (Col 1-2) */}
                <div className="md:col-span-2 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg flex flex-col md:flex-row gap-4 relative">
                    {/* Desktop Eval Bar (Vertical) */}
                    <div className="hidden md:block h-[560px]">
                        <EvaluationBar
                            score={isAnalyzing ? null : evalP0?.score}
                            mate={isAnalyzing ? null : evalP0?.mate}
                            isPlayerWhite={playerColor === 'white'}
                            orientation="vertical"
                        />
                    </div>

                    <div className="flex-1 flex flex-col justify-center">
                        {/* Opponent's Captured Pieces (Top) */}
                        <div className="mb-2 h-8">
                            <CapturedPieces
                                captured={playerColor === 'white' ? capturedWhitePieces : capturedBlackPieces}
                                color={playerColor === 'white' ? 'w' : 'b'}
                                score={playerColor === 'white' ? (blackAdvantage > 0 ? blackAdvantage : null) : (whiteAdvantage > 0 ? whiteAdvantage : null)}
                            />
                        </div>

                        <div className="bg-[#779954] p-[2px] rounded-sm">
                            <Chessboard
                                options={{
                                    position: fen,
                                    onPieceDrop: ({ sourceSquare, targetSquare }) => onDrop({ sourceSquare, targetSquare }),
                                    darkSquareStyle: { backgroundColor: '#779954' },
                                    lightSquareStyle: { backgroundColor: '#e9edcc' },
                                    animationDurationInMs: 200,
                                    boardOrientation: playerColor
                                }}
                            />
                        </div>

                        {/* Player's Captured Pieces (Bottom) */}
                        <div className="mt-2 h-8">
                            <CapturedPieces
                                captured={playerColor === 'white' ? capturedBlackPieces : capturedWhitePieces}
                                color={playerColor === 'white' ? 'b' : 'w'}
                                score={playerColor === 'white' ? (whiteAdvantage > 0 ? whiteAdvantage : null) : (blackAdvantage > 0 ? blackAdvantage : null)}
                            />
                        </div>

                        {/* Board Footer: Controls */}
                        <div className="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                            <div className="relative">
                                <button
                                    onClick={() => setShowStrengthSlider(!showStrengthSlider)}
                                    className="hover:text-gray-700 dark:hover:text-gray-200 underline decoration-dotted underline-offset-2"
                                >
                                    Stockfish Level: {stockfishDepth}
                                </button>
                                {showStrengthSlider && (
                                    <div className="absolute bottom-full left-0 mb-2 w-48 bg-white dark:bg-gray-700 p-3 rounded shadow-xl border border-gray-200 dark:border-gray-600 z-10">
                                        <label className="block text-xs font-bold mb-1 text-gray-700 dark:text-gray-200">
                                            Strength (Depth: {stockfishDepth})
                                        </label>
                                        <input
                                            type="range"
                                            min="1"
                                            max="20"
                                            value={stockfishDepth}
                                            onChange={(e) => setStockfishDepth(parseInt(e.target.value))}
                                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-600"
                                        />
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={() => {
                                    const game = gameRef.current;
                                    game.undo();
                                    game.undo();
                                    setFen(game.fen());
                                    setUserMove(null);
                                    setComputerMove(null);
                                    setEvalP0(null);
                                    setEvalP2(null);
                                    setOpeningData(null);
                                    updateCapturedPieces();
                                }}
                                className="flex items-center gap-1 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                            >
                                <ArrowLeft size={12} /> Undo
                            </button>
                        </div>
                    </div>

                    {/* Mobile Eval Bar (Horizontal) */}
                    <div className="md:hidden w-full">
                        <EvaluationBar
                            score={isAnalyzing ? null : evalP0?.score}
                            mate={isAnalyzing ? null : evalP0?.mate}
                            isPlayerWhite={playerColor === 'white'}
                            orientation="horizontal"
                        />
                    </div>
                </div>

                {/* 3. Tutor (Col 3) - Side by side with Board on Desktop */}
                <div className="md:col-span-1 h-[400px] md:h-auto">
                    {/* Note: We rely on Tutor's internal height styling or pass a class.
                         The Tutor component has 'h-[400px] md:h-full'.
                         Since it's in a grid cell that might stretch, 'h-full' should work if the row has height.
                         However, the Board Area defines the row height.
                     */}
                    <Tutor
                        game={gameRef.current}
                        currentFen={fen}
                        userMove={userMove}
                        computerMove={computerMove}
                        stockfish={stockfish}
                        evalP0={evalP0}
                        evalP2={evalP2}
                        openingData={openingData}
                        missedTactics={latestMissedTactics}
                        onAnalysisComplete={() => { }}
                        apiKey={apiKey}
                        personality={selectedPersonality}
                        language={language}
                        playerColor={playerColor}
                        onCheckComputerMove={checkAndMakeComputerMove}
                    />
                </div>

                {/* 4. History (Col 1-3) - Full width at bottom */}
                <div className="md:col-span-3 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Game History</h3>
                        <button
                            onClick={() => setShowAnalysisModal(true)}
                            className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded hover:bg-purple-200 dark:bg-purple-900 dark:text-purple-200 flex items-center gap-1"
                        >
                            <Brain size={12} /> Analyze
                        </button>
                    </div>
                    <div className="overflow-y-auto border border-gray-200 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-900 p-2 max-h-40">
                        <table className="w-full text-sm text-left">
                            <thead>
                                <tr className="text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                                    <th className="py-1 px-2 w-12">#</th>
                                    <th className="py-1 px-2">White</th>
                                    <th className="py-1 px-2">Black</th>
                                    <th className="py-1 px-2 text-center w-20">Eval Δ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {moveHistory.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="py-4 text-center text-gray-500 italic">
                                            No moves yet.
                                        </td>
                                    </tr>
                                ) : (
                                    moveHistory.map((item, idx) => {
                                        // Calculate evaluation change for player's move
                                        const evalBefore = item.evalBeforePlayerMove.score ?? 0;
                                        const evalAfter = item.evalAfterPlayerMove.score ?? 0;
                                        const evalChange = evalAfter - evalBefore;

                                        // Determine color based on evaluation change
                                        // Positive change = good for white, negative = good for black
                                        let evalColor = 'text-gray-500';
                                        if (Math.abs(evalChange) > 50) {
                                            if (item.playerColor === 'white') {
                                                evalColor = evalChange > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
                                            } else {
                                                evalColor = evalChange < 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
                                            }
                                        }

                                        const evalDisplay = evalChange > 0 ? `+${(evalChange / 100).toFixed(1)}` : (evalChange / 100).toFixed(1);

                                        return (
                                            <tr key={idx} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                                                <td className="py-1 px-2 text-gray-500 dark:text-gray-500">{item.moveNumber}.</td>
                                                <td className="py-1 px-2 font-medium text-gray-900 dark:text-gray-200">
                                                    {item.playerColor === 'white' ? item.playerMove : item.computerMove}
                                                </td>
                                                <td className="py-1 px-2 font-medium text-gray-900 dark:text-gray-200">
                                                    {item.playerColor === 'black' ? item.playerMove : item.computerMove}
                                                </td>
                                                <td className={`py-1 px-2 text-center font-mono text-xs ${evalColor}`}>
                                                    {evalDisplay}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                        <div ref={messagesEndRef} />
                    </div>
                </div>
            </div>

            {showAnalysisModal && (
                <GameAnalysisModal
                    fen={fen}
                    stockfish={stockfish}
                    apiKey={apiKey}
                    language={language}
                    onClose={() => setShowAnalysisModal(false)}
                />
            )}

            {gameOverState && (
                <GameOverModal
                    result={gameOverState.result}
                    winner={gameOverState.winner}
                    history={moveHistory}
                    apiKey={apiKey}
                    language={language}
                    onClose={() => setGameOverState(null)}
                    onNewGame={handleNewGame}
                />
            )}
        </>
    );
}

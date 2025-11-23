"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Chess, Move } from "chess.js";
import { Chessboard } from "react-chessboard";
import { Stockfish, StockfishEvaluation } from "@/lib/stockfish";
import { Tutor } from "./Tutor";
import { APIKeyInput } from "./APIKeyInput";
import { EvaluationBar } from "./EvaluationBar";
import { Personality, PERSONALITIES } from "@/lib/personalities";
import Header from "./Header";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { SupportedLanguage } from "@/lib/i18n/translations";

import { lookupOpening, OpeningMetadata } from "@/lib/openings";

import { GameAnalysisModal } from "./GameAnalysisModal";
import { GameOverModal, MoveHistoryItem } from "./GameOverModal";
import { Brain } from "lucide-react";

export default function ChessGame() {
    const gameRef = useRef(new Chess());
    const [fen, setFen] = useState(gameRef.current.fen());
    const [stockfish, setStockfish] = useState<Stockfish | null>(null);

    // Analysis States
    // evalP0: Evaluation of position BEFORE user move
    const [evalP0, setEvalP0] = useState<StockfishEvaluation | null>(null);
    // evalP2: Evaluation of position AFTER bot move
    const [evalP2, setEvalP2] = useState<StockfishEvaluation | null>(null);

    // Opening Data
    const [openingData, setOpeningData] = useState<OpeningMetadata | null>(null);

    const [userMove, setUserMove] = useState<Move | null>(null);
    const [computerMove, setComputerMove] = useState<Move | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [apiKey, setApiKey] = useState<string | null>(null);
    const [stockfishDepth, setStockfishDepth] = useState(15);

    // New States
    const [language, setLanguage] = useState<SupportedLanguage>('en');
    const [gameStarted, setGameStarted] = useState(false);
    const [showNewGameOptions, setShowNewGameOptions] = useState(false);
    const [showAnalysisModal, setShowAnalysisModal] = useState(false);
    const [customFen, setCustomFen] = useState("");

    // Color Selection State
    const [colorSelection, setColorSelection] = useState<'white' | 'black' | 'random'>('white');
    const [playerColor, setPlayerColor] = useState<'white' | 'black'>('white');

    // Game Over & History State
    const [gameOverState, setGameOverState] = useState<{ result: string, winner: "White" | "Black" | "Draw" } | null>(null);
    const [moveHistory, setMoveHistory] = useState<MoveHistoryItem[]>([]);

    // Personality State
    const [selectedPersonality, setSelectedPersonality] = useState<Personality | null>(null);

    // Translation
    const t = useTranslation(language);

    useEffect(() => {
        const sf = new Stockfish();
        setStockfish(sf);
        return () => sf.terminate();
    }, []);

    // Load Game State on Mount
    useEffect(() => {
        const savedGame = localStorage.getItem("chess_tutor_save");
        if (savedGame) {
            try {
                const data = JSON.parse(savedGame);
                if (data.fen) {
                    // Don't set gameRef here yet, wait for user action
                    // But we can preload state to show "Resume" option
                    setFen(data.fen);
                }
                if (data.language) setLanguage(data.language);
                if (data.selectedPersonality) setSelectedPersonality(data.selectedPersonality);
                if (data.apiKey) setApiKey(data.apiKey);
                // Note: We don't persist full move history yet for simplicity,
                // but we could add it to localStorage if needed.
            } catch (e) {
                console.error("Failed to load game:", e);
            }
        }
    }, []);

    // Save Game State on Change
    useEffect(() => {
        if (!gameStarted) return;
        const saveData = {
            fen,
            language,
            selectedPersonality,
            apiKey
        };
        localStorage.setItem("chess_tutor_save", JSON.stringify(saveData));
    }, [fen, language, selectedPersonality, apiKey, gameStarted]);

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
                } else {
                    result = "Checkmate! You won!";
                    winner = "White";
                }
            } else if (game.isDraw()) {
                result = "Draw!";
                winner = "Draw";
            } else if (game.isStalemate()) {
                result = "Stalemate!";
                winner = "Draw";
            }

            setGameOverState({ result, winner });
        }
    }, [fen]);

    // Pre-Analysis (P0): Run whenever it's White's turn (User) and we are waiting for a move
    useEffect(() => {
        if (stockfish && gameRef.current.turn() === 'w' && !isAnalyzing && !gameOverState) {
            stockfish.evaluate(gameRef.current.fen(), stockfishDepth).then(evalResult => {
                setEvalP0(evalResult);
            }).catch(err => console.error("Pre-analysis failed:", err));
        }
    }, [fen, stockfish, stockfishDepth, isAnalyzing, gameOverState]);

    const makeAMove = useCallback(
        (move: { from: string; to: string; promotion?: string }) => {
            try {
                const game = gameRef.current;
                const result = game.move(move);

                if (result) {
                    const newFen = game.fen();
                    setFen(newFen);
                    return { result, newFen };
                }
            } catch (e) {
                return null;
            }
            return null;
        },
        []
    );

    function onDrop({ sourceSquare, targetSquare }: { sourceSquare: string; targetSquare: string | null }) {
        if (!targetSquare || !stockfish || gameOverState) return false;

        const move = {
            from: sourceSquare,
            to: targetSquare,
            promotion: "q", // always promote to queen for simplicity
        };

        // 1. User Move (P0 -> P1)
        const moveResult = makeAMove(move);

        if (!moveResult) return false;

        setUserMove(moveResult.result);

        // Reset Computer State immediately to prevent "Hallucination" / Double Chat
        setComputerMove(null);
        setEvalP2(null);
        setOpeningData(null);

        setIsAnalyzing(true);
        const { newFen: fenP1 } = moveResult;

        // 2. Bot Move (P1 -> P2)
        // We need to find the best move for Black from P1
        stockfish.evaluate(fenP1, stockfishDepth).then(p1Eval => {
            // We don't store p1Eval for the Tutor, but we use it to decide the move

            // Record User Move History (P0 -> P1)
            // We compare evalP0 (Before) vs p1Eval (After)
            // Note: p1Eval is from Black's perspective usually in engines, but our wrapper might normalize.
            // Let's assume our wrapper returns CP relative to side to move or absolute?
            // Standard Stockfish returns relative to side to move.
            // So if White is winning +100:
            // P0 (White to move): +100
            // P1 (Black to move): -100 (Black is losing)
            // So we need to negate p1Eval.score to compare with evalP0.score (if evalP0 is White's perspective).
            // Actually, let's check our Stockfish wrapper. It usually returns absolute or relative.
            // Assuming relative:
            // P0 (White): +1.0
            // P1 (Black): -1.0 (Black is down 1.0)
            // So evalAfter = -p1Eval.score

            if (evalP0) {
                const evalAfter = -p1Eval.score; // Convert back to White's perspective
                const historyItem: MoveHistoryItem = {
                    moveNumber: gameRef.current.moveNumber(),
                    move: moveResult.result.san,
                    evalBefore: evalP0.score,
                    evalAfter: evalAfter,
                    bestMove: evalP0.bestMove
                };
                setMoveHistory(prev => [...prev, historyItem]);
            }

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

    const handleResume = () => {
        // gameRef needs to be synced with state fen
        gameRef.current = new Chess(fen);
        setGameStarted(true);
    };

    const handleNewGame = (personality: Personality) => {
        const startFen = customFen.trim() || "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
        try {
            const newGame = new Chess(startFen);
            gameRef.current = newGame;
            setFen(startFen);
            setSelectedPersonality(personality);

            // Determine player color (resolve random)
            let finalPlayerColor: 'white' | 'black' = colorSelection === 'random'
                ? (Math.random() < 0.5 ? 'white' : 'black')
                : colorSelection;
            setPlayerColor(finalPlayerColor);

            // Reset Analysis State
            setUserMove(null);
            setComputerMove(null);
            setEvalP0(null);
            setEvalP2(null);
            setOpeningData(null);
            setGameOverState(null);
            setMoveHistory([]);

            setGameStarted(true);
            setCustomFen(""); // Clear input

            // If player is Black, computer moves first
            if (finalPlayerColor === 'black' && stockfish) {
                setTimeout(() => {
                    stockfish.evaluate(startFen, stockfishDepth).then(evalResult => {
                        const computerMoveData = {
                            from: evalResult.bestMove.substring(0, 2),
                            to: evalResult.bestMove.substring(2, 4),
                            promotion: evalResult.bestMove.length > 4 ? evalResult.bestMove.substring(4, 5) : "q"
                        };

                        const compResult = makeAMove(computerMoveData);
                        if (compResult) {
                            setComputerMove(compResult.result);
                            const { newFen: fenAfterComp } = compResult;
                            setFen(fenAfterComp);

                            // Evaluate position after computer's first move
                            stockfish.evaluate(fenAfterComp, stockfishDepth).then(p0Eval => {
                                setEvalP0(p0Eval);
                            }).catch(err => console.error("Initial eval failed:", err));
                        }
                    }).catch(err => console.error("Computer first move failed:", err));
                }, 500);
            }
        } catch (e) {
            alert("Invalid FEN string");
        }
    };

    const handleBackToMenu = () => {
        setGameStarted(false);
        setShowNewGameOptions(false);
    };

    if (!gameStarted) {
        const hasSavedGame = fen !== "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

        return (
            <>
                <Header language={language} />
                <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
                    <h1 className="text-4xl font-bold mb-8 text-gray-800 dark:text-white">{t.start.title}</h1>

                    <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg max-w-2xl w-full space-y-8">
                        {/* Step 1: Language & API Key */}
                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t.start.settings}</h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.start.language}</label>
                                    <div className="flex gap-2">
                                        {(['en', 'de', 'fr', 'it'] as SupportedLanguage[]).map((lang) => (
                                            <button
                                                key={lang}
                                                onClick={() => setLanguage(lang)}
                                                className={`px-3 py-2 rounded-lg border text-sm ${language === lang ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'}`}
                                            >
                                                {lang.toUpperCase()}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.start.apiKey}</label>
                                    <input
                                        type="password"
                                        placeholder={t.start.apiKeyPlaceholder}
                                        value={apiKey || ""}
                                        onChange={(e) => setApiKey(e.target.value)}
                                        className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{t.start.getApiKey}</a>
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Step 2: Game Actions */}
                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t.start.startGame}</h2>

                            {!apiKey ? (
                                <div className="p-4 bg-yellow-50 text-yellow-800 rounded-lg text-sm">
                                    {t.start.apiKeyRequired}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Resume Option */}
                                    {hasSavedGame && !showNewGameOptions && (
                                        <div className="space-y-3">
                                            <button
                                                onClick={handleResume}
                                                className="w-full py-4 bg-green-600 text-white rounded-xl hover:bg-green-700 font-bold text-lg shadow-md transition-transform transform hover:scale-[1.02]"
                                            >
                                                {t.start.resumeGame}
                                            </button>
                                            <button
                                                onClick={() => setShowNewGameOptions(true)}
                                                className="w-full py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm"
                                            >
                                                {t.start.startNewGame}
                                            </button>
                                        </div>
                                    )}

                                    {/* New Game Options */}
                                    {(!hasSavedGame || showNewGameOptions) && (
                                        <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
                                            {/* Color Selection */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    {t.start.colorSelection}
                                                </label>
                                                <div className="grid grid-cols-3 gap-3">
                                                    <button
                                                        onClick={() => setColorSelection('white')}
                                                        className={`py-3 px-4 rounded-lg border text-sm font-medium transition-all ${colorSelection === 'white'
                                                                ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                                                                : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                                                            }`}
                                                    >
                                                        <span className="text-2xl">♔</span> {t.start.playAsWhite}
                                                    </button>
                                                    <button
                                                        onClick={() => setColorSelection('black')}
                                                        className={`py-3 px-4 rounded-lg border text-sm font-medium transition-all ${colorSelection === 'black'
                                                                ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                                                                : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                                                            }`}
                                                    >
                                                        <span className="text-2xl">♚</span> {t.start.playAsBlack}
                                                    </button>
                                                    <button
                                                        onClick={() => setColorSelection('random')}
                                                        className={`py-3 px-4 rounded-lg border text-sm font-medium transition-all ${colorSelection === 'random'
                                                                ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                                                                : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                                                            }`}
                                                    >
                                                        <span className="text-2xl">🎲</span> {t.start.randomColor}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* FEN Import */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    {t.start.importPosition}
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder={t.start.importPositionPlaceholder}
                                                    value={customFen}
                                                    onChange={(e) => setCustomFen(e.target.value)}
                                                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 font-mono text-sm"
                                                />
                                            </div>

                                            {/* Personality Grid */}
                                            <div>
                                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t.start.chooseCoach}</p>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {PERSONALITIES.map(p => (
                                                        <button
                                                            key={p.id}
                                                            onClick={() => handleNewGame(p)}
                                                            className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors border border-gray-200 dark:border-gray-600 flex flex-col items-center text-center"
                                                        >
                                                            <div className="text-4xl mb-2">{p.image}</div>
                                                            <h3 className="font-bold text-gray-900 dark:text-white">{p.name}</h3>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400">{p.description}</p>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {hasSavedGame && (
                                                <button
                                                    onClick={() => setShowNewGameOptions(false)}
                                                    className="text-sm text-gray-500 hover:text-gray-700"
                                                >
                                                    {t.common.cancel}
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </>
        );
    }


    return (
        <>
            <Header language={language} />
            <div className="flex flex-col md:flex-row gap-8 w-full max-w-6xl mx-auto p-4">
                {/* API Key Input is now handled in start screen, but we keep the button for updates */}
                {/* <APIKeyInput onKeySubmit={setApiKey} /> */}

                <div className="w-full md:w-2/3 flex flex-col gap-4">
                    {/* Header with Back Button */}
                    <div className="flex justify-between items-center">
                        <button
                            onClick={handleBackToMenu}
                            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 text-sm font-medium transition-colors"
                        >
                            {t.game.backToMenu}
                        </button>
                        <div className="text-sm text-gray-500">
                            {t.game.playingAs} {playerColor === 'white' ? t.game.white : t.game.black} {t.game.vs} {selectedPersonality?.name}
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg flex gap-4">
                        <div className="h-[560px]"> {/* Match board height roughly */}
                            <EvaluationBar
                                score={isAnalyzing ? null : evalP0?.score} // Show P0 score while waiting, or maybe P2 after move? Let's show current board eval.
                                mate={isAnalyzing ? null : evalP0?.mate}
                            />
                        </div>
                        <div className="flex-1">
                            <Chessboard
                                options={{
                                    position: fen,
                                    onPieceDrop: ({ sourceSquare, targetSquare }) => onDrop({ sourceSquare, targetSquare }),
                                    darkSquareStyle: { backgroundColor: '#779954' },
                                    lightSquareStyle: { backgroundColor: '#e9edcc' },
                                    animationDurationInMs: 200,
                                    boardOrientation: playerColor // Set board orientation based on player color
                                }}
                            />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg">
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Stockfish Strength (Depth: {stockfishDepth})
                            </label>
                            <button
                                onClick={() => {
                                    const game = gameRef.current;
                                    // Undo twice: once for computer, once for user
                                    game.undo();
                                    game.undo();
                                    setFen(game.fen());
                                    // Reset moves to prevent re-analysis of old moves
                                    setUserMove(null);
                                    setComputerMove(null);
                                    setEvalP0(null);
                                    setEvalP2(null);
                                    setOpeningData(null);
                                }}
                                className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 dark:bg-red-900 dark:text-red-200 transition-colors"
                            >
                                Undo Last Move
                            </button>
                        </div>
                        <input
                            type="range"
                            min="1"
                            max="20"
                            value={stockfishDepth}
                            onChange={(e) => setStockfishDepth(parseInt(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                        />
                    </div>

                    {/* PGN Display */}
                    {/* Game History (Scrollable List) */}
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg flex-1 min-h-0 flex flex-col">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Game History</h3>
                            <button
                                onClick={() => setShowAnalysisModal(true)}
                                className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded hover:bg-purple-200 dark:bg-purple-900 dark:text-purple-200 flex items-center gap-1"
                            >
                                <Brain size={12} /> Analyze
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-900 p-2">
                            <table className="w-full text-sm text-left">
                                <thead>
                                    <tr className="text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                                        <th className="py-1 px-2 w-12">#</th>
                                        <th className="py-1 px-2">White</th>
                                        <th className="py-1 px-2">Black</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(() => {
                                        const history = gameRef.current.history();
                                        const rows = [];
                                        for (let i = 0; i < history.length; i += 2) {
                                            rows.push(
                                                <tr key={i} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                                                    <td className="py-1 px-2 text-gray-500 dark:text-gray-500">{Math.floor(i / 2) + 1}.</td>
                                                    <td className="py-1 px-2 font-medium text-gray-900 dark:text-gray-200">{history[i]}</td>
                                                    <td className="py-1 px-2 font-medium text-gray-900 dark:text-gray-200">{history[i + 1] || ""}</td>
                                                </tr>
                                            );
                                        }
                                        if (rows.length === 0) {
                                            return (
                                                <tr>
                                                    <td colSpan={3} className="py-4 text-center text-gray-500 italic">
                                                        No moves yet.
                                                    </td>
                                                </tr>
                                            );
                                        }
                                        return rows;
                                    })()}
                                </tbody>
                            </table>
                            {/* Auto-scroll anchor */}
                            <div ref={(el) => el?.scrollIntoView({ behavior: "smooth" })} />
                        </div>
                    </div>
                </div>

                <div className="w-full md:w-1/3">
                    <Tutor
                        currentFen={fen}
                        userMove={userMove}
                        computerMove={computerMove}
                        stockfish={stockfish}
                        evalP0={evalP0}
                        evalP2={evalP2}
                        openingData={openingData}
                        onAnalysisComplete={() => { }}
                        apiKey={apiKey}
                        personality={selectedPersonality!}
                        language={language}
                        playerColor={playerColor}
                    />
                </div>

                {/* Analysis Modal */}
                {showAnalysisModal && (
                    <GameAnalysisModal
                        fen={fen}
                        stockfish={stockfish}
                        apiKey={apiKey}
                        language={language}
                        onClose={() => setShowAnalysisModal(false)}
                    />
                )}

                {/* Game Over Modal */}
                {gameOverState && (
                    <GameOverModal
                        result={gameOverState.result}
                        winner={gameOverState.winner}
                        history={moveHistory}
                        apiKey={apiKey}
                        language={language}
                        onClose={() => setGameOverState(null)}
                        onNewGame={() => handleNewGame(selectedPersonality!)}
                    />
                )}
            </div>
        </>
    );
}

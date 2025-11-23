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
import { Brain } from "lucide-react";
import { CapturedPieces } from "./CapturedPieces";

interface ChessGameProps {
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

export default function ChessGame({ initialFen, initialPgn, initialPersonality, initialColor, onBack }: ChessGameProps) {
    const gameRef = useRef(new Chess(initialFen || "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"));
    const [fen, setFen] = useState(gameRef.current.fen());
    const [stockfish, setStockfish] = useState<Stockfish | null>(null);

    // Analysis States
    const [evalP0, setEvalP0] = useState<StockfishEvaluation | null>(null);
    const [evalP2, setEvalP2] = useState<StockfishEvaluation | null>(null);

    // Opening Data
    const [openingData, setOpeningData] = useState<OpeningMetadata | null>(null);

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
            fen,
            language,
            selectedPersonality,
            apiKey,
            apiKey,
            playerColor, // Save player color too
            pgn: gameRef.current.pgn()
        };
        localStorage.setItem("chess_tutor_save", JSON.stringify(saveData));
    }, [fen, language, selectedPersonality, apiKey, playerColor]);

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

    // Pre-Analysis (P0)
    useEffect(() => {
        if (stockfish && gameRef.current.turn() === 'w' && !isAnalyzing && !gameOverState) {
            stockfish.evaluate(gameRef.current.fen(), stockfishDepth).then(evalResult => {
                setEvalP0(evalResult);
            }).catch(err => console.error("Pre-analysis failed:", err));
        }
    }, [fen, stockfish, stockfishDepth, isAnalyzing, gameOverState]);

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

        const move = {
            from: sourceSquare,
            to: targetSquare,
            promotion: "q",
        };

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
            if (evalP0) {
                const evalAfter = -p1Eval.score;
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

    return (
        <>
            <Header language={language} />
            <div className="flex-grow flex flex-col md:flex-row gap-8 w-full max-w-6xl mx-auto p-4">
                <div className="w-full md:w-2/3 flex flex-col gap-4">
                    {/* Header with Back Button */}
                    <div className="flex justify-between items-center">
                        <button
                            onClick={onBack}
                            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 text-sm font-medium transition-colors"
                        >
                            {t.game.backToMenu}
                        </button>
                        <div className="text-sm text-gray-500">
                            {t.game.playingAs} {playerColor === 'white' ? t.game.white : t.game.black} {t.game.vs} {selectedPersonality?.name}
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg flex gap-4">
                        <div className="h-[560px]">
                            <EvaluationBar
                                score={isAnalyzing ? null : evalP0?.score}
                                mate={isAnalyzing ? null : evalP0?.mate}
                                isPlayerWhite={playerColor === 'white'}
                            />
                        </div>
                        <div className="flex-1 flex flex-col justify-center">
                            {/* Opponent's Captured Pieces (Top) */}
                            <div className="mb-2 h-8">
                                <CapturedPieces
                                    captured={playerColor === 'white' ? capturedWhitePieces : capturedBlackPieces}
                                    color={playerColor === 'white' ? 'w' : 'b'} // If player is white, opponent is black. Show White's lost pieces (capturedWhitePieces)
                                    score={playerColor === 'white' ? (blackAdvantage > 0 ? blackAdvantage : null) : (whiteAdvantage > 0 ? whiteAdvantage : null)}
                                />
                            </div>

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

                            {/* Player's Captured Pieces (Bottom) */}
                            <div className="mt-2 h-8">
                                <CapturedPieces
                                    captured={playerColor === 'white' ? capturedBlackPieces : capturedWhitePieces}
                                    color={playerColor === 'white' ? 'b' : 'w'} // If player is white, show Black's lost pieces (capturedBlackPieces)
                                    score={playerColor === 'white' ? (whiteAdvantage > 0 ? whiteAdvantage : null) : (blackAdvantage > 0 ? blackAdvantage : null)}
                                />
                            </div>
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
                        personality={selectedPersonality}
                        language={language}
                        playerColor={playerColor}
                    />
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
            </div>
        </>
    );
}

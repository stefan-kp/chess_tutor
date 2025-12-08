'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Chess } from 'chess.js';
import {
  TrainingSession,
  MoveHistoryEntry,
  MoveFeedback,
} from '@/types/openingTraining';
import { StockfishEvaluation } from '@/lib/stockfish';
import { createEngine, ChessEngine } from '@/lib/engine';
import { OpeningMetadata } from '@/lib/openings';
import {
  createSession,
  loadSession,
  saveSession,
  updateSession,
} from '@/lib/openingTrainer/sessionManager';
import { evaluatePosition } from '@/lib/openingTrainer/engineService';
import { classifyMove } from '@/lib/openingTrainer/moveValidator';
import {
  getExpectedNextMoves,
  detectTransposition,
  getOpponentNextMove,
  isOpponentTurn,
  getUserColor,
  isEndOfRepertoire,
  parseMoveSequence,
} from '@/lib/openingTrainer/repertoireNavigation';
import { STARTING_FEN } from '@/lib/openingTrainer/constants';
import {
  buildExplanationPrompt,
  buildTranspositionPrompt,
  ExplanationPromptContext,
} from '@/lib/openingTrainer/feedbackGenerator';

/**
 * Context for managing opening training session state
 */

interface OpeningTrainingContextType {
  session: TrainingSession | null;
  opening: OpeningMetadata | null;
  chess: Chess | null;
  stockfish: ChessEngine | null;
  isLoading: boolean;
  error: string | null;
  currentFeedback: MoveFeedback | null;

  // Actions
  initializeSession: (opening: OpeningMetadata, forceNew?: boolean) => Promise<void>;
  makeMove: (san: string) => Promise<void>;
  navigateToMove: (index: number) => void;
  resetSession: () => void;
}

const OpeningTrainingContext = createContext<OpeningTrainingContextType | undefined>(
  undefined
);

interface OpeningTrainingProviderProps {
  children: ReactNode;
  openingId?: string;
}

export function OpeningTrainingProvider({
  children,
  openingId,
}: OpeningTrainingProviderProps) {
  const [session, setSession] = useState<TrainingSession | null>(null);
  const [opening, setOpening] = useState<OpeningMetadata | null>(null);
  const [chess, setChess] = useState<Chess | null>(null);
  const [stockfish, setStockfish] = useState<ChessEngine | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentFeedback, setCurrentFeedback] = useState<MoveFeedback | null>(null);

  // Cache for move feedback (indexed by move index)
  const [feedbackCache, setFeedbackCache] = useState<Map<number, MoveFeedback>>(
    new Map()
  );

  // Track if we've already made the automatic move for this session state
  // This prevents duplicate moves when the effect re-runs
  const lastAutoMoveState = React.useRef<string | null>(null);

  // Initialize chess engine (local or remote based on environment)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      createEngine().then((engine) => {
        setStockfish(engine);
      }).catch((err) => {
        console.error('Failed to create chess engine:', err);
        setError('Failed to initialize chess engine');
      });

      return () => {
        // Cleanup will happen when stockfish changes
      };
    }
  }, []);

  // Cleanup engine when it changes or component unmounts
  useEffect(() => {
    return () => {
      if (stockfish) {
        stockfish.terminate();
      }
    };
  }, [stockfish]);

  // Initialize chess instance
  useEffect(() => {
    if (session) {
      const chessInstance = new Chess(session.currentFEN);
      setChess(chessInstance);
    } else {
      setChess(null);
    }
  }, [session]);

  // Make automatic opponent move when needed
  useEffect(() => {
    if (!session || !opening || !chess || !stockfish) return;

    // Create a state key to track if we've already handled this exact state
    const stateKey = `${session.openingId}-${session.moveHistory.length}-${session.currentMoveIndex}`;

    // Check if we've already processed this state
    if (lastAutoMoveState.current === stateKey) {
      return;
    }

    // Case 1: Fresh start - opponent makes first move if they should (user is Black)
    const shouldMakeFirstMove =
      session.moveHistory.length === 0 &&
      session.currentMoveIndex === 0 &&
      isOpponentTurn(opening, 0);

    // Case 2: Resumed session - check if it's opponent's turn at current position
    // Only if we're at the end of the move history (not navigating back in time)
    const isAtEndOfHistory = session.currentMoveIndex === session.moveHistory.length;
    const shouldContinueResumedSession =
      session.moveHistory.length > 0 &&
      isAtEndOfHistory &&
      isOpponentTurn(opening, session.moveHistory.length);

    console.log('[OpeningTraining] Checking if opponent should move:', {
      shouldMakeFirstMove,
      shouldContinueResumedSession,
      moveHistoryLength: session.moveHistory.length,
      currentMoveIndex: session.currentMoveIndex,
      isAtEndOfHistory,
      isOpponentTurnNow: isOpponentTurn(opening, session.moveHistory.length),
      stateKey,
      lastState: lastAutoMoveState.current
    });

    if (shouldMakeFirstMove || shouldContinueResumedSession) {
      // Mark this state as processed
      lastAutoMoveState.current = stateKey;

      const reason = shouldMakeFirstMove ? 'first move' : 'resumed session';
      console.log(`[OpeningTraining] Making automatic opponent move (${reason})`);

      setTimeout(() => {
        makeAutomaticOpponentMove(session, opening);
      }, 800);
    }
  }, [session?.openingId, session?.moveHistory?.length, session?.currentMoveIndex, opening?.eco, chess, stockfish]);

  /**
   * Initialize a new training session for an opening
   */
  const initializeSession = async (
    openingMetadata: OpeningMetadata,
    forceNew: boolean = false
  ) => {
    const perfStart = performance.now();
    setIsLoading(true);
    setError(null);

    try {
      // Try to load existing session (unless forceNew is true)
      let existingSession = forceNew ? null : loadSession(openingMetadata.eco);

      if (existingSession && !forceNew) {
        // Resume existing session
        setSession(existingSession);
        setOpening(openingMetadata);
      } else {
        // Create new session
        const newSession = createSession(
          openingMetadata.eco,
          openingMetadata.name,
          STARTING_FEN,
          0
        );

        // Get initial evaluation
        if (stockfish) {
          const initialEval = await evaluatePosition(STARTING_FEN, stockfish);
          newSession.initialEvaluation = initialEval.score;
        }

        setSession(newSession);
        setOpening(openingMetadata);
        saveSession(newSession);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize session');
    } finally {
      setIsLoading(false);
      const perfEnd = performance.now();
      console.log(
        `[Performance] Session initialization: ${(perfEnd - perfStart).toFixed(0)}ms`
      );
    }
  };

  /**
   * Make a move in the training session
   */
  const makeMove = async (san: string) => {
    console.log('[OpeningTraining] makeMove called with:', san);

    if (!session || !opening || !chess || !stockfish) {
      console.error('[OpeningTraining] Session not initialized:', { session: !!session, opening: !!opening, chess: !!chess, stockfish: !!stockfish });
      setError('Session not initialized');
      return;
    }

    const perfStart = performance.now();
    setIsLoading(true);
    setError(null);

    try {
      // If we've navigated back in history, truncate moves after current position
      // This allows the user to try a different move
      const isNavigatedBack = session.currentMoveIndex < session.moveHistory.length;
      const truncatedHistory = isNavigatedBack
        ? session.moveHistory.slice(0, session.currentMoveIndex)
        : session.moveHistory;

      if (isNavigatedBack) {
        console.log('[OpeningTraining] User navigated back and making new move. Truncating history from', session.moveHistory.length, 'to', truncatedHistory.length);
      }

      // Validate and make the move
      console.log('[OpeningTraining] Attempting to make move:', san);
      const move = chess.move(san);
      if (!move) {
        console.error('[OpeningTraining] Illegal move:', san);
        setError('Illegal move');
        setIsLoading(false);
        return;
      }

      console.log('[OpeningTraining] Move successful:', move);

      const newFEN = chess.fen();

      // Get previous evaluation (from last move or initial)
      const previousEval =
        truncatedHistory.length > 0
          ? truncatedHistory[truncatedHistory.length - 1].evaluation
          : { score: session.initialEvaluation, bestMove: '', ponder: null, mate: null, depth: 0 };

      // Evaluate new position
      const evalStart = performance.now();
      const currentEval = await evaluatePosition(newFEN, stockfish);
      const evalTime = performance.now() - evalStart;
      console.log(`[Performance] Engine evaluation: ${evalTime.toFixed(0)}ms`);

      // Check if move is in repertoire (use truncated history length for position)
      const expectedMoves = getExpectedNextMoves(opening, truncatedHistory.length);
      const isInRepertoire = expectedMoves.includes(san);

      // Check for transposition (if user is off-book, see if they've transposed back)
      let transposedOpening: OpeningMetadata | null = null;
      if (session.deviationMoveIndex !== null && !isInRepertoire) {
        transposedOpening = detectTransposition(newFEN);
      }

      // Classify the move
      const classification = classifyMove(
        san,
        isInRepertoire,
        previousEval as StockfishEvaluation,
        currentEval,
        expectedMoves
      );

      // Create move history entry
      const moveEntry: MoveHistoryEntry = {
        moveNumber: Math.floor(truncatedHistory.length / 2) + 1,
        color: move.color === 'w' ? 'white' : 'black',
        san: move.san,
        uci: move.from + move.to + (move.promotion || ''),
        fen: newFEN,
        evaluation: currentEval,
        classification,
        timestamp: Date.now(),
      };

      // Update session with truncated history + new move
      const updatedSession = {
        ...session,
        currentFEN: newFEN,
        currentMoveIndex: truncatedHistory.length + 1,
        moveHistory: [...truncatedHistory, moveEntry],
        deviationMoveIndex:
          !isInRepertoire && (session.deviationMoveIndex === null || isNavigatedBack)
            ? truncatedHistory.length
            : isNavigatedBack
            ? null  // Reset deviation if we're replaying from earlier point
            : session.deviationMoveIndex,
      };

      console.log('[OpeningTraining] Updating session with new move. Move history length:', updatedSession.moveHistory.length);
      setSession(updatedSession);
      updateSession(updatedSession);

      // Create initial feedback (without LLM explanation)
      const initialFeedback: MoveFeedback = {
        move: moveEntry,
        classification,
        evaluation: currentEval,
        previousEvaluation: previousEval as StockfishEvaluation,
        llmExplanation: '', // Will be populated asynchronously
        generatedAt: Date.now(),
      };

      // Cache the initial feedback
      const moveIndex = updatedSession.moveHistory.length - 1;
      setFeedbackCache((prev) => {
        const newCache = new Map(prev);
        newCache.set(moveIndex, initialFeedback);
        return newCache;
      });

      setCurrentFeedback(initialFeedback);
      setIsLoading(false);

      const feedbackTime = performance.now() - perfStart;
      console.log(
        `[Performance] Move processing (engine + classification): ${feedbackTime.toFixed(0)}ms`
      );

      // Generate LLM explanation asynchronously (don't block user)
      generateLLMExplanation(
        initialFeedback,
        updatedSession,
        moveIndex,
        session.deviationMoveIndex === null &&
          !isInRepertoire &&
          updatedSession.deviationMoveIndex !== null,
        transposedOpening
      );

      // After user's move, check if we should make automatic opponent move
      // Only if: move was in theory, and it's opponent's turn next
      const shouldMakeOpponentMove = isInRepertoire && isOpponentTurn(opening, updatedSession.moveHistory.length);
      console.log('[OpeningTraining] Should make opponent move?', shouldMakeOpponentMove, {
        isInRepertoire,
        isOpponentTurn: isOpponentTurn(opening, updatedSession.moveHistory.length),
        moveHistoryLength: updatedSession.moveHistory.length
      });

      if (shouldMakeOpponentMove) {
        // Add delay for natural feel (600ms)
        console.log('[OpeningTraining] Scheduling automatic opponent move in 600ms');
        setTimeout(() => {
          makeAutomaticOpponentMove(updatedSession, opening);
        }, 600);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process move');
      setIsLoading(false);
    }
  };

  /**
   * Make automatic opponent move from repertoire
   */
  const makeAutomaticOpponentMove = async (
    currentSession: TrainingSession,
    openingMetadata: OpeningMetadata
  ) => {
    if (!chess || !stockfish) return;

    try {
      // Get opponent's next move from repertoire
      const opponentMove = getOpponentNextMove(
        openingMetadata,
        currentSession.moveHistory.length
      );

      if (!opponentMove) {
        // No opponent move available (end of repertoire)
        console.log('[AutoMove] End of repertoire - no opponent move available');
        console.log('[AutoMove] Repertoire moves:', parseMoveSequence(openingMetadata.moves));
        console.log('[AutoMove] Current move index:', currentSession.moveHistory.length);

        // Mark that we've reached the end of repertoire
        const updatedSession = {
          ...currentSession,
          // Could add a flag here if needed for UI indication
        };
        setSession(updatedSession);

        return;
      }

      // Check if we've reached end of repertoire after this move
      const willReachEnd = isEndOfRepertoire(openingMetadata, currentSession.moveHistory.length + 1);
      if (willReachEnd) {
        console.log('[AutoMove] This will be the last repertoire move');
      }

      // Make the move on the chess instance
      const move = chess.move(opponentMove);
      if (!move) {
        console.error('[AutoMove] Failed to make opponent move:', opponentMove);
        return;
      }

      const newFEN = chess.fen();

      // Get previous evaluation
      const previousEval =
        currentSession.moveHistory.length > 0
          ? currentSession.moveHistory[currentSession.moveHistory.length - 1].evaluation
          : { score: currentSession.initialEvaluation, bestMove: '', ponder: null, mate: null, depth: 0 };

      // Evaluate new position
      const currentEval = await evaluatePosition(newFEN, stockfish);

      // Classify the move (should always be "in-theory" for automatic moves)
      const expectedMoves = [opponentMove];
      const classification = classifyMove(
        opponentMove,
        true, // Always in repertoire
        previousEval as StockfishEvaluation,
        currentEval,
        expectedMoves
      );

      // Create move history entry
      const moveEntry: MoveHistoryEntry = {
        moveNumber: Math.floor(currentSession.moveHistory.length / 2) + 1,
        color: move.color === 'w' ? 'white' : 'black',
        san: move.san,
        uci: move.from + move.to + (move.promotion || ''),
        fen: newFEN,
        evaluation: currentEval,
        classification,
        timestamp: Date.now(),
      };

      // Update session
      const updatedSession = {
        ...currentSession,
        currentFEN: newFEN,
        currentMoveIndex: currentSession.moveHistory.length + 1,
        moveHistory: [...currentSession.moveHistory, moveEntry],
      };

      setSession(updatedSession);
      updateSession(updatedSession);

      console.log(`[AutoMove] Played ${opponentMove} automatically`);
    } catch (error) {
      console.error('[AutoMove] Error making automatic opponent move:', error);
    }
  };

  /**
   * Generate LLM explanation for a move asynchronously
   */
  const generateLLMExplanation = async (
    feedback: MoveFeedback,
    currentSession: TrainingSession,
    moveIndex: number,
    isDeviationMove: boolean,
    transposedOpening: OpeningMetadata | null = null
  ) => {
    if (!opening) return;

    const llmStart = performance.now();

    try {
      // Build the prompt
      let prompt: string;

      if (transposedOpening) {
        // Special prompt for transposition
        prompt = buildTranspositionPrompt(transposedOpening, feedback.move.san);
      } else {
        // Normal explanation prompt
        const promptContext: ExplanationPromptContext = {
          opening,
          userMove: feedback.move,
          classification: feedback.classification,
          currentEval: feedback.evaluation,
          previousEval: feedback.previousEvaluation,
          fen: feedback.move.fen,
          moveHistory: currentSession.moveHistory,
          isDeviationMove,
        };

        prompt = buildExplanationPrompt(promptContext);
      }

      // Call LLM API
      const response = await fetch('/api/v1/llm/opening-explanation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          moveSan: feedback.move.san,
          category: feedback.classification.category,
          theoreticalMoves: feedback.classification.theoreticalAlternatives,
          evalChange: feedback.classification.evaluationChange,
          bestMove: feedback.evaluation.bestMove,
        }),
      });

      if (!response.ok) {
        console.error('LLM API error:', response.statusText);
        return;
      }

      const data = await response.json();
      const explanation = data.explanation || '';

      // Update feedback with explanation
      const updatedFeedback: MoveFeedback = {
        ...feedback,
        llmExplanation: explanation,
      };

      // Update cache
      setFeedbackCache((prev) => {
        const newCache = new Map(prev);
        newCache.set(moveIndex, updatedFeedback);
        return newCache;
      });

      // Update current feedback if this is still the current move
      setCurrentFeedback((current) => {
        if (current && current.move.san === feedback.move.san) {
          return updatedFeedback;
        }
        return current;
      });

      const llmTime = performance.now() - llmStart;
      console.log(`[Performance] LLM explanation generation: ${llmTime.toFixed(0)}ms`);
    } catch (error) {
      console.error('Failed to generate LLM explanation:', error);
      // Silently fail - user still has engine feedback
    }
  };

  /**
   * Navigate to a specific move in the history
   */
  const navigateToMove = (index: number) => {
    if (!session || index < 0 || index > session.moveHistory.length) {
      return;
    }

    const updatedSession = {
      ...session,
      currentMoveIndex: index,
      currentFEN: index === 0 ? STARTING_FEN : session.moveHistory[index - 1].fen,
    };

    setSession(updatedSession);

    // Reset the auto-move state tracker so opponent can move after navigation
    // This allows the user to go back, make a correct move, and have the opponent respond
    lastAutoMoveState.current = null;

    // Update feedback to show the move at this index
    if (index > 0 && index <= session.moveHistory.length) {
      const moveIndex = index - 1; // Convert from 1-based display to 0-based array index

      // Check cache first
      const cached = feedbackCache.get(moveIndex);
      if (cached) {
        setCurrentFeedback(cached);
        return;
      }

      // Not in cache - rebuild feedback (shouldn't happen often)
      const moveEntry = session.moveHistory[moveIndex];
      const previousEval =
        moveIndex > 0
          ? session.moveHistory[moveIndex - 1].evaluation
          : { score: session.initialEvaluation, bestMove: '', ponder: null, mate: null, depth: 0 };

      const feedback: MoveFeedback = {
        move: moveEntry,
        classification: moveEntry.classification,
        evaluation: moveEntry.evaluation,
        previousEvaluation: previousEval as StockfishEvaluation,
        llmExplanation: '', // No cached explanation available
        generatedAt: Date.now(),
      };

      setCurrentFeedback(feedback);
    } else {
      setCurrentFeedback(null);
    }
  };

  /**
   * Reset the current session
   */
  const resetSession = () => {
    setSession(null);
    setOpening(null);
    setCurrentFeedback(null);
    setError(null);
  };

  const value: OpeningTrainingContextType = {
    session,
    opening,
    chess,
    stockfish,
    isLoading,
    error,
    currentFeedback,
    initializeSession,
    makeMove,
    navigateToMove,
    resetSession,
  };

  return (
    <OpeningTrainingContext.Provider value={value}>
      {children}
    </OpeningTrainingContext.Provider>
  );
}

/**
 * Hook to use the Opening Training context
 */
export function useOpeningTraining() {
  const context = useContext(OpeningTrainingContext);
  if (context === undefined) {
    throw new Error(
      'useOpeningTraining must be used within an OpeningTrainingProvider'
    );
  }
  return context;
}

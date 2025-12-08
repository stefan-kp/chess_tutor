'use client';

import React, { createContext, useContext, useReducer, useEffect, useRef, ReactNode } from 'react';
import { Chess } from 'chess.js';
import { MoveFeedback } from '@/types/openingTraining';
import { ChessEngine } from '@/lib/engine';
import { createEngine } from '@/lib/engine';
import { OpeningMetadata } from '@/lib/openings';
import {
  sessionReducer,
  createInitialState,
  SessionState,
  SessionAction,
  shouldTriggerOpponentMove,
  toTrainingSession,
} from '@/lib/openingTrainer/sessionReducer';
import { SessionOrchestrator } from '@/lib/openingTrainer/sessionOrchestrator';
import { loadSession, saveSession } from '@/lib/openingTrainer/sessionManager';
import { STARTING_FEN } from '@/lib/openingTrainer/constants';
import { getUserColor } from '@/lib/openingTrainer/gameLogic';

/**
 * Refactored Opening Training Context
 *
 * This is a CLEAN implementation using the reducer pattern.
 * No more tangled useEffects! No more race conditions!
 */

interface OpeningTrainingContextType {
  // State
  session: SessionState | null;
  opening: OpeningMetadata | null;
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
  // Core state - single source of truth via reducer
  const [session, dispatch] = useReducer(
    (state: SessionState | null, action: SessionAction): SessionState | null => {
      if (!state) {
        // Handle initialization actions when state is null
        if (action.type === 'INITIALIZE_SESSION') {
          return createInitialState(action.opening);
        }
        // SESSION_LOADED can be called when state is null (loading existing session)
        // Create a temporary state so the reducer can process it
        if (action.type === 'SESSION_LOADED') {
          const tempState = createInitialState(action.opening);
          return sessionReducer(tempState, action);
        }
        return null;
      }
      return sessionReducer(state, action);
    },
    null as SessionState | null
  );

  // UI state (not part of session state)
  const [opening, setOpening] = React.useState<OpeningMetadata | null>(null);
  const [stockfish, setStockfish] = React.useState<ChessEngine | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [currentFeedback, setCurrentFeedback] = React.useState<MoveFeedback | null>(null);

  // Orchestrator for async operations
  const orchestratorRef = useRef<SessionOrchestrator | null>(null);

  // Feedback cache (indexed by move index)
  const feedbackCacheRef = useRef<Map<number, MoveFeedback>>(new Map());

  // ============================================================================
  // Engine Initialization
  // ============================================================================

  useEffect(() => {
    if (typeof window !== 'undefined') {
      createEngine()
        .then((engine) => {
          setStockfish(engine);
          orchestratorRef.current = new SessionOrchestrator(engine);
        })
        .catch((err) => {
          console.error('Failed to create chess engine:', err);
          setError('Failed to initialize chess engine');
        });

      return () => {
        if (stockfish) {
          stockfish.terminate();
        }
        if (orchestratorRef.current) {
          orchestratorRef.current.destroy();
        }
      };
    }
  }, []);

  // ============================================================================
  // Session Persistence
  // ============================================================================

  useEffect(() => {
    if (session && session.phase !== 'initializing') {
      saveSession(toTrainingSession(session));
    }
  }, [session]);

  // ============================================================================
  // Automatic Opponent Moves
  // ============================================================================

  useEffect(() => {
    if (!session || !orchestratorRef.current) {
      console.log('[OpeningTraining] Opponent move check skipped:', {
        hasSession: !!session,
        hasOrchestrator: !!orchestratorRef.current
      });
      return;
    }

    // Debug logging
    console.log('[OpeningTraining] Checking if opponent should move:', {
      phase: session.phase,
      currentMoveIndex: session.currentMoveIndex,
      moveHistoryLength: session.moveHistory.length,
      isAtCurrentPosition: session.currentMoveIndex === session.moveHistory.length,
      pendingOpponentMove: session.pendingOpponentMove,
    });

    // Check if we should trigger an opponent auto-move
    if (shouldTriggerOpponentMove(session)) {
      console.log('[OpeningTraining] ✅ Triggering automatic opponent move');

      // Make the opponent move
      makeOpponentMove();
    } else {
      console.log('[OpeningTraining] ❌ Not triggering opponent move');
    }
  }, [session?.phase, session?.currentMoveIndex, session?.moveHistory.length]);

  // ============================================================================
  // Session Management
  // ============================================================================

  const initializeSession = async (
    openingMetadata: OpeningMetadata,
    forceNew: boolean = false
  ) => {
    console.log('[OpeningTraining] initializeSession called', { eco: openingMetadata.eco, forceNew });

    // Wait for orchestrator to be ready (max 5 seconds)
    const maxWaitTime = 5000;
    const startTime = Date.now();
    while (!orchestratorRef.current && Date.now() - startTime < maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (!orchestratorRef.current) {
      console.error('[OpeningTraining] Orchestrator not ready after waiting');
      setError('Chess engine not initialized');
      return;
    }

    console.log('[OpeningTraining] Orchestrator ready, proceeding with initialization');

    setIsLoading(true);
    setError(null);

    try {
      // Try to load existing session (unless forceNew is true)
      const existingSession = forceNew ? null : loadSession(openingMetadata.eco);

      if (existingSession && !forceNew) {
        // Resume existing session
        console.log('[OpeningTraining] Resuming existing session');
        dispatch({ type: 'SESSION_LOADED', session: existingSession, opening: openingMetadata });
        setOpening(openingMetadata);
      } else {
        // Create new session
        console.log('[OpeningTraining] Creating new session');
        dispatch({ type: 'INITIALIZE_SESSION', opening: openingMetadata, forceNew });

        // Get initial evaluation
        console.log('[OpeningTraining] Getting initial evaluation');
        const initialEval = await orchestratorRef.current.getInitialEvaluation(STARTING_FEN);
        console.log('[OpeningTraining] Initial evaluation:', initialEval);

        dispatch({ type: 'SESSION_INITIALIZED', initialEvaluation: initialEval });
        console.log('[OpeningTraining] Session initialized');

        setOpening(openingMetadata);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize session');
    } finally {
      setIsLoading(false);
    }
  };

  const makeMove = async (san: string) => {
    if (!session || !opening || !orchestratorRef.current) {
      setError('Session not initialized');
      return;
    }

    console.log('[OpeningTraining] makeMove:', san);

    setIsLoading(true);
    setError(null);

    try {
      // Dispatch action to indicate move started
      dispatch({ type: 'USER_MOVE_STARTED', san });

      // Check if we're navigated back in history
      const wasNavigatedBack = session.currentMoveIndex < session.moveHistory.length;

      // Process the move through orchestrator
      const result = await orchestratorRef.current.processUserMove(
        session,
        san,
        wasNavigatedBack
      );

      // Dispatch actions from orchestrator
      result.actions.forEach((action) => dispatch(action));

      // Create initial feedback (without LLM explanation)
      const initialFeedback: MoveFeedback = {
        move: result.moveEntry,
        classification: result.moveEntry.classification,
        evaluation: result.moveEntry.evaluation,
        previousEvaluation: session.moveHistory.length > 0
          ? session.moveHistory[session.moveHistory.length - 1].evaluation
          : { score: session.initialEvaluation, mate: null, depth: 0, bestMove: '', ponder: null },
        llmExplanation: '',
        generatedAt: Date.now(),
      };

      // Cache feedback
      const moveIndex = wasNavigatedBack
        ? session.currentMoveIndex
        : session.moveHistory.length;
      feedbackCacheRef.current.set(moveIndex, initialFeedback);

      setCurrentFeedback(initialFeedback);

      // TODO: Generate LLM explanation asynchronously (Phase 5)
      // generateLLMExplanation(initialFeedback, session, moveIndex);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process move';
      setError(errorMessage);
      dispatch({ type: 'ERROR', message: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const makeOpponentMove = async () => {
    if (!session || !opening || !orchestratorRef.current) return;

    console.log('[OpeningTraining] Making automatic opponent move');

    try {
      // Process opponent move through orchestrator
      const result = await orchestratorRef.current.processOpponentMove(session, 600);

      // Dispatch actions from orchestrator
      result.actions.forEach((action) => dispatch(action));
    } catch (err) {
      console.error('[OpeningTraining] Opponent move failed:', err);
      // Don't set error - this is expected at end of repertoire
    }
  };

  const navigateToMove = (index: number) => {
    if (!session) return;

    console.log('[OpeningTraining] Navigating to move index:', index);

    dispatch({ type: 'NAVIGATE_TO', index });

    // Update feedback to show the move at this index
    if (index > 0 && index <= session.moveHistory.length) {
      const moveIndex = index - 1;

      // Check cache first
      const cached = feedbackCacheRef.current.get(moveIndex);
      if (cached) {
        setCurrentFeedback(cached);
        return;
      }

      // Not in cache - rebuild feedback
      const moveEntry = session.moveHistory[moveIndex];
      const previousEval =
        moveIndex > 0
          ? session.moveHistory[moveIndex - 1].evaluation
          : { score: session.initialEvaluation, mate: null, depth: 0, bestMove: '', ponder: null };

      const feedback: MoveFeedback = {
        move: moveEntry,
        classification: moveEntry.classification,
        evaluation: moveEntry.evaluation,
        previousEvaluation: previousEval,
        llmExplanation: '',
        generatedAt: Date.now(),
      };

      setCurrentFeedback(feedback);
    } else {
      setCurrentFeedback(null);
    }
  };

  const resetSession = () => {
    dispatch({ type: 'RESET_SESSION' });
    setOpening(null);
    setCurrentFeedback(null);
    setError(null);
    feedbackCacheRef.current.clear();
  };

  // ============================================================================
  // Context Value
  // ============================================================================

  const value: OpeningTrainingContextType = {
    session,
    opening,
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

/**
 * Helper to get a Chess instance for the current position
 * Creates it on-demand from the current FEN
 */
export function useChessInstance(session: SessionState | null): Chess | null {
  return React.useMemo(() => {
    if (!session) return null;
    return new Chess(session.currentFEN);
  }, [session?.currentFEN]);
}

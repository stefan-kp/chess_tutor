import { OpeningMetadata } from '@/lib/openings';
import { MoveHistoryEntry, TrainingSession } from '@/types/openingTraining';
import { StockfishEvaluation } from '@/lib/stockfish';
import { STARTING_FEN } from './constants';
import {
  isInTheory,
  isOpponentTurn,
  isEndOfRepertoire,
  buildFenAtIndex,
} from './gameLogic';

/**
 * Session Reducer - State Machine for Opening Training
 *
 * This reducer manages ALL state transitions in a predictable, testable way.
 * No more race conditions, no more tangled useEffects!
 */

// ============================================================================
// State Machine Phases
// ============================================================================

export type SessionPhase =
  | 'initializing'       // Session starting, loading data
  | 'user_turn'          // Waiting for user to make a move
  | 'evaluating_user'    // User moved, Stockfish evaluating
  | 'opponent_turn'      // Opponent should auto-move
  | 'evaluating_opponent'// Opponent moved, Stockfish evaluating
  | 'navigating'         // User browsing history (no auto-moves)
  | 'end_of_repertoire'  // Reached end of opening theory
  | 'off_book';          // User deviated from theory

// ============================================================================
// Session State
// ============================================================================

export interface SessionState {
  // Core session data
  sessionId: string;
  opening: OpeningMetadata;
  moveHistory: MoveHistoryEntry[];
  currentFEN: string;
  currentMoveIndex: number; // Which move are we viewing (0 = start position)

  // Opening theory tracking
  deviationMoveIndex: number | null; // Index where user first left theory
  isInTheory: boolean;
  endOfRepertoireReached: boolean;

  // Phase management
  phase: SessionPhase;
  pendingOpponentMove: string | null; // Move to be executed by opponent
  pendingEvaluation: boolean; // Whether we're waiting for Stockfish

  // Wikipedia context
  wikipediaSummary: string | null;
  openingFamily: string;

  // Session metadata
  startedAt: number;
  lastUpdatedAt: number;
  initialEvaluation: number; // Starting position eval (centipawns)

  // Error state
  error: string | null;
}

// ============================================================================
// Actions
// ============================================================================

export type SessionAction =
  // Session lifecycle
  | { type: 'INITIALIZE_SESSION'; opening: OpeningMetadata; forceNew: boolean }
  | { type: 'SESSION_INITIALIZED'; initialEvaluation: number }
  | { type: 'SESSION_LOADED'; session: TrainingSession; opening: OpeningMetadata }
  | { type: 'RESET_SESSION' }

  // Move actions (user)
  | { type: 'USER_MOVE_STARTED'; san: string }
  | {
      type: 'USER_MOVE_COMPLETED';
      moveEntry: MoveHistoryEntry;
      wasNavigatedBack: boolean;
    }

  // Move actions (opponent)
  | { type: 'OPPONENT_MOVE_QUEUED'; san: string }
  | { type: 'OPPONENT_MOVE_COMPLETED'; moveEntry: MoveHistoryEntry }

  // Navigation actions
  | { type: 'NAVIGATE_TO'; index: number }
  | { type: 'NAVIGATE_PREVIOUS' }
  | { type: 'NAVIGATE_NEXT' }
  | { type: 'NAVIGATE_TO_CURRENT' } // Jump back to end of history

  // Theory tracking
  | { type: 'DEVIATION_DETECTED'; moveIndex: number }
  | { type: 'DEVIATION_RESET' }
  | { type: 'END_OF_REPERTOIRE_REACHED' }

  // Wikipedia
  | { type: 'WIKIPEDIA_LOADED'; summary: string; family: string }

  // Error handling
  | { type: 'ERROR'; message: string }
  | { type: 'CLEAR_ERROR' };

// ============================================================================
// Initial State Factory
// ============================================================================

export function createInitialState(
  opening: OpeningMetadata,
  sessionId: string = crypto.randomUUID()
): SessionState {
  return {
    sessionId,
    opening,
    moveHistory: [],
    currentFEN: STARTING_FEN,
    currentMoveIndex: 0,

    deviationMoveIndex: null,
    isInTheory: true,
    endOfRepertoireReached: false,

    phase: 'initializing',
    pendingOpponentMove: null,
    pendingEvaluation: false,

    wikipediaSummary: null,
    openingFamily: opening.name.split(':')[0].trim(),

    startedAt: Date.now(),
    lastUpdatedAt: Date.now(),
    initialEvaluation: 0,

    error: null,
  };
}

// ============================================================================
// Reducer
// ============================================================================

export function sessionReducer(
  state: SessionState,
  action: SessionAction
): SessionState | null {
  switch (action.type) {
    // ------------------------------------------------------------------------
    // Session Lifecycle
    // ------------------------------------------------------------------------

    case 'INITIALIZE_SESSION': {
      return createInitialState(action.opening);
    }

    case 'SESSION_INITIALIZED': {
      const { initialEvaluation } = action;

      // Determine initial phase based on who moves first
      const isOpponentFirst = isOpponentTurn(state.opening, []);

      return {
        ...state,
        initialEvaluation,
        phase: isOpponentFirst ? 'opponent_turn' : 'user_turn',
        lastUpdatedAt: Date.now(),
      };
    }

    case 'SESSION_LOADED': {
      const { session, opening } = action;

      // Convert TrainingSession to SessionState
      // Determine current phase based on position
      let phase: SessionPhase;
      const atEnd = session.currentMoveIndex === session.moveHistory.length;

      if (!atEnd) {
        phase = 'navigating';
      } else if (session.deviationMoveIndex !== null) {
        phase = 'off_book';
      } else if (isEndOfRepertoire(opening, session.moveHistory.length)) {
        phase = 'end_of_repertoire';
      } else if (isOpponentTurn(opening, session.moveHistory)) {
        phase = 'opponent_turn';
      } else {
        phase = 'user_turn';
      }

      return {
        ...state,
        opening,
        sessionId: session.sessionId,
        moveHistory: session.moveHistory,
        currentFEN: session.currentFEN,
        currentMoveIndex: session.currentMoveIndex,
        deviationMoveIndex: session.deviationMoveIndex,
        isInTheory: session.deviationMoveIndex === null,
        phase,
        lastUpdatedAt: session.lastUpdatedAt,
        initialEvaluation: session.initialEvaluation,
      };
    }

    case 'RESET_SESSION': {
      // Reset to null - UI will handle re-initialization if needed
      return null as any; // Return null to clear session completely
    }

    // ------------------------------------------------------------------------
    // User Move Actions
    // ------------------------------------------------------------------------

    case 'USER_MOVE_STARTED': {
      return {
        ...state,
        phase: 'evaluating_user',
        error: null,
        lastUpdatedAt: Date.now(),
      };
    }

    case 'USER_MOVE_COMPLETED': {
      const { moveEntry, wasNavigatedBack } = action;

      // If navigated back, truncate history
      const newHistory = wasNavigatedBack
        ? [...state.moveHistory.slice(0, state.currentMoveIndex), moveEntry]
        : [...state.moveHistory, moveEntry];

      const newMoveIndex = newHistory.length;

      // Update theory tracking
      const stillInTheory = isInTheory(state.opening, newHistory);
      const newDeviationIndex = wasNavigatedBack && stillInTheory
        ? null // Reset deviation if we're back in theory
        : !stillInTheory && state.deviationMoveIndex === null
        ? newMoveIndex - 1 // Mark new deviation
        : state.deviationMoveIndex;

      // Determine next phase
      let nextPhase: SessionPhase;
      if (!stillInTheory) {
        nextPhase = 'off_book';
      } else if (isEndOfRepertoire(state.opening, newMoveIndex)) {
        nextPhase = 'end_of_repertoire';
      } else if (isOpponentTurn(state.opening, newHistory)) {
        nextPhase = 'opponent_turn';
      } else {
        nextPhase = 'user_turn';
      }

      return {
        ...state,
        moveHistory: newHistory,
        currentFEN: moveEntry.fen,
        currentMoveIndex: newMoveIndex,
        deviationMoveIndex: newDeviationIndex,
        isInTheory: stillInTheory,
        phase: nextPhase,
        pendingEvaluation: false,
        lastUpdatedAt: Date.now(),
      };
    }

    // ------------------------------------------------------------------------
    // Opponent Move Actions
    // ------------------------------------------------------------------------

    case 'OPPONENT_MOVE_QUEUED': {
      return {
        ...state,
        pendingOpponentMove: action.san,
        lastUpdatedAt: Date.now(),
      };
    }

    case 'OPPONENT_MOVE_COMPLETED': {
      const { moveEntry } = action;
      const newHistory = [...state.moveHistory, moveEntry];
      const newMoveIndex = newHistory.length;

      // Check if this was the last repertoire move
      const reachedEnd = isEndOfRepertoire(state.opening, newMoveIndex);

      // Determine next phase
      const nextPhase = reachedEnd
        ? 'end_of_repertoire'
        : isOpponentTurn(state.opening, newHistory)
        ? 'opponent_turn'
        : 'user_turn';

      return {
        ...state,
        moveHistory: newHistory,
        currentFEN: moveEntry.fen,
        currentMoveIndex: newMoveIndex,
        pendingOpponentMove: null,
        phase: nextPhase,
        endOfRepertoireReached: reachedEnd,
        lastUpdatedAt: Date.now(),
      };
    }

    // ------------------------------------------------------------------------
    // Navigation Actions
    // ------------------------------------------------------------------------

    case 'NAVIGATE_TO': {
      const { index } = action;

      // Clamp index to valid range
      const clampedIndex = Math.max(0, Math.min(index, state.moveHistory.length));

      // Build FEN at target index
      const newFEN = buildFenAtIndex(state.moveHistory, clampedIndex);

      // Cancel any pending opponent moves
      return {
        ...state,
        currentMoveIndex: clampedIndex,
        currentFEN: newFEN,
        phase: 'navigating',
        pendingOpponentMove: null,
        lastUpdatedAt: Date.now(),
      };
    }

    case 'NAVIGATE_PREVIOUS': {
      if (state.currentMoveIndex === 0) return state;

      return sessionReducer(state, {
        type: 'NAVIGATE_TO',
        index: state.currentMoveIndex - 1,
      });
    }

    case 'NAVIGATE_NEXT': {
      if (state.currentMoveIndex >= state.moveHistory.length) return state;

      return sessionReducer(state, {
        type: 'NAVIGATE_TO',
        index: state.currentMoveIndex + 1,
      });
    }

    case 'NAVIGATE_TO_CURRENT': {
      // Jump to the end of history (current position)
      const atEnd = state.currentMoveIndex === state.moveHistory.length;
      if (atEnd) return state;

      const newFEN = state.moveHistory.length > 0
        ? state.moveHistory[state.moveHistory.length - 1].fen
        : STARTING_FEN;

      // Determine correct phase at current position
      let phase: SessionPhase;
      if (state.deviationMoveIndex !== null) {
        phase = 'off_book';
      } else if (state.endOfRepertoireReached) {
        phase = 'end_of_repertoire';
      } else if (isOpponentTurn(state.opening, state.moveHistory)) {
        phase = 'opponent_turn';
      } else {
        phase = 'user_turn';
      }

      return {
        ...state,
        currentMoveIndex: state.moveHistory.length,
        currentFEN: newFEN,
        phase,
        lastUpdatedAt: Date.now(),
      };
    }

    // ------------------------------------------------------------------------
    // Theory Tracking
    // ------------------------------------------------------------------------

    case 'DEVIATION_DETECTED': {
      return {
        ...state,
        deviationMoveIndex: action.moveIndex,
        isInTheory: false,
        phase: 'off_book',
        lastUpdatedAt: Date.now(),
      };
    }

    case 'DEVIATION_RESET': {
      return {
        ...state,
        deviationMoveIndex: null,
        isInTheory: true,
        lastUpdatedAt: Date.now(),
      };
    }

    case 'END_OF_REPERTOIRE_REACHED': {
      return {
        ...state,
        endOfRepertoireReached: true,
        phase: 'end_of_repertoire',
        lastUpdatedAt: Date.now(),
      };
    }

    // ------------------------------------------------------------------------
    // Wikipedia
    // ------------------------------------------------------------------------

    case 'WIKIPEDIA_LOADED': {
      return {
        ...state,
        wikipediaSummary: action.summary,
        openingFamily: action.family,
        lastUpdatedAt: Date.now(),
      };
    }

    // ------------------------------------------------------------------------
    // Error Handling
    // ------------------------------------------------------------------------

    case 'ERROR': {
      return {
        ...state,
        error: action.message,
        phase: state.moveHistory.length === 0 ? 'user_turn' : state.phase,
        pendingEvaluation: false,
        lastUpdatedAt: Date.now(),
      };
    }

    case 'CLEAR_ERROR': {
      return {
        ...state,
        error: null,
        lastUpdatedAt: Date.now(),
      };
    }

    default:
      return state;
  }
}

// ============================================================================
// Selectors (Derived State)
// ============================================================================

export function canNavigateBack(state: SessionState): boolean {
  return state.currentMoveIndex > 0;
}

export function canNavigateForward(state: SessionState): boolean {
  return state.currentMoveIndex < state.moveHistory.length;
}

export function isAtCurrentPosition(state: SessionState): boolean {
  return state.currentMoveIndex === state.moveHistory.length;
}

export function getCurrentPhaseDescription(state: SessionState): string {
  switch (state.phase) {
    case 'initializing':
      return 'Initializing session...';
    case 'user_turn':
      return "Your turn";
    case 'evaluating_user':
      return 'Analyzing your move...';
    case 'opponent_turn':
      return "Opponent's turn";
    case 'evaluating_opponent':
      return "Analyzing opponent's move...";
    case 'navigating':
      return 'Browsing history';
    case 'end_of_repertoire':
      return 'End of opening repertoire';
    case 'off_book':
      return 'Off-book (out of theory)';
  }
}

/**
 * Check if we should trigger an automatic opponent move
 * This is THE critical function that prevents the navigation bug
 */
export function shouldTriggerOpponentMove(state: SessionState): boolean {
  // Must be at current position (not browsing history)
  if (!isAtCurrentPosition(state)) return false;

  // Must be in opponent_turn phase
  if (state.phase !== 'opponent_turn') return false;

  // Must not have a pending move already
  if (state.pendingOpponentMove !== null) return false;

  return true;
}

/**
 * Convert SessionState to TrainingSession for persistence
 */
export function toTrainingSession(state: SessionState): TrainingSession {
  return {
    sessionId: state.sessionId,
    openingId: state.opening.eco,
    openingName: state.opening.name,
    startedAt: state.startedAt,
    lastUpdatedAt: state.lastUpdatedAt,
    status: 'active',
    currentFEN: state.currentFEN,
    currentMoveIndex: state.currentMoveIndex,
    moveHistory: state.moveHistory,
    deviationMoveIndex: state.deviationMoveIndex,
    initialEvaluation: state.initialEvaluation,
  };
}

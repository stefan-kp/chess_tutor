import {
  sessionReducer,
  createInitialState,
  SessionState,
  canNavigateBack,
  canNavigateForward,
  isAtCurrentPosition,
  shouldTriggerOpponentMove,
  toTrainingSession,
} from '../sessionReducer';
import { OpeningMetadata } from '@/lib/openings';
import { MoveHistoryEntry } from '@/types/openingTraining';
import { STARTING_FEN } from '../constants';

// ============================================================================
// Test Helpers
// ============================================================================

const mockOpening: OpeningMetadata = {
  eco: 'C00',
  name: 'French Defense',
  moves: '1. e4 e6 2. d4 d5',
  src: 'test',
  wikipediaSlug: 'French_Defence',
};

const mockBlackOpening: OpeningMetadata = {
  eco: 'D00',
  name: "Queen's Pawn",
  moves: '1. d4 d5',
  src: 'test',
};

function createMockMove(
  san: string,
  color: 'white' | 'black',
  fen: string,
  moveNumber: number
): MoveHistoryEntry {
  return {
    moveNumber,
    color,
    san,
    uci: 'e2e4',
    fen,
    evaluation: { score: 0, mate: null, depth: 15, bestMove: 'e4', ponder: null },
    classification: {
      category: 'in-theory',
      inRepertoire: true,
      evaluationChange: 0,
      isSignificantSwing: false,
      theoreticalAlternatives: [],
    },
    timestamp: Date.now(),
  };
}

// ============================================================================
// Initial State Tests
// ============================================================================

describe('createInitialState', () => {
  test('creates initial state for White opening', () => {
    const state = createInitialState(mockOpening);

    expect(state.opening).toBe(mockOpening);
    expect(state.moveHistory).toEqual([]);
    expect(state.currentFEN).toBe(STARTING_FEN);
    expect(state.currentMoveIndex).toBe(0);
    expect(state.phase).toBe('initializing');
    expect(state.deviationMoveIndex).toBeNull();
    expect(state.isInTheory).toBe(true);
  });

  test('generates unique session IDs', () => {
    const state1 = createInitialState(mockOpening);
    const state2 = createInitialState(mockOpening);

    expect(state1.sessionId).not.toBe(state2.sessionId);
  });
});

// ============================================================================
// Session Lifecycle Tests
// ============================================================================

describe('Session Lifecycle', () => {
  test('SESSION_INITIALIZED sets phase to user_turn for White', () => {
    const state = createInitialState(mockOpening);

    const newState = sessionReducer(state, {
      type: 'SESSION_INITIALIZED',
      initialEvaluation: 25,
    });

    expect(newState.phase).toBe('user_turn'); // C00 = White opening
    expect(newState.initialEvaluation).toBe(25);
  });

  test('SESSION_INITIALIZED sets phase to opponent_turn for Black', () => {
    const state = createInitialState(mockBlackOpening);

    const newState = sessionReducer(state, {
      type: 'SESSION_INITIALIZED',
      initialEvaluation: 25,
    });

    expect(newState.phase).toBe('opponent_turn'); // D00 = Black opening
  });

  test('RESET_SESSION clears state to null', () => {
    let state = createInitialState(mockOpening);
    state = {
      ...state,
      moveHistory: [createMockMove('e4', 'white', 'fen1', 1)],
      currentMoveIndex: 1,
      phase: 'user_turn',
    };

    const newState = sessionReducer(state, { type: 'RESET_SESSION' });

    // RESET_SESSION now returns null to completely clear the session
    // The UI context will handle re-initialization if needed
    expect(newState).toBeNull();
  });
});

// ============================================================================
// User Move Tests
// ============================================================================

describe('User Move Actions', () => {
  test('USER_MOVE_STARTED sets phase to evaluating_user', () => {
    let state = createInitialState(mockOpening);
    state = { ...state, phase: 'user_turn' };

    const newState = sessionReducer(state, {
      type: 'USER_MOVE_STARTED',
      san: 'e4',
    });

    expect(newState.phase).toBe('evaluating_user');
  });

  test('USER_MOVE_COMPLETED adds move to history', () => {
    let state = createInitialState(mockOpening);
    state = { ...state, phase: 'evaluating_user' };

    const moveEntry = createMockMove('e4', 'white', 'fen1', 1);

    const newState = sessionReducer(state, {
      type: 'USER_MOVE_COMPLETED',
      moveEntry,
      wasNavigatedBack: false,
    });

    expect(newState.moveHistory).toHaveLength(1);
    expect(newState.moveHistory[0]).toBe(moveEntry);
    expect(newState.currentMoveIndex).toBe(1);
    expect(newState.currentFEN).toBe('fen1');
  });

  test('USER_MOVE_COMPLETED transitions to opponent_turn when in theory', () => {
    let state = createInitialState(mockOpening);
    state = { ...state, phase: 'evaluating_user' };

    const moveEntry = createMockMove('e4', 'white', 'fen1', 1);

    const newState = sessionReducer(state, {
      type: 'USER_MOVE_COMPLETED',
      moveEntry,
      wasNavigatedBack: false,
    });

    expect(newState.phase).toBe('opponent_turn');
    expect(newState.isInTheory).toBe(true);
  });

  test('USER_MOVE_COMPLETED transitions to off_book when deviating', () => {
    let state = createInitialState(mockOpening);
    state = { ...state, phase: 'evaluating_user' };

    // Wrong move (should be e4)
    const moveEntry = createMockMove('d4', 'white', 'fen1', 1);

    const newState = sessionReducer(state, {
      type: 'USER_MOVE_COMPLETED',
      moveEntry,
      wasNavigatedBack: false,
    });

    expect(newState.phase).toBe('off_book');
    expect(newState.isInTheory).toBe(false);
    expect(newState.deviationMoveIndex).toBe(0);
  });

  test('USER_MOVE_COMPLETED truncates history when navigated back', () => {
    let state = createInitialState(mockOpening);
    state = {
      ...state,
      moveHistory: [
        createMockMove('e4', 'white', 'fen1', 1),
        createMockMove('e6', 'black', 'fen2', 1),
        createMockMove('d4', 'white', 'fen3', 2),
      ],
      currentMoveIndex: 1, // Navigated back to after e6
      phase: 'evaluating_user',
    };

    // User makes a different move
    const newMove = createMockMove('Nf3', 'white', 'fen_new', 2);

    const newState = sessionReducer(state, {
      type: 'USER_MOVE_COMPLETED',
      moveEntry: newMove,
      wasNavigatedBack: true,
    });

    expect(newState.moveHistory).toHaveLength(2); // e4, e6 kept, d4 removed
    expect(newState.moveHistory[1].san).toBe('Nf3');
    expect(newState.currentMoveIndex).toBe(2);
  });

  test('USER_MOVE_COMPLETED resets deviation when back in theory', () => {
    let state = createInitialState(mockOpening);
    state = {
      ...state,
      moveHistory: [
        createMockMove('d4', 'white', 'fen1', 1), // Wrong move
      ],
      currentMoveIndex: 0, // Navigated back to start
      deviationMoveIndex: 0,
      isInTheory: false,
      phase: 'evaluating_user',
    };

    // User makes the CORRECT move this time
    const correctMove = createMockMove('e4', 'white', 'fen_correct', 1);

    const newState = sessionReducer(state, {
      type: 'USER_MOVE_COMPLETED',
      moveEntry: correctMove,
      wasNavigatedBack: true,
    });

    expect(newState.deviationMoveIndex).toBeNull(); // DEVIATION RESET!
    expect(newState.isInTheory).toBe(true);
    expect(newState.phase).toBe('opponent_turn'); // Should auto-move now
  });
});

// ============================================================================
// Opponent Move Tests
// ============================================================================

describe('Opponent Move Actions', () => {
  test('OPPONENT_MOVE_QUEUED sets pending move', () => {
    let state = createInitialState(mockOpening);
    state = { ...state, phase: 'opponent_turn' };

    const newState = sessionReducer(state, {
      type: 'OPPONENT_MOVE_QUEUED',
      san: 'e6',
    });

    expect(newState.pendingOpponentMove).toBe('e6');
  });

  test('OPPONENT_MOVE_COMPLETED adds move and transitions to user_turn', () => {
    let state = createInitialState(mockOpening);
    state = {
      ...state,
      moveHistory: [createMockMove('e4', 'white', 'fen1', 1)],
      currentMoveIndex: 1,
      phase: 'opponent_turn',
      pendingOpponentMove: 'e6',
    };

    const opponentMove = createMockMove('e6', 'black', 'fen2', 1);

    const newState = sessionReducer(state, {
      type: 'OPPONENT_MOVE_COMPLETED',
      moveEntry: opponentMove,
    });

    expect(newState.moveHistory).toHaveLength(2);
    expect(newState.currentMoveIndex).toBe(2);
    expect(newState.pendingOpponentMove).toBeNull();
    expect(newState.phase).toBe('user_turn');
  });

  test('OPPONENT_MOVE_COMPLETED detects end of repertoire', () => {
    let state = createInitialState(mockOpening);
    state = {
      ...state,
      moveHistory: [
        createMockMove('e4', 'white', 'fen1', 1),
        createMockMove('e6', 'black', 'fen2', 1),
        createMockMove('d4', 'white', 'fen3', 2),
      ],
      currentMoveIndex: 3,
      phase: 'opponent_turn',
    };

    // This is the last repertoire move
    const lastMove = createMockMove('d5', 'black', 'fen4', 2);

    const newState = sessionReducer(state, {
      type: 'OPPONENT_MOVE_COMPLETED',
      moveEntry: lastMove,
    });

    expect(newState.endOfRepertoireReached).toBe(true);
    expect(newState.phase).toBe('end_of_repertoire');
  });
});

// ============================================================================
// Navigation Tests (THE CRITICAL BUG TESTS!)
// ============================================================================

describe('Navigation Actions', () => {
  test('NAVIGATE_TO sets navigating phase', () => {
    let state = createInitialState(mockOpening);
    state = {
      ...state,
      moveHistory: [
        createMockMove('e4', 'white', 'fen1', 1),
        createMockMove('e6', 'black', 'fen2', 1),
      ],
      currentMoveIndex: 2,
      phase: 'user_turn',
    };

    const newState = sessionReducer(state, {
      type: 'NAVIGATE_TO',
      index: 1,
    });

    expect(newState.phase).toBe('navigating');
    expect(newState.currentMoveIndex).toBe(1);
    expect(newState.currentFEN).toBe('fen1');
  });

  test('NAVIGATE_TO cancels pending opponent moves', () => {
    let state = createInitialState(mockOpening);
    state = {
      ...state,
      moveHistory: [createMockMove('e4', 'white', 'fen1', 1)],
      currentMoveIndex: 1,
      phase: 'opponent_turn',
      pendingOpponentMove: 'e6',
    };

    const newState = sessionReducer(state, {
      type: 'NAVIGATE_TO',
      index: 0,
    });

    expect(newState.pendingOpponentMove).toBeNull(); // CANCELLED!
    expect(newState.phase).toBe('navigating');
  });

  test('NAVIGATE_TO_CURRENT returns to end of history', () => {
    let state = createInitialState(mockOpening);
    state = {
      ...state,
      moveHistory: [
        createMockMove('e4', 'white', 'fen1', 1),
        createMockMove('e6', 'black', 'fen2', 1),
      ],
      currentMoveIndex: 0, // Navigated to start
      phase: 'navigating',
    };

    const newState = sessionReducer(state, {
      type: 'NAVIGATE_TO_CURRENT',
    });

    expect(newState.currentMoveIndex).toBe(2); // Back at end
    expect(newState.currentFEN).toBe('fen2');
    expect(newState.phase).toBe('user_turn'); // Ready for next move
  });

  test('NAVIGATE_PREVIOUS goes back one move', () => {
    let state = createInitialState(mockOpening);
    state = {
      ...state,
      moveHistory: [
        createMockMove('e4', 'white', 'fen1', 1),
        createMockMove('e6', 'black', 'fen2', 1),
      ],
      currentMoveIndex: 2,
      phase: 'user_turn',
    };

    const newState = sessionReducer(state, { type: 'NAVIGATE_PREVIOUS' });

    expect(newState.currentMoveIndex).toBe(1);
    expect(newState.phase).toBe('navigating');
  });

  test('NAVIGATE_NEXT goes forward one move', () => {
    let state = createInitialState(mockOpening);
    state = {
      ...state,
      moveHistory: [
        createMockMove('e4', 'white', 'fen1', 1),
        createMockMove('e6', 'black', 'fen2', 1),
      ],
      currentMoveIndex: 1,
      phase: 'navigating',
    };

    const newState = sessionReducer(state, { type: 'NAVIGATE_NEXT' });

    expect(newState.currentMoveIndex).toBe(2);
  });

  // =====================================================================
  // THE BUG: Wrong move → Navigate back → Correct move → Opponent should respond
  // =====================================================================

  test('THE BUG FIX: Navigation + correct move allows opponent to auto-move', () => {
    // Step 1: User makes WRONG move (d4 instead of e4)
    let state = createInitialState(mockOpening);
    state = { ...state, phase: 'user_turn' };

    const wrongMove = createMockMove('d4', 'white', 'fen_wrong', 1);
    state = sessionReducer(state, {
      type: 'USER_MOVE_COMPLETED',
      moveEntry: wrongMove,
      wasNavigatedBack: false,
    });

    expect(state.phase).toBe('off_book'); // Deviated
    expect(state.deviationMoveIndex).toBe(0);

    // Step 2: User navigates back to start
    state = sessionReducer(state, { type: 'NAVIGATE_TO', index: 0 });
    expect(state.phase).toBe('navigating');

    // Step 3: User makes CORRECT move (e4)
    const correctMove = createMockMove('e4', 'white', 'fen_correct', 1);
    state = sessionReducer(state, {
      type: 'USER_MOVE_COMPLETED',
      moveEntry: correctMove,
      wasNavigatedBack: true, // This is key!
    });

    // ASSERTIONS: The bug is fixed if these all pass
    expect(state.deviationMoveIndex).toBeNull(); // Deviation RESET
    expect(state.isInTheory).toBe(true); // Back in theory
    expect(state.phase).toBe('opponent_turn'); // Opponent should move!
    expect(state.moveHistory).toHaveLength(1); // Only correct move
    expect(state.moveHistory[0].san).toBe('e4');

    // Step 4: Verify shouldTriggerOpponentMove returns true
    const shouldTrigger = shouldTriggerOpponentMove(state);
    expect(shouldTrigger).toBe(true); // OPPONENT WILL AUTO-MOVE!
  });
});

// ============================================================================
// Selector Tests
// ============================================================================

describe('Selectors', () => {
  test('canNavigateBack returns true when currentMoveIndex > 0', () => {
    let state = createInitialState(mockOpening);
    expect(canNavigateBack(state)).toBe(false);

    state = { ...state, currentMoveIndex: 1 };
    expect(canNavigateBack(state)).toBe(true);
  });

  test('canNavigateForward returns true when not at end', () => {
    let state = createInitialState(mockOpening);
    state = {
      ...state,
      moveHistory: [createMockMove('e4', 'white', 'fen1', 1)],
      currentMoveIndex: 0,
    };

    expect(canNavigateForward(state)).toBe(true);

    state = { ...state, currentMoveIndex: 1 };
    expect(canNavigateForward(state)).toBe(false);
  });

  test('isAtCurrentPosition returns true when at end of history', () => {
    let state = createInitialState(mockOpening);
    expect(isAtCurrentPosition(state)).toBe(true); // Empty history

    state = {
      ...state,
      moveHistory: [createMockMove('e4', 'white', 'fen1', 1)],
      currentMoveIndex: 1,
    };
    expect(isAtCurrentPosition(state)).toBe(true);

    state = { ...state, currentMoveIndex: 0 };
    expect(isAtCurrentPosition(state)).toBe(false);
  });

  test('shouldTriggerOpponentMove only true when all conditions met', () => {
    let state = createInitialState(mockOpening);
    state = {
      ...state,
      moveHistory: [createMockMove('e4', 'white', 'fen1', 1)],
      currentMoveIndex: 1,
      phase: 'opponent_turn',
      pendingOpponentMove: null,
    };

    expect(shouldTriggerOpponentMove(state)).toBe(true);

    // False when navigating
    state = { ...state, currentMoveIndex: 0 };
    expect(shouldTriggerOpponentMove(state)).toBe(false);

    // False when wrong phase
    state = { ...state, currentMoveIndex: 1, phase: 'user_turn' };
    expect(shouldTriggerOpponentMove(state)).toBe(false);

    // False when pending move exists
    state = { ...state, phase: 'opponent_turn', pendingOpponentMove: 'e6' };
    expect(shouldTriggerOpponentMove(state)).toBe(false);
  });
});

// ============================================================================
// Persistence Tests
// ============================================================================

describe('toTrainingSession', () => {
  test('converts SessionState to TrainingSession', () => {
    const state = createInitialState(mockOpening);
    const session = toTrainingSession(state);

    expect(session.sessionId).toBe(state.sessionId);
    expect(session.openingId).toBe(state.opening.eco);
    expect(session.openingName).toBe(state.opening.name);
    expect(session.status).toBe('active');
    expect(session.moveHistory).toBe(state.moveHistory);
  });
});

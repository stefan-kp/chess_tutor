/**
 * Integration Tests for OpeningTrainingContext
 *
 * These tests verify the full integration of:
 * - React Context (state management)
 * - SessionReducer (state machine)
 * - SessionOrchestrator (async operations)
 * - ChessEngine (Stockfish evaluation)
 *
 * This is Phase 5 of the refactoring plan - comprehensive testing.
 */

// Mock uuid before any imports
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-1234'),
}));

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { OpeningTrainingProvider, useOpeningTraining } from '../OpeningTrainingContext';
import { ChessEngine } from '@/lib/engine';
import { StockfishEvaluation } from '@/lib/stockfish';
import { OpeningMetadata } from '@/lib/openings';

// ============================================================================
// Mock Stockfish Engine
// ============================================================================

class MockStockfish implements ChessEngine {
  private mockEvaluations: Map<string, StockfishEvaluation> = new Map();
  private evaluationDelay: number = 0;

  async evaluate(fen: string, depth: number = 15): Promise<StockfishEvaluation> {
    // Simulate async delay
    if (this.evaluationDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.evaluationDelay));
    }

    // Return mocked evaluation if available
    if (this.mockEvaluations.has(fen)) {
      return this.mockEvaluations.get(fen)!;
    }

    // Default evaluation
    return {
      score: 25,
      mate: null,
      depth,
      bestMove: 'e4',
      ponder: null,
    };
  }

  async findBestMove(fen: string, depth: number = 15): Promise<string> {
    const eval_ = await this.evaluate(fen, depth);
    return eval_.bestMove;
  }

  terminate(): void {
    // Mock - do nothing
  }

  // Test helpers
  setMockEvaluation(fen: string, evaluation: StockfishEvaluation): void {
    this.mockEvaluations.set(fen, evaluation);
  }

  setEvaluationDelay(ms: number): void {
    this.evaluationDelay = ms;
  }

  clearMocks(): void {
    this.mockEvaluations.clear();
    this.evaluationDelay = 0;
  }
}

// ============================================================================
// Mock Engine Factory
// ============================================================================

let mockStockfishInstance: MockStockfish;

jest.mock('@/lib/engine', () => ({
  createEngine: jest.fn(async () => {
    mockStockfishInstance = new MockStockfish();
    return mockStockfishInstance;
  }),
}));

// ============================================================================
// Test Setup
// ============================================================================

const mockOpening: OpeningMetadata = {
  eco: 'C00',
  name: 'French Defense',
  moves: '1. e4 e6 2. d4 d5',
  src: 'test',
  wikipediaSlug: 'French_Defence',
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <OpeningTrainingProvider>{children}</OpeningTrainingProvider>
);

// ============================================================================
// Tests
// ============================================================================

describe('OpeningTrainingContext Integration Tests', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();

    // Reset mocks
    if (mockStockfishInstance) {
      mockStockfishInstance.clearMocks();
    }
  });

  // ==========================================================================
  // Context Initialization
  // ==========================================================================

  describe('Context Initialization', () => {
    test('initializes with null session', () => {
      const { result } = renderHook(() => useOpeningTraining(), { wrapper });

      expect(result.current.session).toBeNull();
      expect(result.current.opening).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    test('stockfish engine is created on mount', async () => {
      const { result } = renderHook(() => useOpeningTraining(), { wrapper });

      await waitFor(() => {
        expect(result.current.stockfish).not.toBeNull();
      }, { timeout: 3000 });
    });
  });

  // ==========================================================================
  // Session Creation
  // ==========================================================================

  describe('Session Creation', () => {
    test('creates new session successfully', async () => {
      const { result } = renderHook(() => useOpeningTraining(), { wrapper });

      // Wait for stockfish to be ready
      await waitFor(() => {
        expect(result.current.stockfish).not.toBeNull();
      }, { timeout: 3000 });

      // Initialize session
      await act(async () => {
        await result.current.initializeSession(mockOpening, true);
      });

      // Verify session was created
      await waitFor(() => {
        expect(result.current.session).not.toBeNull();
        expect(result.current.session?.phase).toBe('user_turn');
        expect(result.current.opening?.eco).toBe('C00');
      });
    });

    test('session has initial evaluation', async () => {
      const { result } = renderHook(() => useOpeningTraining(), { wrapper });

      await waitFor(() => {
        expect(result.current.stockfish).not.toBeNull();
      }, { timeout: 3000 });

      await act(async () => {
        await result.current.initializeSession(mockOpening, true);
      });

      await waitFor(() => {
        expect(result.current.session?.initialEvaluation).toBeDefined();
        expect(typeof result.current.session?.initialEvaluation).toBe('number');
      });
    });

    test('shows loading state during initialization', async () => {
      const { result } = renderHook(() => useOpeningTraining(), { wrapper });

      await waitFor(() => {
        expect(result.current.stockfish).not.toBeNull();
      }, { timeout: 3000 });

      // Set a delay to catch loading state
      mockStockfishInstance.setEvaluationDelay(100);

      let loadingWasTrue = false;

      act(() => {
        result.current.initializeSession(mockOpening, true);
      });

      // Check if loading becomes true
      await waitFor(() => {
        if (result.current.isLoading) {
          loadingWasTrue = true;
        }
        return !result.current.isLoading;
      }, { timeout: 3000 });

      expect(loadingWasTrue).toBe(true);
    });
  });

  // ==========================================================================
  // User Move Processing
  // ==========================================================================

  describe('User Move Processing', () => {
    test('processes legal user move', async () => {
      const { result } = renderHook(() => useOpeningTraining(), { wrapper });

      await waitFor(() => {
        expect(result.current.stockfish).not.toBeNull();
      }, { timeout: 3000 });

      await act(async () => {
        await result.current.initializeSession(mockOpening, true);
      });

      await waitFor(() => {
        expect(result.current.session?.phase).toBe('user_turn');
      });

      // Make a move
      await act(async () => {
        await result.current.makeMove('e4');
      });

      // Verify move was added
      await waitFor(() => {
        expect(result.current.session?.moveHistory.length).toBe(1);
        expect(result.current.session?.moveHistory[0].san).toBe('e4');
      });
    });

    test('classifies in-theory move correctly', async () => {
      const { result } = renderHook(() => useOpeningTraining(), { wrapper });

      await waitFor(() => {
        expect(result.current.stockfish).not.toBeNull();
      }, { timeout: 3000 });

      await act(async () => {
        await result.current.initializeSession(mockOpening, true);
      });

      await waitFor(() => {
        expect(result.current.session?.phase).toBe('user_turn');
      });

      await act(async () => {
        await result.current.makeMove('e4');
      });

      await waitFor(() => {
        const lastMove = result.current.session?.moveHistory[0];
        expect(lastMove?.classification.category).toBe('in-theory');
        expect(lastMove?.classification.inRepertoire).toBe(true);
      });
    });

    test('provides move feedback', async () => {
      const { result } = renderHook(() => useOpeningTraining(), { wrapper });

      await waitFor(() => {
        expect(result.current.stockfish).not.toBeNull();
      }, { timeout: 3000 });

      await act(async () => {
        await result.current.initializeSession(mockOpening, true);
      });

      await waitFor(() => {
        expect(result.current.session?.phase).toBe('user_turn');
      });

      await act(async () => {
        await result.current.makeMove('e4');
      });

      await waitFor(() => {
        expect(result.current.currentFeedback).not.toBeNull();
        expect(result.current.currentFeedback?.move.san).toBe('e4');
      });
    });

    test('handles off-book move', async () => {
      const { result } = renderHook(() => useOpeningTraining(), { wrapper });

      await waitFor(() => {
        expect(result.current.stockfish).not.toBeNull();
      }, { timeout: 3000 });

      await act(async () => {
        await result.current.initializeSession(mockOpening, true);
      });

      await waitFor(() => {
        expect(result.current.session?.phase).toBe('user_turn');
      });

      // Make an off-book move
      await act(async () => {
        await result.current.makeMove('d4');
      });

      await waitFor(() => {
        const lastMove = result.current.session?.moveHistory[0];
        expect(lastMove?.classification.inRepertoire).toBe(false);
        expect(['playable', 'weak']).toContain(lastMove?.classification.category);
      });
    });
  });

  // ==========================================================================
  // Opponent Move Processing
  // ==========================================================================

  describe('Opponent Move Processing', () => {
    test('triggers automatic opponent move after user move', async () => {
      const { result } = renderHook(() => useOpeningTraining(), { wrapper });

      await waitFor(() => {
        expect(result.current.stockfish).not.toBeNull();
      }, { timeout: 3000 });

      await act(async () => {
        await result.current.initializeSession(mockOpening, true);
      });

      await waitFor(() => {
        expect(result.current.session?.phase).toBe('user_turn');
      });

      // Make user move
      await act(async () => {
        await result.current.makeMove('e4');
      });

      // Wait for opponent's automatic move
      await waitFor(() => {
        expect(result.current.session?.moveHistory.length).toBe(2);
        expect(result.current.session?.moveHistory[1].san).toBe('e6');
        expect(result.current.session?.moveHistory[1].color).toBe('black');
      }, { timeout: 3000 });
    });

    test('opponent moves are classified as in-theory', async () => {
      const { result } = renderHook(() => useOpeningTraining(), { wrapper });

      await waitFor(() => {
        expect(result.current.stockfish).not.toBeNull();
      }, { timeout: 3000 });

      await act(async () => {
        await result.current.initializeSession(mockOpening, true);
      });

      await waitFor(() => {
        expect(result.current.session?.phase).toBe('user_turn');
      });

      await act(async () => {
        await result.current.makeMove('e4');
      });

      await waitFor(() => {
        const opponentMove = result.current.session?.moveHistory[1];
        expect(opponentMove?.classification.category).toBe('in-theory');
        expect(opponentMove?.classification.inRepertoire).toBe(true);
      }, { timeout: 3000 });
    });
  });

  // ==========================================================================
  // Move Navigation
  // ==========================================================================

  describe('Move Navigation', () => {
    test('navigates to specific move index', async () => {
      const { result } = renderHook(() => useOpeningTraining(), { wrapper });

      await waitFor(() => {
        expect(result.current.stockfish).not.toBeNull();
      }, { timeout: 3000 });

      await act(async () => {
        await result.current.initializeSession(mockOpening, true);
      });

      await waitFor(() => {
        expect(result.current.session?.phase).toBe('user_turn');
      });

      // Make two moves
      await act(async () => {
        await result.current.makeMove('e4');
      });

      await waitFor(() => {
        expect(result.current.session?.moveHistory.length).toBe(2);
      }, { timeout: 3000 });

      await act(async () => {
        await result.current.makeMove('d4');
      });

      await waitFor(() => {
        expect(result.current.session?.moveHistory.length).toBeGreaterThanOrEqual(3);
      }, { timeout: 3000 });

      // Navigate back to move 1
      act(() => {
        result.current.navigateToMove(0);
      });

      expect(result.current.session?.currentMoveIndex).toBe(0);
    });

    test('updates feedback when navigating', async () => {
      const { result } = renderHook(() => useOpeningTraining(), { wrapper });

      await waitFor(() => {
        expect(result.current.stockfish).not.toBeNull();
      }, { timeout: 3000 });

      await act(async () => {
        await result.current.initializeSession(mockOpening, true);
      });

      await waitFor(() => {
        expect(result.current.session?.phase).toBe('user_turn');
      });

      await act(async () => {
        await result.current.makeMove('e4');
      });

      await waitFor(() => {
        expect(result.current.session?.moveHistory.length).toBe(2);
      }, { timeout: 3000 });

      // Navigate to first move (index 1 = after e4, index 0 = start)
      await act(async () => {
        result.current.navigateToMove(1);
      });

      // Wait for feedback to update
      await waitFor(() => {
        expect(result.current.currentFeedback?.move.san).toBe('e4');
      });
    });
  });

  // ==========================================================================
  // Session Persistence
  // ==========================================================================

  describe('Session Persistence', () => {
    test('saves session to localStorage', async () => {
      const { result } = renderHook(() => useOpeningTraining(), { wrapper });

      await waitFor(() => {
        expect(result.current.stockfish).not.toBeNull();
      }, { timeout: 3000 });

      await act(async () => {
        await result.current.initializeSession(mockOpening, true);
      });

      await waitFor(() => {
        expect(result.current.session?.phase).toBe('user_turn');
      });

      await act(async () => {
        await result.current.makeMove('e4');
      });

      // Wait for save to occur
      await waitFor(() => {
        const saved = localStorage.getItem('openingTraining_session_C00');
        expect(saved).not.toBeNull();
      }, { timeout: 3000 });
    });

    test('loads existing session', async () => {
      // Pre-populate localStorage with a session
      const existingSession = {
        sessionId: 'test-session-123',
        openingId: 'C00',
        openingName: 'French Defense',
        status: 'active',
        currentFEN: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
        currentMoveIndex: 1,
        moveHistory: [
          {
            moveNumber: 1,
            color: 'white',
            san: 'e4',
            uci: 'e2e4',
            fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
            evaluation: { score: 25, mate: null, depth: 15, bestMove: 'e6', ponder: null },
            classification: {
              category: 'in-theory',
              inRepertoire: true,
              evaluationChange: 0,
              isSignificantSwing: false,
              theoreticalAlternatives: [],
            },
            timestamp: Date.now(),
          },
        ],
        deviationMoveIndex: null,
        initialEvaluation: 25,
        startedAt: Date.now(),
        lastUpdatedAt: Date.now(),
      };

      localStorage.setItem('openingTraining_session_C00', JSON.stringify(existingSession));

      // Verify it's in localStorage
      const stored = localStorage.getItem('openingTraining_session_C00');
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored!);
      expect(parsed.moveHistory.length).toBe(1);

      const { result } = renderHook(() => useOpeningTraining(), { wrapper });

      await waitFor(() => {
        expect(result.current.stockfish).not.toBeNull();
      }, { timeout: 3000 });

      // Load without forcing new
      await act(async () => {
        await result.current.initializeSession(mockOpening, false);
      });

      // Wait for session to be loaded
      await waitFor(() => {
        expect(result.current.session).not.toBeNull();
        expect(result.current.session?.moveHistory).toBeDefined();
        expect(result.current.session?.moveHistory.length).toBe(1);
      }, { timeout: 3000 });

      // Verify the loaded move
      expect(result.current.session?.moveHistory[0].san).toBe('e4');
    });
  });

  // ==========================================================================
  // Session Reset
  // ==========================================================================

  describe('Session Reset', () => {
    test('resets session to initial state', async () => {
      const { result } = renderHook(() => useOpeningTraining(), { wrapper });

      await waitFor(() => {
        expect(result.current.stockfish).not.toBeNull();
      }, { timeout: 3000 });

      await act(async () => {
        await result.current.initializeSession(mockOpening, true);
      });

      await waitFor(() => {
        expect(result.current.session?.phase).toBe('user_turn');
      });

      await act(async () => {
        await result.current.makeMove('e4');
      });

      await waitFor(() => {
        expect(result.current.session?.moveHistory.length).toBeGreaterThan(0);
      });

      // Reset session - this clears opening and feedback but creates a new initial session state
      act(() => {
        result.current.resetSession();
      });

      // After reset: session is cleared, UI state is reset
      expect(result.current.session).toBeNull();
      expect(result.current.opening).toBeNull();
      expect(result.current.currentFeedback).toBeNull();
    });
  });

  // ==========================================================================
  // Error Handling
  // ==========================================================================

  describe('Error Handling', () => {
    test('handles initialization error gracefully', async () => {
      // Mock engine to throw error
      const { createEngine } = require('@/lib/engine');
      createEngine.mockRejectedValueOnce(new Error('Engine initialization failed'));

      const { result } = renderHook(() => useOpeningTraining(), { wrapper });

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to initialize chess engine');
      }, { timeout: 3000 });
    });

    test('handles move error when session not initialized', async () => {
      const { result } = renderHook(() => useOpeningTraining(), { wrapper });

      await waitFor(() => {
        expect(result.current.stockfish).not.toBeNull();
      }, { timeout: 3000 });

      // Try to make move without initializing session
      await act(async () => {
        await result.current.makeMove('e4');
      });

      expect(result.current.error).toBe('Session not initialized');
    });
  });

  // ==========================================================================
  // UNDO Functionality (DeviationDialog Undo Button)
  // ==========================================================================

  describe('UNDO Functionality', () => {
    test('undoToMove truncates history and resets deviation', async () => {
      const { result } = renderHook(() => useOpeningTraining(), { wrapper });

      await waitFor(() => {
        expect(result.current.stockfish).not.toBeNull();
      }, { timeout: 3000 });

      await act(async () => {
        await result.current.initializeSession(mockOpening, true);
      });

      await waitFor(() => {
        expect(result.current.session?.phase).toBe('user_turn');
      });

      // Make correct move e4
      await act(async () => {
        await result.current.makeMove('e4');
      });

      // Wait for opponent move e6
      await waitFor(() => {
        expect(result.current.session?.moveHistory.length).toBe(2);
        expect(result.current.session?.moveHistory[1].san).toBe('e6');
      }, { timeout: 3000 });

      // Make wrong move (Nf3 instead of d4)
      await act(async () => {
        await result.current.makeMove('Nf3');
      });

      // Verify deviation detected
      await waitFor(() => {
        expect(result.current.session?.moveHistory.length).toBe(3);
        expect(result.current.session?.deviationMoveIndex).toBe(2);
        expect(result.current.session?.phase).toBe('off_book');
      });

      // User clicks "Undo" in DeviationDialog - undoToMove(deviationMoveIndex - 1)
      await act(async () => {
        result.current.undoToMove(1); // Undo to after e4, e6
      });

      // Verify undo worked correctly
      await waitFor(() => {
        expect(result.current.session?.moveHistory.length).toBe(2); // Only e4, e6 remain
        expect(result.current.session?.moveHistory[0].san).toBe('e4');
        expect(result.current.session?.moveHistory[1].san).toBe('e6');
        expect(result.current.session?.deviationMoveIndex).toBeNull(); // Deviation cleared
        expect(result.current.session?.phase).toBe('user_turn'); // User can make correct move
      });

      // CRITICAL: Verify feedback is cleared
      expect(result.current.currentFeedback).toBeNull();
    });

    test('undo allows user to make correct move afterwards', async () => {
      const { result } = renderHook(() => useOpeningTraining(), { wrapper });

      await waitFor(() => {
        expect(result.current.stockfish).not.toBeNull();
      }, { timeout: 3000 });

      await act(async () => {
        await result.current.initializeSession(mockOpening, true);
      });

      await waitFor(() => {
        expect(result.current.session?.phase).toBe('user_turn');
      });

      // Make correct move e4
      await act(async () => {
        await result.current.makeMove('e4');
      });

      // Wait for opponent move e6
      await waitFor(() => {
        expect(result.current.session?.moveHistory.length).toBe(2);
      }, { timeout: 3000 });

      // Make wrong move
      await act(async () => {
        await result.current.makeMove('Nf3');
      });

      await waitFor(() => {
        expect(result.current.session?.phase).toBe('off_book');
      });

      // Undo
      await act(async () => {
        result.current.undoToMove(1);
      });

      await waitFor(() => {
        expect(result.current.session?.phase).toBe('user_turn');
      });

      // Now make the CORRECT move d4
      await act(async () => {
        await result.current.makeMove('d4');
      });

      // Wait for the move to be processed and opponent to respond
      await waitFor(() => {
        expect(result.current.session?.moveHistory.length).toBe(4); // e4, e6, d4, d5
        expect(result.current.session?.moveHistory[2].san).toBe('d4');
        expect(result.current.session?.moveHistory[3].san).toBe('d5');
        expect(result.current.session?.deviationMoveIndex).toBeNull(); // Still in theory
      }, { timeout: 5000 });
    });

    test('undo from first wrong move returns to starting position', async () => {
      const { result } = renderHook(() => useOpeningTraining(), { wrapper });

      await waitFor(() => {
        expect(result.current.stockfish).not.toBeNull();
      }, { timeout: 3000 });

      await act(async () => {
        await result.current.initializeSession(mockOpening, true);
      });

      await waitFor(() => {
        expect(result.current.session?.phase).toBe('user_turn');
      });

      // Make wrong first move (d4 instead of e4)
      await act(async () => {
        await result.current.makeMove('d4');
      });

      await waitFor(() => {
        expect(result.current.session?.deviationMoveIndex).toBe(0);
        expect(result.current.session?.phase).toBe('off_book');
      });

      // Undo to before first move (-1)
      await act(async () => {
        result.current.undoToMove(-1);
      });

      // Verify return to starting position
      await waitFor(() => {
        expect(result.current.session?.moveHistory.length).toBe(0);
        expect(result.current.session?.currentMoveIndex).toBe(0);
        expect(result.current.session?.deviationMoveIndex).toBeNull();
        expect(result.current.session?.phase).toBe('user_turn');
      });
    });
  });

  // ==========================================================================
  // Deviation Tracking
  // ==========================================================================

  describe('Deviation Tracking', () => {
    test('tracks deviation from repertoire', async () => {
      const { result } = renderHook(() => useOpeningTraining(), { wrapper });

      await waitFor(() => {
        expect(result.current.stockfish).not.toBeNull();
      }, { timeout: 3000 });

      await act(async () => {
        await result.current.initializeSession(mockOpening, true);
      });

      await waitFor(() => {
        expect(result.current.session?.phase).toBe('user_turn');
      });

      // Make off-book move
      await act(async () => {
        await result.current.makeMove('d4');
      });

      await waitFor(() => {
        expect(result.current.session?.deviationMoveIndex).toBe(0);
      });
    });

    test('deviationMoveIndex stays null for in-theory moves', async () => {
      const { result } = renderHook(() => useOpeningTraining(), { wrapper });

      await waitFor(() => {
        expect(result.current.stockfish).not.toBeNull();
      }, { timeout: 3000 });

      await act(async () => {
        await result.current.initializeSession(mockOpening, true);
      });

      await waitFor(() => {
        expect(result.current.session?.phase).toBe('user_turn');
      });

      // Make in-theory move
      await act(async () => {
        await result.current.makeMove('e4');
      });

      await waitFor(() => {
        expect(result.current.session?.moveHistory.length).toBe(2);
        expect(result.current.session?.deviationMoveIndex).toBeNull();
      }, { timeout: 3000 });
    });
  });
});

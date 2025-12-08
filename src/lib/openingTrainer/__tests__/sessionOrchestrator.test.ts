import { SessionOrchestrator } from '../sessionOrchestrator';
import { createInitialState } from '../sessionReducer';
import { ChessEngine } from '@/lib/engine';
import { StockfishEvaluation } from '@/lib/stockfish';
import { OpeningMetadata } from '@/lib/openings';
import { STARTING_FEN } from '../constants';
import { clearEvaluationCache } from '../engineService';

// ============================================================================
// Mock Stockfish Engine
// ============================================================================

class MockStockfish implements ChessEngine {
  private mockEvaluations: Map<string, StockfishEvaluation> = new Map();

  async evaluate(fen: string, depth: number = 15): Promise<StockfishEvaluation> {
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

  // Test helper to set mock evaluations
  setMockEvaluation(fen: string, evaluation: StockfishEvaluation): void {
    this.mockEvaluations.set(fen, evaluation);
  }
}

// ============================================================================
// Test Setup
// ============================================================================

const mockOpening: OpeningMetadata = {
  eco: 'C00',
  name: 'French Defense',
  moves: '1. e4 e6 2. d4 d5',
  wikipediaSlug: 'French_Defence',
};

function createMockStockfish(): MockStockfish {
  return new MockStockfish();
}

// ============================================================================
// Tests
// ============================================================================

describe('SessionOrchestrator', () => {
  let stockfish: MockStockfish;
  let orchestrator: SessionOrchestrator;

  beforeEach(() => {
    // Clear evaluation cache to ensure tests are isolated
    clearEvaluationCache();

    stockfish = createMockStockfish();
    orchestrator = new SessionOrchestrator(stockfish);
  });

  afterEach(() => {
    orchestrator.destroy();
  });

  // ==========================================================================
  // User Move Processing
  // ==========================================================================

  describe('processUserMove', () => {
    test('processes legal user move successfully', async () => {
      const state = createInitialState(mockOpening);

      const result = await orchestrator.processUserMove(state, 'e4', false);

      expect(result.actions).toHaveLength(1);
      expect(result.actions[0].type).toBe('USER_MOVE_COMPLETED');
      expect(result.moveEntry.san).toBe('e4');
      expect(result.moveEntry.color).toBe('white');
      expect(result.moveEntry.evaluation).toBeDefined();
    });

    test('throws error for illegal move', async () => {
      const state = createInitialState(mockOpening);

      await expect(
        orchestrator.processUserMove(state, 'e5', false) // Illegal for White
      ).rejects.toThrow('Illegal move: e5');
    });

    test('classifies in-theory move correctly', async () => {
      const state = createInitialState(mockOpening);

      const result = await orchestrator.processUserMove(state, 'e4', false);

      expect(result.moveEntry.classification.category).toBe('in-theory');
      expect(result.moveEntry.classification.inRepertoire).toBe(true);
    });

    test('classifies off-book move as playable or weak', async () => {
      const state = createInitialState(mockOpening);

      // Mock a small evaluation loss
      stockfish.setMockEvaluation(
        'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3 0 1',
        {
          score: 10, // Small loss from 25 to 10
          mate: null,
          depth: 15,
          bestMove: 'e4',
          ponder: null,
        }
      );

      const result = await orchestrator.processUserMove(state, 'd4', false); // Wrong move

      expect(result.moveEntry.classification.inRepertoire).toBe(false);
      expect(['playable', 'weak']).toContain(result.moveEntry.classification.category);
    });

    test('handles wasNavigatedBack flag', async () => {
      let state = createInitialState(mockOpening);
      state = {
        ...state,
        moveHistory: [
          {
            moveNumber: 1,
            color: 'white',
            san: 'd4',
            uci: 'd2d4',
            fen: 'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3 0 1',
            evaluation: { score: 25, mate: null, depth: 15, bestMove: 'e4', ponder: null },
            classification: {
              category: 'playable',
              inRepertoire: false,
              evaluationChange: 0,
              isSignificantSwing: false,
              theoreticalAlternatives: ['e4'],
            },
            timestamp: Date.now(),
          },
        ],
        currentMoveIndex: 0, // Navigated back
      };

      const result = await orchestrator.processUserMove(state, 'e4', true); // wasNavigatedBack = true

      expect(result.actions[0]).toMatchObject({
        type: 'USER_MOVE_COMPLETED',
        wasNavigatedBack: true,
      });
    });

    test('evaluates position with Stockfish', async () => {
      const state = createInitialState(mockOpening);

      const result = await orchestrator.processUserMove(state, 'e4', false);

      // Verify that an evaluation was obtained
      expect(result.moveEntry.evaluation).toBeDefined();
      expect(result.moveEntry.evaluation.score).toBeDefined();
      expect(result.moveEntry.evaluation.depth).toBe(12); // STOCKFISH_DEPTH
      expect(result.moveEntry.evaluation.bestMove).toBeDefined();
    });
  });

  // ==========================================================================
  // Opponent Move Processing
  // ==========================================================================

  describe('processOpponentMove', () => {
    test('processes opponent auto-move successfully', async () => {
      let state = createInitialState(mockOpening);
      state = {
        ...state,
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
        currentMoveIndex: 1,
        currentFEN: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
      };

      const result = await orchestrator.processOpponentMove(state, 0); // No delay for testing

      expect(result.actions).toHaveLength(1);
      expect(result.actions[0].type).toBe('OPPONENT_MOVE_COMPLETED');
      expect(result.moveEntry.san).toBe('e6'); // Expected from repertoire
      expect(result.moveEntry.color).toBe('black');
    });

    test('throws error if no opponent move available', async () => {
      let state = createInitialState(mockOpening);
      state = {
        ...state,
        moveHistory: [
          { moveNumber: 1, color: 'white', san: 'e4', uci: 'e2e4', fen: 'fen1', evaluation: { score: 0, mate: null, depth: 15, bestMove: 'e4', ponder: null }, classification: { category: 'in-theory', inRepertoire: true, evaluationChange: 0, isSignificantSwing: false, theoreticalAlternatives: [] }, timestamp: Date.now() },
          { moveNumber: 1, color: 'black', san: 'e6', uci: 'e7e6', fen: 'fen2', evaluation: { score: 0, mate: null, depth: 15, bestMove: 'e4', ponder: null }, classification: { category: 'in-theory', inRepertoire: true, evaluationChange: 0, isSignificantSwing: false, theoreticalAlternatives: [] }, timestamp: Date.now() },
          { moveNumber: 2, color: 'white', san: 'd4', uci: 'd2d4', fen: 'fen3', evaluation: { score: 0, mate: null, depth: 15, bestMove: 'e4', ponder: null }, classification: { category: 'in-theory', inRepertoire: true, evaluationChange: 0, isSignificantSwing: false, theoreticalAlternatives: [] }, timestamp: Date.now() },
          { moveNumber: 2, color: 'black', san: 'd5', uci: 'd7d5', fen: 'fen4', evaluation: { score: 0, mate: null, depth: 15, bestMove: 'e4', ponder: null }, classification: { category: 'in-theory', inRepertoire: true, evaluationChange: 0, isSignificantSwing: false, theoreticalAlternatives: [] }, timestamp: Date.now() },
        ],
        currentMoveIndex: 4, // At end of repertoire
        currentFEN: 'fen4',
      };

      await expect(
        orchestrator.processOpponentMove(state, 0)
      ).rejects.toThrow('No opponent move available');
    });

    test('opponent moves are always classified as in-theory', async () => {
      let state = createInitialState(mockOpening);
      state = {
        ...state,
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
        currentMoveIndex: 1,
        currentFEN: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
      };

      const result = await orchestrator.processOpponentMove(state, 0);

      expect(result.moveEntry.classification.category).toBe('in-theory');
      expect(result.moveEntry.classification.inRepertoire).toBe(true);
    });

    test('adds delay before opponent move', async () => {
      let state = createInitialState(mockOpening);
      state = {
        ...state,
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
        currentMoveIndex: 1,
        currentFEN: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
      };

      const startTime = Date.now();
      await orchestrator.processOpponentMove(state, 100); // 100ms delay
      const endTime = Date.now();

      expect(endTime - startTime).toBeGreaterThanOrEqual(100);
    });
  });

  // ==========================================================================
  // Initial Evaluation
  // ==========================================================================

  describe('getInitialEvaluation', () => {
    test('returns evaluation for starting position', async () => {
      const evaluation = await orchestrator.getInitialEvaluation();

      expect(typeof evaluation).toBe('number');
      expect(evaluation).toBe(25); // Mock default
    });

    test('can evaluate custom FEN', async () => {
      const customFen = 'rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
      stockfish.setMockEvaluation(customFen, {
        score: 15,
        mate: null,
        depth: 15,
        bestMove: 'd4',
        ponder: null,
      });

      const evaluation = await orchestrator.getInitialEvaluation(customFen);

      expect(evaluation).toBe(15);
    });
  });

  // ==========================================================================
  // Cleanup
  // ==========================================================================

  describe('destroy', () => {
    test('clears pending operations', () => {
      orchestrator.cancelPendingOperations();
      orchestrator.destroy();

      // No error should be thrown
      expect(true).toBe(true);
    });
  });
});

import { Chess } from 'chess.js';
import { ChessEngine } from '@/lib/engine';
import { OpeningMetadata } from '@/lib/openings';
import { MoveHistoryEntry, MoveFeedbackClassification } from '@/types/openingTraining';
import { StockfishEvaluation } from '@/lib/stockfish';
import { SessionState, SessionAction } from './sessionReducer';
import {
  validateMove,
  getExpectedNextMoves,
  classifyMove as classifyMoveLogic,
  getOpponentNextMove,
} from './gameLogic';
import { evaluatePosition } from './engineService';

/**
 * Session Orchestrator
 *
 * Handles all async operations (Stockfish evaluation, delays) and
 * coordinates between the pure reducer and external services.
 *
 * This layer DOES have side effects, but is still testable with mocked Stockfish.
 */

export interface ProcessMoveResult {
  actions: SessionAction[];
  moveEntry: MoveHistoryEntry;
}

export class SessionOrchestrator {
  private stockfish: ChessEngine;
  private pendingOperations: Set<Promise<any>> = new Set();

  constructor(stockfish: ChessEngine) {
    this.stockfish = stockfish;
  }

  /**
   * Process a user's move: validate, evaluate, classify
   * Returns actions to dispatch to the reducer
   */
  async processUserMove(
    state: SessionState,
    san: string,
    wasNavigatedBack: boolean = false
  ): Promise<ProcessMoveResult> {
    // Validate the move is legal from current position
    const moveResult = validateMove(state.currentFEN, san);
    if (!moveResult) {
      throw new Error(`Illegal move: ${san}`);
    }

    // Get FEN after the move
    const chess = new Chess(state.currentFEN);
    chess.move(san);
    const newFEN = chess.fen();

    // Evaluate the new position
    const currentEval = await evaluatePosition(newFEN, this.stockfish);

    // Get previous evaluation
    const previousEval = this.getPreviousEvaluation(state);

    // Check if move is in repertoire
    const truncatedHistory = wasNavigatedBack
      ? state.moveHistory.slice(0, state.currentMoveIndex)
      : state.moveHistory;

    const expectedMoves = getExpectedNextMoves(state.opening, truncatedHistory.length);
    const isInRepertoire = expectedMoves.includes(san);

    // Classify the move
    const classification = classifyMoveLogic(
      san,
      expectedMoves,
      expectedMoves, // For MVP, variants = expected
      currentEval,
      previousEval
    );

    // Create move entry
    const moveEntry: MoveHistoryEntry = {
      moveNumber: Math.floor(truncatedHistory.length / 2) + 1,
      color: moveResult.color === 'w' ? 'white' : 'black',
      san: moveResult.san,
      uci: moveResult.uci,
      fen: newFEN,
      evaluation: currentEval,
      classification: this.toMoveFeedbackClassification(classification, isInRepertoire),
      timestamp: Date.now(),
    };

    // Return actions for reducer
    const actions: SessionAction[] = [
      {
        type: 'USER_MOVE_COMPLETED',
        moveEntry,
        wasNavigatedBack,
      },
    ];

    return { actions, moveEntry };
  }

  /**
   * Process an automatic opponent move
   * Returns actions to dispatch to the reducer
   */
  async processOpponentMove(
    state: SessionState,
    delaMs: number = 600
  ): Promise<ProcessMoveResult> {
    // Get opponent's next move from repertoire
    const opponentSan = getOpponentNextMove(state.opening, state.moveHistory.length);
    if (!opponentSan) {
      throw new Error('No opponent move available (end of repertoire)');
    }

    // Add natural delay
    if (delaMs > 0) {
      await this.delay(delaMs);
    }

    // Validate and execute the move
    const moveResult = validateMove(state.currentFEN, opponentSan);
    if (!moveResult) {
      throw new Error(`Opponent move invalid: ${opponentSan}`);
    }

    // Get FEN after the move
    const chess = new Chess(state.currentFEN);
    chess.move(opponentSan);
    const newFEN = chess.fen();

    // Evaluate the new position
    const currentEval = await evaluatePosition(newFEN, this.stockfish);

    // Get previous evaluation
    const previousEval = this.getPreviousEvaluation(state);

    // Opponent moves are always in-theory
    const classification: MoveFeedbackClassification = {
      category: 'in-theory',
      inRepertoire: true,
      evaluationChange: currentEval.score - previousEval.score,
      isSignificantSwing: Math.abs(currentEval.score - previousEval.score) >= 50,
      theoreticalAlternatives: [],
    };

    // Create move entry
    const moveEntry: MoveHistoryEntry = {
      moveNumber: Math.floor(state.moveHistory.length / 2) + 1,
      color: moveResult.color === 'w' ? 'white' : 'black',
      san: moveResult.san,
      uci: moveResult.uci,
      fen: newFEN,
      evaluation: currentEval,
      classification,
      timestamp: Date.now(),
    };

    // Return actions for reducer
    const actions: SessionAction[] = [
      {
        type: 'OPPONENT_MOVE_COMPLETED',
        moveEntry,
      },
    ];

    return { actions, moveEntry };
  }

  /**
   * Get initial position evaluation
   */
  async getInitialEvaluation(fen: string = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'): Promise<number> {
    const evaluation = await evaluatePosition(fen, this.stockfish);
    return evaluation.score;
  }

  /**
   * Cancel all pending operations
   */
  cancelPendingOperations(): void {
    // For now, we can't really cancel Stockfish evaluations once started
    // But we can clear the tracking set
    this.pendingOperations.clear();
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.cancelPendingOperations();
    // Note: Stockfish engine cleanup is handled by the Context
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private getPreviousEvaluation(state: SessionState): StockfishEvaluation {
    if (state.moveHistory.length > 0) {
      return state.moveHistory[state.moveHistory.length - 1].evaluation;
    }

    // No moves yet, return initial evaluation
    return {
      score: state.initialEvaluation,
      mate: null,
      depth: 0,
      bestMove: '',
      ponder: null,
    };
  }

  private toMoveFeedbackClassification(
    classification: ReturnType<typeof classifyMoveLogic>,
    isInRepertoire: boolean
  ): MoveFeedbackClassification {
    return {
      category: classification.category,
      inRepertoire: isInRepertoire,
      evaluationChange: classification.evaluationChange,
      isSignificantSwing: Math.abs(classification.evaluationChange) >= 50,
      theoreticalAlternatives: classification.theoreticalAlternatives,
    };
  }

  private delay(ms: number): Promise<void> {
    const promise = new Promise<void>((resolve) => setTimeout(resolve, ms));
    this.pendingOperations.add(promise);
    promise.finally(() => this.pendingOperations.delete(promise));
    return promise;
  }
}

/**
 * Factory function to create orchestrator
 */
export function createOrchestrator(stockfish: ChessEngine): SessionOrchestrator {
  return new SessionOrchestrator(stockfish);
}

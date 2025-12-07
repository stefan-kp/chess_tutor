import { StockfishEvaluation } from '@/lib/stockfish';

/**
 * Type definitions for the Interactive Chess Opening Training feature
 */

// Move categorization types
export type MoveCategory = 'in-theory' | 'playable' | 'weak';

// Training session status
export type TrainingSessionStatus = 'active' | 'completed' | 'abandoned';

/**
 * Represents an active or completed opening training session
 */
export interface TrainingSession {
  sessionId: string;
  openingId: string;
  openingName: string;
  startedAt: number; // Unix timestamp (milliseconds)
  lastUpdatedAt: number; // Unix timestamp (milliseconds)
  status: TrainingSessionStatus;
  currentFEN: string;
  currentMoveIndex: number;
  moveHistory: MoveHistoryEntry[];
  deviationMoveIndex: number | null; // Index where user first left theory
  initialEvaluation: number; // Starting position evaluation (centipawns)
}

/**
 * Represents a single move in the training session
 */
export interface MoveHistoryEntry {
  moveNumber: number; // Full move number (1, 2, 3, ...)
  color: 'white' | 'black';
  san: string; // Standard Algebraic Notation (e.g., "Nf3", "exd5")
  uci: string; // UCI notation (e.g., "e2e4", "e7e5")
  fen: string; // Position AFTER this move
  evaluation: StockfishEvaluation;
  classification: MoveFeedbackClassification;
  timestamp: number; // Unix timestamp when move was played
}

/**
 * Classification of a user's move relative to opening theory and objective strength
 */
export interface MoveFeedbackClassification {
  category: MoveCategory;
  inRepertoire: boolean; // Whether move matches expected repertoire line
  evaluationChange: number; // Centipawn change from previous position
  isSignificantSwing: boolean; // Whether eval change exceeds threshold (±50cp)
  theoreticalAlternatives: string[]; // List of in-theory moves (empty if only one)
}

/**
 * Complete feedback package for a user's move
 */
export interface MoveFeedback {
  move: MoveHistoryEntry;
  classification: MoveFeedbackClassification;
  evaluation: StockfishEvaluation;
  previousEvaluation: StockfishEvaluation;
  llmExplanation: string; // Natural language explanation from tutor
  generatedAt: number; // Unix timestamp
}

/**
 * Wikipedia summary for an opening
 */
export interface WikipediaSummary {
  openingName: string; // Opening name used for lookup
  title: string; // Wikipedia article title
  extract: string; // Plain text summary (2-3 paragraphs)
  url: string; // Full Wikipedia article URL
  fetchedAt: number; // Unix timestamp when fetched
  expiresAt: number; // Unix timestamp for cache expiration
}

/**
 * Persisted training session (localStorage)
 * Only active sessions are persisted
 */
export type PersistedTrainingSession = Omit<TrainingSession, 'status'> & {
  status: 'active';
};

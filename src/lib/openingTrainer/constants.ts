/**
 * Constants for the Interactive Chess Opening Training feature
 */

/**
 * Move categorization thresholds
 * Based on research.md: -50cp confirmed as industry standard
 */
export const MOVE_CATEGORIZATION_THRESHOLDS = {
  /** Centipawn loss threshold for categorizing a move as "weak" (half a pawn) */
  WEAK_MOVE_CP_LOSS: 50,

  /** Threshold for highlighting significant evaluation swings */
  SIGNIFICANT_SWING_CP: 50,

  /** Centipawn equivalent for mate situations */
  MATE_SCORE_THRESHOLD: 10000,
} as const;

/**
 * Stockfish engine configuration
 * Based on research.md: Depth 12 targets 1.2-1.8 seconds for 2-second goal
 */
export const STOCKFISH_DEPTH = 12;

/**
 * Session persistence configuration
 */
export const SESSION_EXPIRY_DAYS = 7;

/**
 * Wikipedia cache configuration
 */
export const WIKIPEDIA_CACHE_DAYS = 30;

/**
 * Engine evaluation cache size
 * Limit to prevent excessive memory usage
 */
export const MAX_EVAL_CACHE_SIZE = 100;

/**
 * Starting position FEN
 */
export const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

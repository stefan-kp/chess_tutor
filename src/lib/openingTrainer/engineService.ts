import { StockfishEvaluation } from '@/lib/stockfish';
import { ChessEngine, EngineEvaluation } from '@/lib/engine';
import { STOCKFISH_DEPTH, MAX_EVAL_CACHE_SIZE } from './constants';

/**
 * Engine Service for Opening Training
 * Provides position evaluation with caching to improve performance
 * Works with both local (browser) and remote (API) engines
 */

// In-memory cache for position evaluations
// Key: FEN string, Value: EngineEvaluation
const EVAL_CACHE = new Map<string, EngineEvaluation>();

/**
 * Evaluate a chess position with caching
 * Checks cache first, then evaluates with engine if not cached
 *
 * @param fen - Position in FEN notation
 * @param engine - Chess engine instance (local or remote)
 * @param depth - Search depth (default from constants)
 * @returns Engine evaluation
 */
export async function evaluatePosition(
  fen: string,
  engine: ChessEngine,
  depth: number = STOCKFISH_DEPTH
): Promise<EngineEvaluation> {
  // Check cache first
  if (EVAL_CACHE.has(fen)) {
    return EVAL_CACHE.get(fen)!;
  }

  // Evaluate with engine (local or remote)
  const evaluation = await engine.evaluate(fen, depth);

  // Cache the result
  cacheEvaluation(fen, evaluation);

  return evaluation;
}

/**
 * Add an evaluation to the cache
 * Implements LRU (Least Recently Used) eviction when cache is full
 */
function cacheEvaluation(fen: string, evaluation: EngineEvaluation): void {
  // If cache is full, remove oldest entry (first entry in Map)
  if (EVAL_CACHE.size >= MAX_EVAL_CACHE_SIZE) {
    const firstKey = EVAL_CACHE.keys().next().value;
    if (firstKey) {
      EVAL_CACHE.delete(firstKey);
    }
  }

  EVAL_CACHE.set(fen, evaluation);
}

/**
 * Clear the evaluation cache
 * Useful for testing or when starting a new session
 */
export function clearEvaluationCache(): void {
  EVAL_CACHE.clear();
}

/**
 * Get cache statistics for debugging/monitoring
 */
export function getCacheStats(): {
  size: number;
  maxSize: number;
  hitRate: number;
} {
  // Note: Hit rate tracking would require additional state
  // For now, just return size info
  return {
    size: EVAL_CACHE.size,
    maxSize: MAX_EVAL_CACHE_SIZE,
    hitRate: 0, // Would need hit/miss counters to calculate
  };
}

/**
 * Pre-cache evaluations for a sequence of positions
 * Useful for loading a repertoire line in the background
 *
 * @param fens - Array of FEN strings to evaluate
 * @param engine - Chess engine instance (local or remote)
 */
export async function precachePositions(
  fens: string[],
  engine: ChessEngine
): Promise<void> {
  for (const fen of fens) {
    if (!EVAL_CACHE.has(fen)) {
      try {
        await evaluatePosition(fen, engine);
      } catch (error) {
        console.error(`Failed to precache position ${fen}:`, error);
        // Continue with next position even if one fails
      }
    }
  }
}

/**
 * Check if a position is already cached
 */
export function isPositionCached(fen: string): boolean {
  return EVAL_CACHE.has(fen);
}

/**
 * Get a cached evaluation without triggering a new evaluation
 * Returns undefined if not cached
 */
export function getCachedEvaluation(
  fen: string
): EngineEvaluation | undefined {
  return EVAL_CACHE.get(fen);
}

/**
 * Chess Engine Abstraction Layer
 *
 * This abstraction allows us to use different engine backends:
 * - LocalEngine: Uses stockfish.js in the browser (GPL - web only)
 * - RemoteEngine: Calls API server (no GPL - mobile safe)
 */

export type EngineEvaluation = {
  bestMove: string;
  ponder: string | null;
  score: number; // centipawns, positive for white
  mate: number | null; // moves to mate, positive for white
  depth: number;
};

/**
 * Abstract interface for chess engines
 * Both local and remote engines implement this interface
 */
export interface ChessEngine {
  /**
   * Evaluate a chess position
   * @param fen - Position in FEN notation
   * @param depth - Search depth (default: 15)
   * @param multiPV - Number of principal variations (default: 1)
   * @returns Engine evaluation
   */
  evaluate(fen: string, depth?: number, multiPV?: number): Promise<EngineEvaluation>;

  /**
   * Terminate the engine and clean up resources
   */
  terminate(): void;
}

/**
 * Configuration for engine creation
 */
export type EngineConfig = {
  /**
   * API URL for remote engine
   * Only used when USE_REMOTE_ENGINE is true
   */
  apiUrl?: string;

  /**
   * Force remote engine even if local is available
   * Used for mobile builds
   */
  forceRemote?: boolean;
};

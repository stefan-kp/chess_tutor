/**
 * Chess Engine Factory
 *
 * Creates appropriate engine based on environment:
 * - Web builds: Use LocalEngine (stockfish.js in browser)
 * - Mobile builds: Use RemoteEngine (calls API server)
 *
 * Configuration via environment variables:
 * - NEXT_PUBLIC_USE_REMOTE_ENGINE=true → Force remote engine
 * - NEXT_PUBLIC_API_URL → API server URL for remote engine
 */

import type { ChessEngine, EngineConfig } from './types';

// Re-export types for convenience
export type { ChessEngine, EngineEvaluation, EngineConfig } from './types';

/**
 * Create a chess engine instance
 *
 * Automatically selects Local or Remote based on environment:
 * - In web builds: Uses local Stockfish (GPL-licensed)
 * - In mobile builds: Uses remote API (no GPL dependencies)
 *
 * @param config - Optional configuration for engine
 * @returns Chess engine instance
 *
 * @example
 * ```typescript
 * // Automatic selection based on environment
 * const engine = createEngine();
 *
 * // Force remote engine
 * const remoteEngine = createEngine({ forceRemote: true });
 *
 * // Use custom API URL
 * const customEngine = createEngine({
 *   apiUrl: 'https://api.myapp.com'
 * });
 * ```
 */
export async function createEngine(config: EngineConfig = {}): Promise<ChessEngine> {
  // Check if we should use remote engine
  const useRemote =
    config.forceRemote ||
    process.env.NEXT_PUBLIC_USE_REMOTE_ENGINE === 'true' ||
    process.env.NEXT_PUBLIC_FORCE_REMOTE_ENGINE === 'true';

  if (useRemote) {
    // Use remote engine (API calls)
    // Safe for mobile - no GPL dependencies
    const { RemoteEngine } = await import('./RemoteEngine');
    console.log('[Engine] Using RemoteEngine (API server)');
    return new RemoteEngine(config);
  } else {
    // Use local engine (stockfish.js in browser)
    // Only in web builds - GPL licensed
    const { LocalEngine } = await import('./LocalEngine');
    console.log('[Engine] Using LocalEngine (browser Stockfish)');
    return new LocalEngine();
  }
}

/**
 * Check if local engine is available
 * Returns false in mobile builds where stockfish.js is not included
 */
export function isLocalEngineAvailable(): boolean {
  return (
    typeof window !== 'undefined' &&
    process.env.NEXT_PUBLIC_USE_REMOTE_ENGINE !== 'true'
  );
}

/**
 * Get current engine type being used
 */
export function getEngineType(): 'local' | 'remote' {
  if (process.env.NEXT_PUBLIC_USE_REMOTE_ENGINE === 'true') {
    return 'remote';
  }
  return 'local';
}

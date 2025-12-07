/**
 * Remote Engine Implementation
 *
 * Calls API server for chess engine analysis
 * No GPL dependencies - safe for proprietary mobile builds
 *
 * LICENSE: Apache-2.0 (no GPL code)
 */

import type { ChessEngine, EngineEvaluation, EngineConfig } from './types';

/**
 * Remote chess engine that calls API server
 * Engine runs on server, client just makes HTTP requests
 *
 * Safe for mobile apps - no GPL dependencies
 */
export class RemoteEngine implements ChessEngine {
  private apiUrl: string;
  private abortController: AbortController | null = null;

  constructor(config: EngineConfig = {}) {
    // Default to current origin for web builds
    // Mobile builds should provide explicit API URL via config
    this.apiUrl = config.apiUrl ||
                  (typeof window !== 'undefined' ? window.location.origin : '') ||
                  process.env.NEXT_PUBLIC_API_URL ||
                  'http://localhost:3050';
  }

  async evaluate(fen: string, depth: number = 15, multiPV: number = 1): Promise<EngineEvaluation> {
    // Create new abort controller for this request
    this.abortController = new AbortController();

    try {
      const response = await fetch(`${this.apiUrl}/api/v1/stockfish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fen, depth, multiPV }),
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Engine API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      // API returns { evaluation: StockfishEvaluation }
      const evaluation = data.evaluation || data;

      return {
        bestMove: evaluation.bestMove,
        ponder: evaluation.ponder,
        score: evaluation.score,
        mate: evaluation.mate,
        depth: evaluation.depth,
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Engine evaluation was cancelled');
      }
      throw error;
    }
  }

  terminate(): void {
    // Abort any in-flight requests
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }
}

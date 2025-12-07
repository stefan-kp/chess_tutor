/**
 * Local Engine Implementation
 *
 * Uses stockfish.js running in the browser via Web Worker
 * This is GPL-licensed code - only included in web builds
 *
 * LICENSE: GPL-3.0 (because it uses stockfish.js)
 */

import { Stockfish } from '../stockfish';
import type { ChessEngine, EngineEvaluation } from './types';

/**
 * Local chess engine using stockfish.js
 * Runs engine in browser via Web Worker
 *
 * Only available in web builds - NOT included in mobile builds
 */
export class LocalEngine implements ChessEngine {
  private stockfish: Stockfish;

  constructor() {
    this.stockfish = new Stockfish();
  }

  async evaluate(fen: string, depth: number = 15, multiPV: number = 1): Promise<EngineEvaluation> {
    // The existing Stockfish class returns the same format
    return this.stockfish.evaluate(fen, depth, multiPV);
  }

  terminate(): void {
    this.stockfish.terminate();
  }
}

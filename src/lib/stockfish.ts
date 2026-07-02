export type StockfishEvaluation = {
  bestMove: string;
  ponder: string | null;
  score: number; // centipawns, positive for white
  mate: number | null; // moves to mate, positive for white (0 = side to move is mated)
  depth: number;
};

// Centipawn value a forced mate is projected to, so that cpLoss / evaluation
// math treats "missed a mate" as an enormous swing rather than a 0 cp change.
export const MATE_SCORE = 100000;

// Hard cap for a single evaluation so a crashed/hung worker cannot block the
// serial queue forever (every subsequent evaluate() chains off this one).
const EVALUATION_TIMEOUT_MS = 30000;

/**
 * Normalize a raw engine result (relative to the side to move) into White's
 * perspective and project mate distances onto a large signed centipawn value.
 */
function normalizeEvaluation(
  evalResult: StockfishEvaluation,
  fen: string
): StockfishEvaluation {
  const sideToMove = fen.split(" ")[1]; // 'w' or 'b'

  if (evalResult.mate !== null) {
    if (evalResult.mate === 0) {
      // The side to move has no legal move and is checkmated → that side loses.
      const matedIsWhite = sideToMove === "w";
      evalResult.score = matedIsWhite ? -MATE_SCORE : MATE_SCORE;
      // mate stays 0; the sign is carried by score for consumers.
    } else {
      const signedMate =
        sideToMove === "b" ? -evalResult.mate : evalResult.mate;
      evalResult.mate = signedMate;
      evalResult.score =
        signedMate > 0
          ? MATE_SCORE - Math.abs(signedMate)
          : -(MATE_SCORE - Math.abs(signedMate));
    }
    return evalResult;
  }

  if (sideToMove === "b" && evalResult.score !== 0) {
    evalResult.score = -evalResult.score;
  }
  return evalResult;
}

export class Stockfish {
  private worker: Worker | null = null;
  private isReady: boolean = false;
  private disposed: boolean = false;
  private evaluationQueue: Promise<void> = Promise.resolve();
  private pendingRejects = new Set<(reason?: unknown) => void>();

  constructor() {
    if (typeof window !== "undefined") {
      this.worker = new Worker("/stockfish/stockfish.js");
      this.worker.onmessage = (e) => {
        if (e.data === "uciok") {
          this.isReady = true;
        }
      };
      this.worker.onerror = () => {
        this.isReady = false;
        this.rejectAllPending(new Error("Stockfish worker error"));
      };
      this.worker.postMessage("uci");
    }
  }

  private rejectAllPending(error: Error) {
    for (const reject of this.pendingRejects) reject(error);
    this.pendingRejects.clear();
  }

  private waitUntilReady(): Promise<void> {
    if (this.isReady) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve, reject) => {
      if (!this.worker) {
        reject(new Error("Stockfish worker not initialized"));
        return;
      }

      const timeoutId = window.setTimeout(() => {
        this.worker?.removeEventListener("message", handleReady);
        reject(new Error("Stockfish worker readiness timed out"));
      }, 5000);

      const handleReady = (event: MessageEvent) => {
        if (event.data === "uciok") {
          window.clearTimeout(timeoutId);
          this.worker?.removeEventListener("message", handleReady);
          this.isReady = true;
          resolve();
        }
      };

      this.worker.addEventListener("message", handleReady);
    });
  }

  async evaluate(fen: string, depth: number = 15, multiPV: number = 1): Promise<StockfishEvaluation> {
    const runEvaluation = async () => {
      await this.waitUntilReady();

      return new Promise<StockfishEvaluation>((resolve, reject) => {
        const worker = this.worker;
        if (this.disposed || !worker) {
          reject(new Error("Stockfish worker not initialized"));
          return;
        }

        let lastScore = 0;
        let lastMate: number | null = null;
        let lastDepth = 0;
        let settled = false;
        let timeoutId: number | undefined;

        const cleanup = () => {
          worker.removeEventListener("message", handler);
          this.pendingRejects.delete(rejectPending);
          if (timeoutId !== undefined) window.clearTimeout(timeoutId);
        };

        const rejectPending = (error: unknown) => {
          if (settled) return;
          settled = true;
          cleanup();
          reject(error);
        };

        const handler = (event: MessageEvent) => {
          const message = event.data;

          if (typeof message !== "string") {
            return;
          }

          if (message.startsWith("info ")) {
            // Ignore bound-only and non-primary (MultiPV) lines so score/mate
            // always reflect the best (PV 1) continuation.
            if (/\b(lowerbound|upperbound)\b/.test(message)) return;
            const mpvMatch = message.match(/multipv (\d+)/);
            if (mpvMatch && parseInt(mpvMatch[1], 10) !== 1) return;

            const depthMatch = message.match(/depth (\d+)/);
            const scoreMatch = message.match(/score cp (-?\d+)/);
            const mateMatch = message.match(/score mate (-?\d+)/);

            if (depthMatch) lastDepth = parseInt(depthMatch[1], 10);
            if (scoreMatch) {
              lastScore = parseInt(scoreMatch[1], 10);
              lastMate = null;
            }
            if (mateMatch) {
              lastMate = parseInt(mateMatch[1], 10);
              lastScore = 0;
            }
          }

          if (message.startsWith("bestmove")) {
            if (settled) return;
            settled = true;
            const parts = message.split(" ");
            const bestMove = parts[1];
            let ponder: string | null = null;
            if (parts.length > 3 && parts[2] === "ponder") {
              ponder = parts[3];
            }

            cleanup();
            resolve({
              bestMove,
              ponder,
              score: lastScore,
              mate: lastMate,
              depth: lastDepth,
            });
          }
        };

        timeoutId = window.setTimeout(() => {
          worker.postMessage("stop");
          rejectPending(
            new Error(`Stockfish evaluation timed out (depth ${depth})`)
          );
        }, EVALUATION_TIMEOUT_MS);

        this.pendingRejects.add(rejectPending);
        worker.addEventListener("message", handler);
        // Always set MultiPV explicitly so a previous multi-line request does
        // not leak its setting into this evaluation.
        worker.postMessage(`setoption name MultiPV value ${Math.max(1, multiPV)}`);
        worker.postMessage(`position fen ${fen}`);
        worker.postMessage(`go depth ${depth}`);
      });
    };

    const evaluationPromise = this.evaluationQueue.then(runEvaluation, runEvaluation);
    this.evaluationQueue = evaluationPromise.then(() => undefined, () => undefined);

    return evaluationPromise.then((evalResult: StockfishEvaluation) =>
      normalizeEvaluation(evalResult, fen)
    );
  }

  terminate() {
    this.disposed = true;
    this.isReady = false;
    this.rejectAllPending(new Error("Stockfish worker terminated"));
    this.worker?.terminate();
    this.worker = null;
  }
}

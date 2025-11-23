export type StockfishEvaluation = {
  bestMove: string;
  ponder: string | null;
  score: number; // centipawns, positive for white
  mate: number | null; // moves to mate, positive for white
  depth: number;
};

export class Stockfish {
  private worker: Worker | null = null;
  private isReady: boolean = false;
  private lastScore: number = 0;
  private lastMate: number | null = null;
  private lastDepth: number = 0;

  constructor() {
    if (typeof window !== "undefined") {
      this.worker = new Worker("/stockfish/stockfish.js");
      this.worker.onmessage = (e) => {
        // console.log("Stockfish message:", e.data);
        if (e.data === "uciok") {
          this.isReady = true;
        }
      };
      this.worker.postMessage("uci");
    }
  }

  async evaluate(fen: string, depth: number = 15, multiPV: number = 1): Promise<StockfishEvaluation> {
    return new Promise<StockfishEvaluation>((resolve, reject) => {
      if (!this.worker) {
        reject("Stockfish worker not initialized");
        return;
      }

      // Reset last known evaluation values for this new evaluation
      this.lastScore = 0;
      this.lastMate = null;
      this.lastDepth = 0;

      const handler = (event: MessageEvent) => {
        const message = event.data;
        // console.log("Stockfish:", message);

        if (message.startsWith("info depth")) {
          const depthMatch = message.match(/depth (\d+)/);
          const scoreMatch = message.match(/score cp (-?\d+)/);
          const mateMatch = message.match(/score mate (-?\d+)/);

          if (depthMatch) this.lastDepth = parseInt(depthMatch[1]);
          if (scoreMatch) {
            this.lastScore = parseInt(scoreMatch[1]);
            this.lastMate = null;
          }
          if (mateMatch) {
            this.lastMate = parseInt(mateMatch[1]);
            this.lastScore = 0; // or some indicator
          }
        }

        if (message.startsWith("bestmove")) {
          const parts = message.split(" ");
          const bestMove = parts[1];
          let ponder: string | null = null;
          if (parts.length > 3 && parts[2] === "ponder") {
            ponder = parts[3];
          }

          // Remove the event listener to prevent it from interfering with future evaluations
          this.worker?.removeEventListener("message", handler);
          resolve({
            bestMove,
            ponder,
            score: this.lastScore,
            mate: this.lastMate,
            depth: this.lastDepth
          });
        }
      };

      this.worker.addEventListener("message", handler);
      this.worker.postMessage(`position fen ${fen}`);
      this.worker.postMessage(`go depth ${depth}`);
    }).then((evalResult: StockfishEvaluation) => {
      // Normalize score to be from White's perspective
      // Stockfish returns score relative to side to move
      const sideToMove = fen.split(" ")[1]; // 'w' or 'b'
      if (sideToMove === 'b') {
        if (evalResult.score !== 0) evalResult.score = -evalResult.score;
        if (evalResult.mate !== null && evalResult.mate !== 0) evalResult.mate = -evalResult.mate;
      }
      return evalResult;
    });
  }

  terminate() {
    this.worker?.terminate();
  }
}

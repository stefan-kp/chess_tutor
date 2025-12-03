import path from "path";
import { Worker } from "worker_threads";
import { StockfishEvaluation } from "../stockfish";

const WORKER_CODE = `
const { parentPort, workerData } = require('worker_threads');
const { enginePath } = workerData;
const emit = (msg) => parentPort.postMessage(msg);
global.postMessage = emit;
global.self = global;
global.window = global;
global.document = {};
global.close = () => parentPort.close();
let handler = null;
Object.defineProperty(global, 'onmessage', {
  get() { return handler; },
  set(fn) { handler = fn; }
});
require(enginePath);
parentPort.on('message', (data) => {
  if (typeof handler === 'function') {
    handler({ data });
  }
});
`;

const ENGINE_PATH = path.resolve(process.cwd(), "node_modules/stockfish.js/stockfish.js");
const DEFAULT_TIMEOUT_MS = 15_000;

export async function evaluateStockfish(
  fen: string,
  depth: number = 15,
  multiPV: number = 1,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<StockfishEvaluation> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(WORKER_CODE, {
      eval: true,
      workerData: { enginePath: ENGINE_PATH },
    });

    let lastScore = 0;
    let lastMate: number | null = null;
    let lastDepth = 0;
    let resolved = false;
    let timeout: NodeJS.Timeout | null = null;

    const cleanup = () => {
      if (timeout) clearTimeout(timeout);
      worker.removeAllListeners();
      worker.terminate().catch(() => undefined);
    };

    const onMessage = (msg: unknown) => {
      if (typeof msg !== "string") return;
      if (msg.startsWith("info depth")) {
        const depthMatch = msg.match(/depth (\d+)/);
        const scoreMatch = msg.match(/score cp (-?\d+)/);
        const mateMatch = msg.match(/score mate (-?\d+)/);

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

      if (msg.startsWith("bestmove")) {
        const parts = msg.split(" ");
        const bestMove = parts[1];
        let ponder: string | null = null;
        if (parts.length > 3 && parts[2] === "ponder") {
          ponder = parts[3];
        }

        const evaluation: StockfishEvaluation = {
          bestMove,
          ponder,
          score: lastScore,
          mate: lastMate,
          depth: lastDepth,
        };

        const sideToMove = fen.split(" ")[1];
        if (sideToMove === "b") {
          if (evaluation.score !== 0) evaluation.score = -evaluation.score;
          if (evaluation.mate !== null && evaluation.mate !== 0) {
            evaluation.mate = -evaluation.mate;
          }
        }

        resolved = true;
        cleanup();
        resolve(evaluation);
      }
    };

    worker.on("message", onMessage);
    worker.on("error", (err) => {
      if (resolved) return;
      resolved = true;
      cleanup();
      reject(err);
    });

    timeout = setTimeout(() => {
      if (resolved) return;
      resolved = true;
      cleanup();
      reject(new Error("Stockfish evaluation timed out"));
    }, timeoutMs);

    worker.postMessage("uci");
    worker.postMessage("setoption name MultiPV value " + multiPV);
    worker.postMessage("isready");
    worker.postMessage(`position fen ${fen}`);
    worker.postMessage(`go depth ${depth}`);
  });
}

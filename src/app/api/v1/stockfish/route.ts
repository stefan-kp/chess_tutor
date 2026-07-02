import { NextRequest, NextResponse } from "next/server";
import { evaluateStockfish } from "@/lib/server/stockfishEngine";
import { StockfishEvaluation } from "@/lib/stockfish";
import { Chess } from "chess.js";
import { getClientId, rateLimit, Semaphore } from "@/lib/server/rateLimit";

export const runtime = "nodejs";

// Each request spawns a WASM engine worker that pins a CPU core; cap how many
// can run at once so a burst of requests cannot exhaust host CPU/memory.
const MAX_CONCURRENT_EVALUATIONS = 2;
const MAX_MULTIPV = 5;
const engineSemaphore = new Semaphore(MAX_CONCURRENT_EVALUATIONS);

/**
 * Validates a FEN string by attempting to create a Chess instance
 */
function isValidFEN(fen: string): boolean {
  try {
    new Chess(fen);
    return true;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const { allowed, retryAfterSeconds } = rateLimit(
    `stockfish:${getClientId(request)}`,
    30,
    60_000
  );
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
    );
  }

  try {
    const body = await request.json();
    const { fen, depth = 15, multiPV = 1 } = body ?? {};

    if (!fen || typeof fen !== "string") {
      return NextResponse.json({ error: "Missing or invalid FEN" }, { status: 400 });
    }

    // Validate FEN string format and chess position validity
    if (!isValidFEN(fen)) {
      return NextResponse.json({ error: "Invalid FEN: position is not a valid chess position" }, { status: 400 });
    }

    const parsedDepth = Number(depth);
    const parsedMultiPV = Number(multiPV);

    if (!Number.isFinite(parsedDepth) || parsedDepth <= 0) {
      return NextResponse.json({ error: "Depth must be a positive number" }, { status: 400 });
    }

    // Cap depth to prevent excessive computation
    const maxDepth = 30;
    const safeDepth = Math.min(parsedDepth, maxDepth);

    if (!Number.isFinite(parsedMultiPV) || parsedMultiPV <= 0) {
      return NextResponse.json({ error: "multiPV must be a positive number" }, { status: 400 });
    }
    const safeMultiPV = Math.min(parsedMultiPV, MAX_MULTIPV);

    // Reject rather than queue when the engine pool is saturated, so a flood of
    // requests fails fast instead of piling up worker spawns.
    if (!engineSemaphore.tryAcquire()) {
      return NextResponse.json(
        { error: "Engine busy, please retry" },
        { status: 503, headers: { "Retry-After": "2" } }
      );
    }

    try {
      const evaluation: StockfishEvaluation = await evaluateStockfish(fen, safeDepth, safeMultiPV);
      return NextResponse.json({ evaluation });
    } finally {
      engineSemaphore.release();
    }
  } catch (error) {
    console.error("Stockfish API error", error);
    return NextResponse.json({ error: "Failed to evaluate position" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { evaluateStockfish } from "@/lib/server/stockfishEngine";
import { StockfishEvaluation } from "@/lib/stockfish";
import { Chess } from "chess.js";

export const runtime = "nodejs";

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

    const evaluation: StockfishEvaluation = await evaluateStockfish(fen, safeDepth, parsedMultiPV);
    return NextResponse.json({ evaluation });
  } catch (error) {
    console.error("Stockfish API error", error);
    return NextResponse.json({ error: "Failed to evaluate position" }, { status: 500 });
  }
}

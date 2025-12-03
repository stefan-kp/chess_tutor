import { NextRequest, NextResponse } from "next/server";
import { evaluateStockfish } from "@/lib/server/stockfishEngine";
import { StockfishEvaluation } from "@/lib/stockfish";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fen, depth = 15, multiPV = 1 } = body ?? {};

    if (!fen || typeof fen !== "string") {
      return NextResponse.json({ error: "Missing or invalid FEN" }, { status: 400 });
    }

    const parsedDepth = Number(depth);
    const parsedMultiPV = Number(multiPV);

    if (!Number.isFinite(parsedDepth) || parsedDepth <= 0) {
      return NextResponse.json({ error: "Depth must be a positive number" }, { status: 400 });
    }

    if (!Number.isFinite(parsedMultiPV) || parsedMultiPV <= 0) {
      return NextResponse.json({ error: "multiPV must be a positive number" }, { status: 400 });
    }

    const evaluation: StockfishEvaluation = await evaluateStockfish(fen, parsedDepth, parsedMultiPV);
    return NextResponse.json({ evaluation });
  } catch (error) {
    console.error("Stockfish API error", error);
    return NextResponse.json({ error: "Failed to evaluate position" }, { status: 500 });
  }
}

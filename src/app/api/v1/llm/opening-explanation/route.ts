import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  OPENING_TUTOR_SYSTEM_PROMPT,
  OPENING_TUTOR_TEMPERATURE,
  OPENING_TUTOR_MAX_TOKENS,
  generateFallbackExplanation,
} from '@/lib/server/openingTutorPrompt';
import { getClientId, rateLimit } from '@/lib/server/rateLimit';

export const runtime = 'nodejs';
export const maxDuration = 10; // 10 second timeout (Vercel deployments)

const CATEGORIES = ['in-theory', 'playable', 'weak'] as const;
type Category = (typeof CATEGORIES)[number];

const MAX_MOVE_LEN = 12;
const MAX_THEORY_MOVES = 12;
const MAX_STR = 24;

interface ValidatedInput {
  moveSan: string;
  category: Category;
  theoreticalMoves: string[];
  evalChange?: string;
  bestMove?: string;
}

/** Validate and normalize the request body into structured, bounded fields. */
function validate(body: unknown): ValidatedInput | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;

  if (typeof b.moveSan !== 'string' || b.moveSan.length === 0 || b.moveSan.length > MAX_MOVE_LEN) {
    return null;
  }
  if (typeof b.category !== 'string' || !CATEGORIES.includes(b.category as Category)) {
    return null;
  }

  const theoreticalMoves = Array.isArray(b.theoreticalMoves)
    ? b.theoreticalMoves
        .filter((m): m is string => typeof m === 'string' && m.length <= MAX_MOVE_LEN)
        .slice(0, MAX_THEORY_MOVES)
    : [];

  const evalChange =
    typeof b.evalChange === 'string' ? b.evalChange.slice(0, MAX_STR) : undefined;
  const bestMove =
    typeof b.bestMove === 'string' ? b.bestMove.slice(0, MAX_MOVE_LEN) : undefined;

  return {
    moveSan: b.moveSan,
    category: b.category as Category,
    theoreticalMoves,
    evalChange,
    bestMove,
  };
}

/** Build the LLM prompt server-side from validated fields (no raw client prompt). */
function buildPrompt(input: ValidatedInput): string {
  const theory =
    input.theoreticalMoves.length > 0
      ? input.theoreticalMoves.join(', ')
      : 'none provided';
  return [
    `A student playing a chess opening just played the move: ${input.moveSan}.`,
    `Move category: ${input.category}.`,
    `Repertoire/theoretical moves here: ${theory}.`,
    input.evalChange ? `Engine evaluation change: ${input.evalChange}.` : '',
    input.bestMove ? `Engine's preferred move: ${input.bestMove}.` : '',
    'Explain in 2-3 sentences what this move does and how it relates to the repertoire.',
  ]
    .filter(Boolean)
    .join('\n');
}

export async function POST(request: NextRequest) {
  // Rate limit: this endpoint spends the operator's own API budget.
  const { allowed, retryAfterSeconds } = rateLimit(
    `opening-explanation:${getClientId(request)}`,
    20,
    60_000
  );
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
    );
  }

  let input: ValidatedInput | null = null;
  try {
    const body = await request.json();
    input = validate(body);
    if (!input) {
      return NextResponse.json(
        { error: 'Invalid request: expected { moveSan, category, ... }' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        explanation: generateFallbackExplanation(
          input.category,
          input.moveSan,
          input.theoreticalMoves,
          input.evalChange,
          input.bestMove
        ),
        usedFallback: true,
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: OPENING_TUTOR_TEMPERATURE,
        maxOutputTokens: OPENING_TUTOR_MAX_TOKENS,
      },
      systemInstruction: OPENING_TUTOR_SYSTEM_PROMPT,
    });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: buildPrompt(input) }] }],
    });
    const explanation = result.response.text();

    if (!explanation || explanation.trim().length === 0) {
      return NextResponse.json({
        explanation: generateFallbackExplanation(
          input.category,
          input.moveSan,
          input.theoreticalMoves,
          input.evalChange,
          input.bestMove
        ),
        usedFallback: true,
      });
    }

    return NextResponse.json({ explanation: explanation.trim(), usedFallback: false });
  } catch (error) {
    console.error('LLM explanation error:', error);
    // input was parsed above (or is null); reuse it — the request body stream
    // has already been consumed and cannot be read a second time.
    const fallbackExplanation = input
      ? generateFallbackExplanation(
          input.category,
          input.moveSan,
          input.theoreticalMoves,
          input.evalChange,
          input.bestMove
        )
      : 'Unable to generate explanation at this time.';

    return NextResponse.json({
      explanation: fallbackExplanation,
      usedFallback: true,
      error: 'LLM request failed',
    });
  }
}

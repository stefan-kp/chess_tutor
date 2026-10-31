import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  OPENING_TUTOR_SYSTEM_PROMPT,
  OPENING_TUTOR_TEMPERATURE,
  OPENING_TUTOR_MAX_TOKENS,
  generateFallbackExplanation,
} from '@/lib/server/openingTutorPrompt';
import { getLLMProviderKind } from '@/lib/llm/config';
import { sendOpenAICompatibleCompletion } from '@/lib/llm/openAICompatibleServer';

export const runtime = 'nodejs';
export const maxDuration = 10; // 10 second timeout

/**
 * Opening Explanation API Endpoint
 * Generates educational explanations for chess moves using LLM
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      prompt,
      moveSan,
      category,
      theoreticalMoves,
      evalChange,
      bestMove,
    } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: 'Missing prompt parameter' },
        { status: 400 }
      );
    }

    if (getLLMProviderKind() === 'openai-compatible') {
      try {
        const explanation = await sendOpenAICompatibleCompletion({
          prompt,
          systemPrompt: OPENING_TUTOR_SYSTEM_PROMPT,
          temperature: OPENING_TUTOR_TEMPERATURE,
          maxTokens: OPENING_TUTOR_MAX_TOKENS,
        });

        if (!explanation || explanation.trim().length === 0) {
          const fallback = generateFallbackExplanation(category, moveSan, theoreticalMoves, evalChange, bestMove);
          return NextResponse.json({ explanation: fallback, usedFallback: true });
        }

        return NextResponse.json({ explanation: explanation.trim(), usedFallback: false });
      } catch (error) {
        console.error('LLM explanation error (openai-compatible):', error);
        const fallback = generateFallbackExplanation(category, moveSan, theoreticalMoves, evalChange, bestMove);
        return NextResponse.json({ explanation: fallback, usedFallback: true, error: 'LLM request failed' });
      }
    }

    // Check for API key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('GEMINI_API_KEY not configured, using fallback explanation');
      const fallback = generateFallbackExplanation(
        category,
        moveSan,
        theoreticalMoves,
        evalChange,
        bestMove
      );
      return NextResponse.json({
        explanation: fallback,
        usedFallback: true,
      });
    }

    // Initialize Gemini API
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        temperature: OPENING_TUTOR_TEMPERATURE,
        maxOutputTokens: OPENING_TUTOR_MAX_TOKENS,
      },
      systemInstruction: OPENING_TUTOR_SYSTEM_PROMPT,
    });

    // Generate explanation
    const result = await model.generateContent(prompt);
    const response = result.response;
    const explanation = response.text();

    if (!explanation || explanation.trim().length === 0) {
      // Empty response - use fallback
      const fallback = generateFallbackExplanation(
        category,
        moveSan,
        theoreticalMoves,
        evalChange,
        bestMove
      );
      return NextResponse.json({
        explanation: fallback,
        usedFallback: true,
      });
    }

    return NextResponse.json({
      explanation: explanation.trim(),
      usedFallback: false,
    });
  } catch (error) {
    console.error('LLM explanation error:', error);

    // Try to extract fallback params from request
    let fallbackExplanation = 'Unable to generate explanation at this time.';
    try {
      const body = await request.json();
      if (body.moveSan && body.category) {
        fallbackExplanation = generateFallbackExplanation(
          body.category,
          body.moveSan,
          body.theoreticalMoves || [],
          body.evalChange,
          body.bestMove
        );
      }
    } catch {
      // Ignore fallback generation errors
    }

    return NextResponse.json({
      explanation: fallbackExplanation,
      usedFallback: true,
      error: 'LLM request failed',
    });
  }
}

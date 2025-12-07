import { MoveFeedbackClassification, MoveHistoryEntry } from '@/types/openingTraining';
import { StockfishEvaluation } from '@/lib/stockfish';
import { OpeningMetadata } from '@/lib/openings';
import { formatEvaluation } from './moveValidator';

/**
 * Builds a prompt for the LLM to generate an educational explanation of a chess move
 */

export interface ExplanationPromptContext {
  opening: OpeningMetadata;
  userMove: MoveHistoryEntry;
  classification: MoveFeedbackClassification;
  currentEval: StockfishEvaluation;
  previousEval: StockfishEvaluation;
  fen: string;
  moveHistory: MoveHistoryEntry[];
  isDeviationMove: boolean;
}

/**
 * Builds a structured prompt for the LLM tutor
 * The prompt ensures the LLM:
 * 1. Never contradicts engine evaluations
 * 2. Explains strategic ideas in the position
 * 3. References engine facts when discussing move quality
 */
export function buildExplanationPrompt(context: ExplanationPromptContext): string {
  const {
    opening,
    userMove,
    classification,
    currentEval,
    previousEval,
    fen,
    moveHistory,
    isDeviationMove,
  } = context;

  const evalChange = classification.evaluationChange !== 0
    ? `${classification.evaluationChange > 0 ? '+' : ''}${(classification.evaluationChange / 100).toFixed(2)}`
    : '0.00';
  const currentEvalStr = formatEvaluation(currentEval);
  const previousEvalStr = formatEvaluation(previousEval);

  // Build move history string
  const movesStr = moveHistory
    .map(
      (m, idx) =>
        `${m.moveNumber}${m.color === 'white' ? '.' : '...'} ${m.san}`
    )
    .join(' ');

  let prompt = `You are a chess opening tutor helping a student learn the ${opening.name} opening (ECO ${opening.eco}).

## Current Position
FEN: ${fen}
Move sequence: ${movesStr} ${userMove.san}

## The student just played: ${userMove.san}

## Engine Analysis (AUTHORITATIVE - never contradict this)
- Previous evaluation: ${previousEvalStr}
- Current evaluation: ${currentEvalStr}
- Evaluation change: ${evalChange}
- Best move according to engine: ${currentEval.bestMove || 'N/A'}
`;

  // Add context based on move category
  if (classification.category === 'in-theory') {
    prompt += `
## Move Classification: IN THEORY
This move is part of the opening repertoire. Explain:
1. Why this move is played in this opening (strategic ideas, piece development, pawn structure)
2. What the plan is after this move
3. Common responses and how to continue

Keep it concise (2-3 sentences). Focus on teaching the IDEAS behind the move.`;
  } else if (classification.category === 'playable') {
    prompt += `
## Move Classification: PLAYABLE (but not in repertoire)
The student deviated from the repertoire, but the move is objectively sound (evaluation change: ${evalChange}).

${
  classification.theoreticalAlternatives.length > 0
    ? `Repertoire move(s): ${classification.theoreticalAlternatives.join(', ')}`
    : ''
}

Explain:
1. Acknowledge the move is playable and why (based on engine eval)
2. Briefly explain what the repertoire move(s) aim for
3. How the student's move differs strategically

Keep it concise (2-3 sentences). Be encouraging - deviations can be learning moments!`;
  } else {
    // weak move
    prompt += `
## Move Classification: WEAK
The engine shows this move loses significant advantage (${evalChange}).

Best move was: ${currentEval.bestMove}
${
  classification.theoreticalAlternatives.length > 0
    ? `Repertoire move(s): ${classification.theoreticalAlternatives.join(', ')}`
    : ''
}

Explain:
1. Why this move is problematic (based on engine evaluation)
2. What tactical or positional issue it creates
3. What the better move(s) accomplish instead

Keep it concise (2-3 sentences). Be constructive and focus on learning.`;
  }

  if (isDeviationMove) {
    prompt += `\n\n**NOTE**: This is the FIRST move where the student left the repertoire.`;
  }

  prompt += `\n\n**CRITICAL RULES**:
- NEVER contradict the engine evaluation
- When discussing move quality, reference the engine's assessment
- Focus on STRATEGIC IDEAS, not just memorization
- Keep response under 60 words
- Be encouraging and educational`;

  return prompt;
}

/**
 * Builds a simpler prompt for transposition scenarios
 */
export function buildTranspositionPrompt(
  transposedOpening: OpeningMetadata,
  currentMove: string
): string {
  return `The position after ${currentMove} has transposed into the ${transposedOpening.name} (${transposedOpening.eco}).

Briefly explain (1 sentence):
- What this transposition means
- If it's a common occurrence

Keep under 30 words.`;
}

/**
 * Builds a prompt for explaining positions after leaving theory
 */
export function buildOffBookPrompt(context: ExplanationPromptContext): string {
  const { userMove, currentEval, fen } = context;

  const currentEvalStr = formatEvaluation(currentEval);

  return `You are a chess tutor. The student is now outside their opening repertoire after playing ${userMove.san}.

Position (FEN): ${fen}
Engine evaluation: ${currentEvalStr}
Best continuation: ${currentEval.bestMove || 'N/A'}

Provide a brief assessment (2 sentences):
1. Evaluate the current position objectively
2. Suggest a plan or strategic idea to pursue

Keep under 40 words. Reference the engine evaluation.`;
}

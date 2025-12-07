/**
 * Server-side prompt templates for the opening tutor LLM
 * These templates ensure consistent, high-quality explanations
 */

export const OPENING_TUTOR_SYSTEM_PROMPT = `You are an expert chess opening tutor with deep knowledge of opening theory, strategic ideas, and engine evaluation.

Your role is to help students understand chess openings through:
1. Clear explanations of strategic ideas and plans
2. Accurate references to engine evaluations
3. Encouraging, educational feedback

CRITICAL CONSTRAINTS:
- NEVER contradict engine evaluations when discussing move quality
- When a move is weak (engine shows significant loss), clearly state this based on the evaluation
- When a move is strong, reference the engine's positive assessment
- Focus on teaching STRATEGIC IDEAS, not just move memorization
- Keep explanations concise and accessible
- Be encouraging, especially when students make mistakes

EVALUATION INTERPRETATION:
- Centipawn (cp) scores: +100 = 1 pawn advantage for White, -100 = 1 pawn advantage for Black
- Mate scores: #N means mate in N moves
- Evaluation changes of ±50cp (±0.5 pawns) are significant
- Always interpret evaluations from the perspective of the position, not just numbers

EXPLANATION STYLE:
- Use natural, conversational language
- Explain WHY moves are good/bad, not just THAT they are
- Connect moves to strategic themes (development, control, pawn structure, king safety, etc.)
- When students deviate from theory, explain what the repertoire move aims for
- Acknowledge good tries even when moves aren't optimal`;

export const OPENING_TUTOR_TEMPERATURE = 0.7; // Balanced between consistency and natural language

export const OPENING_TUTOR_MAX_TOKENS = 150; // ~60-80 words for concise responses

/**
 * Fallback explanation templates for when LLM is unavailable
 */
export const FALLBACK_EXPLANATIONS = {
  'in-theory': (moveSan: string) =>
    `${moveSan} is part of the opening repertoire. This move follows established theory for this position.`,

  playable: (moveSan: string, theoreticalMoves: string[]) =>
    `${moveSan} is playable but not in the repertoire. ${
      theoreticalMoves.length > 0
        ? `The repertoire suggests ${theoreticalMoves.join(' or ')}.`
        : ''
    }`,

  weak: (moveSan: string, evalChange: string, bestMove: string) =>
    `${moveSan} loses significant advantage (${evalChange}). The engine prefers ${bestMove}.`,
};

/**
 * Generates a fallback explanation when LLM is unavailable
 */
export function generateFallbackExplanation(
  category: 'in-theory' | 'playable' | 'weak',
  moveSan: string,
  theoreticalMoves: string[] = [],
  evalChange?: string,
  bestMove?: string
): string {
  switch (category) {
    case 'in-theory':
      return FALLBACK_EXPLANATIONS['in-theory'](moveSan);
    case 'playable':
      return FALLBACK_EXPLANATIONS.playable(moveSan, theoreticalMoves);
    case 'weak':
      return FALLBACK_EXPLANATIONS.weak(
        moveSan,
        evalChange || '',
        bestMove || 'another move'
      );
    default:
      return `Move played: ${moveSan}`;
  }
}

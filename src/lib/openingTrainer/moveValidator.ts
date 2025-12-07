import {
  MoveFeedbackClassification,
  MoveCategory,
} from '@/types/openingTraining';
import { StockfishEvaluation } from '@/lib/stockfish';
import { MOVE_CATEGORIZATION_THRESHOLDS } from './constants';

/**
 * Move Validator Module
 * Classifies user moves relative to opening theory and objective strength
 */

/**
 * Classify a user's move based on repertoire matching and engine evaluation
 *
 * @param userMove - The move the user played (SAN notation)
 * @param isInRepertoire - Whether the move matches the expected repertoire line
 * @param previousEval - Engine evaluation before the move
 * @param currentEval - Engine evaluation after the move
 * @param theoreticalMoves - List of all valid theoretical moves at this position
 * @returns Classification of the move
 */
export function classifyMove(
  userMove: string,
  isInRepertoire: boolean,
  previousEval: StockfishEvaluation,
  currentEval: StockfishEvaluation,
  theoreticalMoves: string[] = []
): MoveFeedbackClassification {
  // Calculate evaluation change
  // Note: Evaluation is from White's perspective
  // A positive change means better for White, negative means better for Black
  const evalChange = currentEval.score - previousEval.score;

  // Determine move category
  let category: MoveCategory;

  if (isInRepertoire) {
    // Move is in the opening repertoire
    category = 'in-theory';
  } else {
    // Move is not in repertoire - check if it's weak or playable
    // A move is "weak" if it loses significant material (50cp or more)
    const cpLoss = Math.abs(evalChange);

    if (cpLoss >= MOVE_CATEGORIZATION_THRESHOLDS.WEAK_MOVE_CP_LOSS) {
      category = 'weak';
    } else {
      category = 'playable';
    }
  }

  // Check if the evaluation swing is significant
  const isSignificantSwing =
    Math.abs(evalChange) >= MOVE_CATEGORIZATION_THRESHOLDS.SIGNIFICANT_SWING_CP;

  // Filter out the user's move from theoretical alternatives
  const alternatives = theoreticalMoves.filter((move) => move !== userMove);

  return {
    category,
    inRepertoire: isInRepertoire,
    evaluationChange: evalChange,
    isSignificantSwing,
    theoreticalAlternatives: alternatives,
  };
}

/**
 * Check if a move is in the repertoire by comparing with expected next move(s)
 *
 * @param userMove - The move the user played (SAN notation)
 * @param expectedMoves - Array of expected next moves from repertoire (could be multiple variations)
 * @returns True if user's move matches any expected move
 */
export function isMoveinRepertoire(
  userMove: string,
  expectedMoves: string[]
): boolean {
  return expectedMoves.some((expected) => expected === userMove);
}

/**
 * Determine if an evaluation represents a mate situation
 */
export function isMateScore(evaluation: StockfishEvaluation): boolean {
  return evaluation.mate !== null;
}

/**
 * Get a human-readable evaluation string
 */
export function formatEvaluation(evaluation: StockfishEvaluation): string {
  if (evaluation.mate !== null) {
    const mateIn = Math.abs(evaluation.mate);
    const side = evaluation.mate > 0 ? 'White' : 'Black';
    return `${side} mates in ${mateIn}`;
  }

  const pawns = (evaluation.score / 100).toFixed(2);
  if (evaluation.score > 0) {
    return `+${pawns}`;
  } else if (evaluation.score < 0) {
    return pawns; // Already has minus sign
  } else {
    return '0.00';
  }
}

/**
 * Get a description of the move category for UI display
 */
export function getCategoryDescription(category: MoveCategory): string {
  switch (category) {
    case 'in-theory':
      return 'This move follows the opening theory';
    case 'playable':
      return 'This move is playable but not in the main repertoire';
    case 'weak':
      return 'This move is inaccurate and loses material';
  }
}

/**
 * Get a color class for styling based on category
 */
export function getCategoryColor(category: MoveCategory): string {
  switch (category) {
    case 'in-theory':
      return 'text-green-600';
    case 'playable':
      return 'text-yellow-600';
    case 'weak':
      return 'text-red-600';
  }
}

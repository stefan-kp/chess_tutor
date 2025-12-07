import { Chess } from 'chess.js';
import { OpeningMetadata, lookupOpening } from '@/lib/openings';

/**
 * Repertoire Navigation Module
 * Handles tracking position within opening repertoire and detecting deviations
 */

/**
 * Parse a move sequence from an opening's moves string
 * Example: "1. e4 e5 2. Nf3" → ["e4", "e5", "Nf3"]
 *
 * @param moveString - Move sequence from opening database
 * @returns Array of moves in SAN notation
 */
export function parseMoveSequence(moveString: string): string[] {
  if (!moveString || moveString.trim() === '') return [];

  // Remove move numbers and extra whitespace
  // "1. e4 e5 2. Nf3" → "e4 e5 Nf3"
  const cleaned = moveString
    .replace(/\d+\./g, '') // Remove move numbers
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();

  // Split into individual moves
  return cleaned.split(' ').filter((move) => move.length > 0);
}

/**
 * Get the expected next move(s) from the repertoire at current position
 *
 * @param opening - The opening metadata from database
 * @param currentMoveIndex - Current position in the move sequence (0-based)
 * @returns Array of expected next moves (usually one, could be multiple for variations)
 */
export function getExpectedNextMoves(
  opening: OpeningMetadata,
  currentMoveIndex: number
): string[] {
  const moves = parseMoveSequence(opening.moves);

  // If we're at or past the end of the repertoire
  if (currentMoveIndex >= moves.length) {
    return [];
  }

  // For MVP: return single main line move
  // Future: could handle variations by checking for multiple lines
  const nextMove = moves[currentMoveIndex];
  return nextMove ? [nextMove] : [];
}

/**
 * Check if a position has transposed into a known opening
 * Uses FEN lookup to detect if the current position exists in the database
 *
 * @param fen - Current position in FEN notation
 * @returns Opening metadata if position is found, null otherwise
 */
export function detectTransposition(fen: string): OpeningMetadata | null {
  return lookupOpening(fen);
}

/**
 * Build the current position's FEN after making moves from the opening
 *
 * @param opening - Opening metadata
 * @param upToMoveIndex - Play moves up to this index (exclusive)
 * @returns FEN string of the resulting position
 */
export function buildPositionFromOpening(
  opening: OpeningMetadata,
  upToMoveIndex: number
): string | null {
  const moves = parseMoveSequence(opening.moves);
  const chess = new Chess();

  try {
    for (let i = 0; i < upToMoveIndex && i < moves.length; i++) {
      const move = chess.move(moves[i]);
      if (!move) {
        console.error(`Invalid move at index ${i}: ${moves[i]}`);
        return null;
      }
    }

    return chess.fen();
  } catch (error) {
    console.error('Error building position from opening:', error);
    return null;
  }
}

/**
 * Get the total number of moves in the opening repertoire
 */
export function getRepertoireLength(opening: OpeningMetadata): number {
  return parseMoveSequence(opening.moves).length;
}

/**
 * Check if we've reached the end of the repertoire
 */
export function isEndOfRepertoire(
  opening: OpeningMetadata,
  currentMoveIndex: number
): boolean {
  const length = getRepertoireLength(opening);
  return currentMoveIndex >= length;
}

/**
 * Get a visual representation of the current progress through the opening
 * Example: "5/12 moves" or "End of line"
 */
export function getRepertoireProgress(
  opening: OpeningMetadata,
  currentMoveIndex: number
): string {
  const total = getRepertoireLength(opening);

  if (currentMoveIndex >= total) {
    return 'End of repertoire';
  }

  return `${currentMoveIndex}/${total} moves`;
}

/**
 * Check if a move sequence matches the opening's mainline up to a certain point
 *
 * @param opening - Opening metadata
 * @param playedMoves - Array of moves that have been played (SAN notation)
 * @returns True if the played moves match the opening's sequence
 */
export function matchesMainline(
  opening: OpeningMetadata,
  playedMoves: string[]
): boolean {
  const expectedMoves = parseMoveSequence(opening.moves);

  // If we've played more moves than in the repertoire, it's not a match
  if (playedMoves.length > expectedMoves.length) {
    return false;
  }

  // Check each played move against expected
  for (let i = 0; i < playedMoves.length; i++) {
    if (playedMoves[i] !== expectedMoves[i]) {
      return false;
    }
  }

  return true;
}

/**
 * Determine which color the user is playing based on ECO code
 * A, B, C = White openings (user plays White)
 * D, E = Black defenses (user plays Black)
 *
 * @param opening - Opening metadata
 * @returns 'white' or 'black'
 */
export function getUserColor(opening: OpeningMetadata): 'white' | 'black' {
  const ecoLetter = opening.eco[0];
  return ['A', 'B', 'C'].includes(ecoLetter) ? 'white' : 'black';
}

/**
 * Get the opponent's next move from the repertoire
 *
 * @param opening - Opening metadata
 * @param currentMoveIndex - Current position in the move sequence (0-based)
 * @returns The opponent's next move in SAN notation, or null if not available
 */
export function getOpponentNextMove(
  opening: OpeningMetadata,
  currentMoveIndex: number
): string | null {
  const moves = parseMoveSequence(opening.moves);
  const userColor = getUserColor(opening);

  // If we're at or past the end of the repertoire
  if (currentMoveIndex >= moves.length) {
    return null;
  }

  // Determine if this should be the opponent's move
  // Move index 0 = first move (1. move)
  // Move index 1 = second move (1... move)
  // etc.

  const isWhiteMove = currentMoveIndex % 2 === 0;
  const isOpponentMove = (userColor === 'white' && !isWhiteMove) ||
                         (userColor === 'black' && isWhiteMove);

  if (!isOpponentMove) {
    // This is the user's move, not the opponent's
    return null;
  }

  return moves[currentMoveIndex];
}

/**
 * Check if it's the opponent's turn to move
 *
 * @param opening - Opening metadata
 * @param currentMoveIndex - Current position in the move sequence (0-based)
 * @returns True if it's the opponent's turn
 */
export function isOpponentTurn(
  opening: OpeningMetadata,
  currentMoveIndex: number
): boolean {
  const userColor = getUserColor(opening);
  const isWhiteMove = currentMoveIndex % 2 === 0;

  return (userColor === 'white' && !isWhiteMove) ||
         (userColor === 'black' && isWhiteMove);
}

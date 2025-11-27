import ecoA from '../../public/openings/ecoA.json';
import ecoB from '../../public/openings/ecoB.json';
import ecoC from '../../public/openings/ecoC.json';
import ecoD from '../../public/openings/ecoD.json';
import ecoE from '../../public/openings/ecoE.json';
import moveIndex from '../../public/openings/moveIndex.json';

export interface OpeningMetadata {
    src: string;
    eco: string;
    moves: string;
    name: string;
    aliases?: { [key: string]: string };
    meta?: {
        strengths_white?: string[];
        weaknesses_white?: string[];
        strengths_black?: string[];
        weaknesses_black?: string[];
    };
}

// Merge all ECO databases into one lookup object
const openingsData = {
    ...ecoA,
    ...ecoB,
    ...ecoC,
    ...ecoD,
    ...ecoE
} as Record<string, OpeningMetadata>;

export function lookupOpening(fen: string): OpeningMetadata | null {
    // The keys in the JSON are exact FEN strings.
    if (openingsData[fen]) {
        return openingsData[fen];
    }
    return null;
}

/**
 * Lookup possible openings from a move sequence.
 * Returns up to maxResults openings that match the given move sequence.
 *
 * @param moveSequence - The move sequence in SAN notation (e.g., "1. e4 c5 2. Nf3")
 * @param maxResults - Maximum number of results to return (default: 5)
 * @returns Array of opening metadata objects
 *
 * @example
 * // After 1.e4
 * const openings = lookupPossibleOpenings("1. e4", 5);
 * // Returns: [{ eco: "B00", name: "King's Pawn Game", ... }]
 *
 * @example
 * // After 1.e4 c5
 * const openings = lookupPossibleOpenings("1. e4 c5", 5);
 * // Returns: [{ eco: "B20", name: "Sicilian Defense", ... }, ...]
 */
export function lookupPossibleOpenings(
    moveSequence: string,
    maxResults: number = 5
): OpeningMetadata[] {
    const normalized = moveSequence.trim();
    const matches = (moveIndex as Record<string, OpeningMetadata[]>)[normalized] || [];
    return matches.slice(0, maxResults);
}

/**
 * Extract move sequence from PGN string.
 * Removes headers and metadata, keeping only the move sequence.
 *
 * @param pgn - PGN string (may include headers)
 * @returns Move sequence in SAN notation (e.g., "1. e4 c5 2. Nf3")
 *
 * @example
 * const pgn = '[Event "Game"]\n[Site "..."]\n\n1. e4 c5 2. Nf3';
 * const moves = extractMoveSequenceFromPGN(pgn);
 * // Returns: "1. e4 c5 2. Nf3"
 */
export function extractMoveSequenceFromPGN(pgn: string): string {
    // Remove headers (lines starting with '[')
    const lines = pgn.split('\n');
    const moveLines = lines.filter(line => !line.trim().startsWith('['));

    // Join and clean up
    let moveSequence = moveLines.join(' ').trim();

    // Remove result markers (1-0, 0-1, 1/2-1/2, *)
    moveSequence = moveSequence.replace(/\s+(1-0|0-1|1\/2-1\/2|\*)\s*$/, '');

    // Remove comments in curly braces
    moveSequence = moveSequence.replace(/\{[^}]*\}/g, '');

    // Remove variations in parentheses
    moveSequence = moveSequence.replace(/\([^)]*\)/g, '');

    // Remove annotations ($1, $2, etc.)
    moveSequence = moveSequence.replace(/\$\d+/g, '');

    // Remove NAG symbols (!, ?, !!, ??, !?, ?!)
    moveSequence = moveSequence.replace(/[!?]+/g, '');

    // Normalize whitespace
    moveSequence = moveSequence.replace(/\s+/g, ' ').trim();

    return moveSequence;
}

/**
 * Build move sequence from an array of move steps.
 * Used in the analysis page to construct the move sequence up to a given index.
 *
 * @param steps - Array of move steps with san and color properties
 * @param upToIndex - Build sequence up to this index (exclusive)
 * @returns Move sequence in SAN notation
 *
 * @example
 * const steps = [
 *   { san: "e4", color: "white", moveNumber: 1, ... },
 *   { san: "c5", color: "black", moveNumber: 1, ... },
 *   { san: "Nf3", color: "white", moveNumber: 2, ... }
 * ];
 * const sequence = buildMoveSequenceFromSteps(steps, 3);
 * // Returns: "1. e4 c5 2. Nf3"
 */
export function buildMoveSequenceFromSteps(
    steps: Array<{ san: string; color: 'white' | 'black'; moveNumber: number }>,
    upToIndex: number
): string {
    const parts: string[] = [];
    let currentMoveNumber = 0;

    for (let i = 0; i < upToIndex && i < steps.length; i++) {
        const step = steps[i];

        if (step.color === 'white') {
            // White's move - include move number
            parts.push(`${step.moveNumber}. ${step.san}`);
            currentMoveNumber = step.moveNumber;
        } else {
            // Black's move - no move number prefix
            parts.push(step.san);
        }
    }

    return parts.join(' ');
}

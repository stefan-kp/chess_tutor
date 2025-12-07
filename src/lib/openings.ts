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
    isEcoRoot?: boolean;
    wikipediaSlug?: string;
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
 * Returns up to maxResults openings using a hybrid approach:
 * 1. First, returns exact matches for the given sequence
 * 2. Then, fills remaining slots with common continuations (one move deeper)
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
 * // After 1.e4 e5
 * const openings = lookupPossibleOpenings("1. e4 e5", 5);
 * // Returns: [
 * //   { eco: "C20", name: "King's Pawn Game", ... },  // exact match
 * //   { eco: "C60", name: "Ruy Lopez", ... },         // continuation
 * //   { eco: "C50", name: "Italian Game", ... },      // continuation
 * //   ...
 * // ]
 */
export function lookupPossibleOpenings(
    moveSequence: string,
    maxResults: number = 5
): OpeningMetadata[] {
    const normalized = moveSequence.trim();
    const index = moveIndex as Record<string, OpeningMetadata[]>;

    const results: OpeningMetadata[] = [];
    const seenEcoRoots = new Set<string>(); // Track ECO roots to avoid duplicates

    // Step 1: Add exact matches first
    const exactMatches = index[normalized] || [];
    for (const opening of exactMatches) {
        if (results.length >= maxResults) break;
        results.push(opening);
        // Track ECO root to avoid duplicate families
        const ecoRoot = opening.eco.substring(0, 2); // e.g., "C20" -> "C2"
        seenEcoRoots.add(ecoRoot);
    }

    // Step 2: If we haven't reached maxResults, look for common continuations
    if (results.length < maxResults) {
        // Find all sequences that start with our sequence
        const continuations: Array<{
            sequence: string;
            openings: OpeningMetadata[];
            depth: number; // How many moves deeper than our sequence
        }> = [];

        for (const [seq, openings] of Object.entries(index)) {
            // Check if this sequence starts with our sequence
            if (seq.startsWith(normalized + ' ')) {
                // Count the number of half-moves (ply)
                const ourPly = normalized.split(/\s+/).filter(s => s && !s.match(/^\d+\.$/)).length;
                const theirPly = seq.split(/\s+/).filter(s => s && !s.match(/^\d+\.$/)).length;
                const depth = theirPly - ourPly;

                // We want sequences that are 1-4 moves deeper (to catch important openings)
                if (depth > 0 && depth <= 4) {
                    continuations.push({ sequence: seq, openings, depth });
                }
            }
        }

        // Sort continuations by:
        // 1. Depth (prefer closer continuations)
        // 2. Whether they have isEcoRoot flag (prioritize root openings)
        // 3. ECO code (lower codes are generally more common)
        continuations.sort((a, b) => {
            // Prefer shallower depth
            if (a.depth !== b.depth) return a.depth - b.depth;

            const aHasRoot = a.openings.some(o => o.isEcoRoot);
            const bHasRoot = b.openings.some(o => o.isEcoRoot);
            if (aHasRoot && !bHasRoot) return -1;
            if (!aHasRoot && bHasRoot) return 1;

            // Compare by ECO code
            const aEco = a.openings[0]?.eco || 'ZZZ';
            const bEco = b.openings[0]?.eco || 'ZZZ';
            return aEco.localeCompare(bEco);
        });

        // Add continuations until we reach maxResults
        for (const { openings } of continuations) {
            if (results.length >= maxResults) break;

            // Take the first opening from this continuation (usually the most general/important)
            const opening = openings[0];
            if (opening) {
                const ecoRoot = opening.eco.substring(0, 2);
                // Avoid adding if we already have an opening from this ECO family
                if (!seenEcoRoots.has(ecoRoot)) {
                    results.push(opening);
                    seenEcoRoots.add(ecoRoot);
                }
            }
        }
    }

    return results.slice(0, maxResults);
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

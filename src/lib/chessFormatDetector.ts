/**
 * Detects whether a chess notation string is FEN or PGN format
 */

export type ChessFormat = 'fen' | 'pgn' | 'invalid';

/**
 * Automatically detects if the input is a FEN position or PGN game
 * 
 * FEN (Forsyth-Edwards Notation) structure:
 * - Single line with exactly 6 space-separated fields
 * - First field: piece placement with 7 slashes (8 ranks)
 * - Second field: active color ('w' or 'b')
 * - Example: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
 * 
 * PGN (Portable Game Notation) structure:
 * - Contains headers in square brackets: [Event "..."]
 * - Contains move numbers with periods: 1. e4 e5 2. Nf3
 * - Can be multi-line
 * 
 * @param input - The chess notation string to detect
 * @returns 'fen' | 'pgn' | 'invalid'
 */
export function detectChessFormat(input: string): ChessFormat {
    const trimmed = input.trim();

    // Empty input
    if (!trimmed) {
        return 'invalid';
    }

    // Check for PGN indicators (most distinctive)
    // PGN headers use square brackets: [Event "..."], [White "..."], etc.
    if (trimmed.includes('[') && trimmed.includes(']')) {
        return 'pgn';
    }

    // Check for PGN movetext pattern (move numbers with periods)
    // Matches patterns like: "1. e4", "2. Nf3", "10. O-O"
    // This catches PGN files that might not have headers
    if (/\d+\.\s*[a-hNBRQKO]/.test(trimmed)) {
        return 'pgn';
    }

    // Check for FEN structure
    // FEN must have exactly 6 space-separated fields
    const fields = trimmed.split(/\s+/);

    if (fields.length === 6) {
        // First field should contain exactly 7 slashes (separating 8 ranks)
        const slashCount = (fields[0].match(/\//g) || []).length;

        // Second field should be 'w' (white) or 'b' (black)
        const validTurn = fields[1] === 'w' || fields[1] === 'b';

        // Third field should be castling rights (KQkq, -, or combinations)
        const validCastling = /^(-|[KQkq]{1,4})$/.test(fields[2]);

        if (slashCount === 7 && validTurn && validCastling) {
            return 'fen';
        }
    }

    // If none of the patterns match, it's invalid
    return 'invalid';
}

/**
 * Validates and extracts the chess notation based on detected format
 * 
 * @param input - The chess notation string
 * @returns Object with format type and the cleaned notation, or null if invalid
 */
export function parseChessNotation(input: string): { format: 'fen' | 'pgn'; notation: string } | null {
    const format = detectChessFormat(input);

    if (format === 'invalid') {
        return null;
    }

    return {
        format,
        notation: input.trim()
    };
}


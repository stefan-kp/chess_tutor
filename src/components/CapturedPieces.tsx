import React, { memo, useMemo } from 'react';

interface CapturedPiecesProps {
    captured: string[]; // Array of piece types, e.g., ['p', 'n', 'q']
    color: 'w' | 'b'; // The color of the pieces (to display the correct icon)
    score?: number | null; // Material advantage, e.g., +2
}

const PIECE_ICONS: Record<string, string> = {
    'p': '♟',
    'n': '♞',
    'b': '♝',
    'r': '♜',
    'q': '♛',
    'k': '♚', // King is never captured, but for completeness
};

const sortOrder = ['q', 'r', 'b', 'n', 'p'];

/**
 * Displays captured pieces with optional material advantage score.
 * Memoized to prevent unnecessary re-renders.
 */
export const CapturedPieces = memo(function CapturedPieces({ captured, color, score }: CapturedPiecesProps) {
    // Memoize sorted pieces to prevent recalculation on every render
    const sortedPieces = useMemo(
        () => [...captured].sort((a, b) => sortOrder.indexOf(a) - sortOrder.indexOf(b)),
        [captured]
    );

    return (
        <div className="flex items-center h-8 gap-2 text-gray-600 dark:text-gray-300">
            <div className="flex -space-x-1 text-2xl leading-none select-none">
                {sortedPieces.map((piece, index) => (
                    <span key={index} className={color === 'w' ? "text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]" : "text-black"}>
                        {PIECE_ICONS[piece.toLowerCase()] || piece}
                    </span>
                ))}
            </div>
            {score && score > 0 && (
                <span className="text-xs font-semibold bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded text-gray-700 dark:text-gray-300">
                    +{score}
                </span>
            )}
        </div>
    );
});

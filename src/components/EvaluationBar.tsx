"use client";

import { memo } from "react";
import clsx from "clsx";

interface EvaluationBarProps {
    score?: number | null; // centipawns
    mate?: number | null; // moves to mate
    isPlayerWhite: boolean;
    orientation?: 'vertical' | 'horizontal';
}

/**
 * Visual evaluation bar showing the current position advantage.
 * Memoized to prevent unnecessary re-renders when props haven't changed.
 */
export const EvaluationBar = memo(function EvaluationBar({ score, mate, isPlayerWhite, orientation = 'vertical' }: EvaluationBarProps) {
    // Calculate white's percentage height/width
    // Using sigmoid-like function for score: P = 1 / (1 + 10^(-score/400))
    // This is a standard way to visualize CP advantage.
    let whitePercent = 50;
    let label = "0.0";

    if (mate !== null && mate !== undefined) {
        // Mate detected
        if (mate > 0) {
            whitePercent = 100;
            label = `M${Math.abs(mate)}`;
        } else {
            whitePercent = 0;
            label = `M${Math.abs(mate)}`;
        }
    } else if (score !== null && score !== undefined) {
        // Score is in centipawns. 100 cp = 1 pawn.
        // We clamp the visual score somewhat to avoid extreme compression
        const winChance = 1 / (1 + Math.pow(10, -score / 400));
        whitePercent = winChance * 100;

        // Format label: +1.5 or -0.3
        // If player is NOT white, we invert the score for display (so + means Player advantage)
        let displayScore = score / 100;
        if (!isPlayerWhite) {
            displayScore = -displayScore;
        }

        label = displayScore > 0 ? `+${displayScore.toFixed(1)}` : displayScore.toFixed(1);
        if (score === 0) label = "0.0";
    }

    const isVertical = orientation === 'vertical';

    return (
        <div className={clsx(
            "bg-gray-800 border border-gray-400 relative overflow-hidden rounded shadow-inner",
            isVertical ? "w-8 h-full" : "w-full h-6"
        )}>
            {/* Black background is the container */}

            {/* White bar grows from bottom/left if player is white, from top/right if player is black */}
            <div
                className={clsx(
                    "absolute bg-white transition-all duration-500 ease-in-out",
                    isVertical ? "w-full" : "h-full",
                    // Vertical positioning
                    isVertical && (isPlayerWhite ? "bottom-0" : "top-0"),
                    // Horizontal positioning
                    !isVertical && (isPlayerWhite ? "left-0" : "right-0")
                )}
                style={{
                    height: isVertical ? `${whitePercent}%` : '100%',
                    width: !isVertical ? `${whitePercent}%` : '100%'
                }}
            />

            {/* Score Label */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className={clsx(
                    "font-bold text-white mix-blend-difference select-none",
                    isVertical ? "text-xs" : "text-sm"
                )}>
                    {label}
                </span>
            </div>
        </div>
    );
});

"use client";

import clsx from "clsx";

interface EvaluationBarProps {
    score?: number | null; // centipawns
    mate?: number | null; // moves to mate
    isPlayerWhite: boolean;
}

export function EvaluationBar({ score, mate, isPlayerWhite }: EvaluationBarProps) {
    // Calculate white's percentage height
    // Using sigmoid-like function for score: P = 1 / (1 + 10^(-score/400))
    // This is a standard way to visualize CP advantage.
    let whiteHeightPercent = 50;
    let label = "0.0";

    if (mate !== null && mate !== undefined) {
        // Mate detected
        if (mate > 0) {
            whiteHeightPercent = 100;
            label = `M${Math.abs(mate)}`;
        } else {
            whiteHeightPercent = 0;
            label = `M${Math.abs(mate)}`;
        }
    } else if (score !== null && score !== undefined) {
        // Score is in centipawns. 100 cp = 1 pawn.
        // We clamp the visual score somewhat to avoid extreme compression
        const winChance = 1 / (1 + Math.pow(10, -score / 400));
        whiteHeightPercent = winChance * 100;

        // Format label: +1.5 or -0.3
        // If player is NOT white, we invert the score for display (so + means Player advantage)
        let displayScore = score / 100;
        if (!isPlayerWhite) {
            displayScore = -displayScore;
        }

        label = displayScore > 0 ? `+${displayScore.toFixed(1)}` : displayScore.toFixed(1);
        if (score === 0) label = "0.0";
    }

    return (
        <div className="w-8 h-full bg-gray-800 border border-gray-400 relative overflow-hidden rounded shadow-inner">
            {/* Black background is the container (h-full) */}

            {/* White bar grows from bottom if player is white, from top if player is black */}
            <div
                className={clsx(
                    "absolute w-full bg-white transition-all duration-500 ease-in-out",
                    isPlayerWhite ? "bottom-0" : "top-0"
                )}
                style={{ height: `${whiteHeightPercent}%` }}
            />

            {/* Score Label */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-xs font-bold text-white mix-blend-difference select-none">
                    {label}
                </span>
            </div>
        </div>
    );
}

"use client";

import clsx from "clsx";

interface EvaluationBarProps {
    score?: number | null; // centipawns
    mate?: number | null; // moves to mate
}

export function EvaluationBar({ score, mate }: EvaluationBarProps) {
    // Calculate white's percentage height
    // Using sigmoid-like function for score: P = 1 / (1 + 10^(-score/400))
    // This is a standard way to visualize CP advantage.
    let whiteHeightPercent = 50;
    let label = "0.0";

    if (mate !== null && mate !== undefined) {
        // Mate detected
        if (mate > 0) {
            whiteHeightPercent = 100;
            label = `M${mate}`;
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
        const pawnScore = score / 100;
        label = pawnScore > 0 ? `+${pawnScore.toFixed(1)}` : pawnScore.toFixed(1);
        if (score === 0) label = "0.0";
    }

    // Invert label color based on background
    // If whiteHeightPercent is high, top is white, text should be black if it's at the top?
    // Actually, usually the text is placed based on who is winning or fixed.
    // Let's place text at top for White advantage and bottom for Black?
    // Or just center it? Standard is usually top/bottom or floating.
    // Let's keep it simple: Text always visible, color contrasting with the bar it's on.

    // We'll put the text in a small badge that floats? 
    // Or just inside the bar.

    return (
        <div className="w-8 h-full bg-gray-800 border border-gray-400 flex flex-col-reverse relative overflow-hidden rounded shadow-inner">
            {/* Black background is the container (h-full) */}

            {/* White bar grows from bottom (flex-col-reverse) */}
            <div
                className="w-full bg-white transition-all duration-500 ease-in-out"
                style={{ height: `${whiteHeightPercent}%` }}
            />

            {/* Score Label */}
            <div className={clsx(
                "absolute w-full text-center text-xs font-bold py-1 select-none",
                whiteHeightPercent > 50 ? "top-0 text-gray-800" : "bottom-0 text-white"
            )}>
                {label}
            </div>
        </div>
    );
}

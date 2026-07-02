import { MoveHistoryItem } from "@/components/GameOverModal";
import { DetectedTactic } from "@/lib/tacticDetection";

type MistakeCategory = "inaccuracy" | "mistake" | "blunder";

function describeTactics(tactics?: DetectedTactic[]) {
    if (!tactics || tactics.length === 0) return "";
    const meaningful = tactics.filter((tactic) => tactic.tactic_type !== "none");
    if (meaningful.length === 0) return "";

    return meaningful.map((tactic) => {
        const material = tactic.material_delta ? ` (~${tactic.material_delta}cp)` : "";
        const pieces = tactic.piece_roles ? ` [${tactic.piece_roles.join(", ")}]` : "";
        return `${tactic.tactic_type}${material}${pieces}`;
    }).join("; ");
}

export function classifyMoveHistory(history: MoveHistoryItem[]) {
    return history.map((item) => {
        let evalBefore: number;
        let evalAfter: number;
        let playerMove: string;
        let bestMove: string | undefined;
        let bestMoveSan: string | null | undefined;
        const missedTactics = item.missedTactics;
        const cpLoss = item.cpLoss;

        const isWhite = item.playerColor === "white";
        if (item.evalBeforePlayerMove && item.evalAfterPlayerMove) {
            // Scores are already White-perspective (Stockfish.evaluate normalizes).
            evalBefore = item.evalBeforePlayerMove.score;
            evalAfter = item.evalAfterPlayerMove.score;
            playerMove = item.playerMove;
            bestMove = item.evalBeforePlayerMove.bestMove;
            bestMoveSan = item.bestMoveSan;
        } else {
            evalBefore = item.evalBefore || 0;
            evalAfter = item.evalAfter || 0;
            playerMove = item.move || "";
            bestMove = item.bestMove;
        }

        // Loss from the moving player's own perspective.
        const delta = isWhite ? evalBefore - evalAfter : evalAfter - evalBefore;
        const cpLossValue = cpLoss ?? delta;
        let category: MistakeCategory | null = null;

        if (cpLossValue >= 300) category = "blunder";
        else if (cpLossValue >= 100) category = "mistake";
        else if (cpLossValue >= 50) category = "inaccuracy";

        return {
            ...item,
            category,
            cpLoss: cpLossValue,
            move: playerMove,
            evalBefore,
            evalAfter,
            bestMove,
            bestMoveSan,
            missedTactics,
        };
    }).filter((item) => item.category !== null) as Array<MoveHistoryItem & { category: MistakeCategory; cpLoss: number; evalBefore: number; evalAfter: number; move: string }>;
}

export function buildGameNarrative(history: MoveHistoryItem[]) {
    return history.map((item, index) => {
        const moveNum = item.moveNumber || index + 1;
        const playerMove = item.playerMove || item.move || "?";
        const computerMove = item.computerMove || "?";
        const opening = item.opening ? ` [${item.opening}]` : "";

        let evalInfo = "";
        if (item.evalBeforePlayerMove && item.evalAfterPlayerMove && item.evalAfterComputerMove) {
            // All scores are already White-perspective; show the trajectory as-is.
            const p0 = item.evalBeforePlayerMove.score;
            const p1 = item.evalAfterPlayerMove.score;
            const p2 = item.evalAfterComputerMove.score;
            evalInfo = ` (eval: ${Math.round(p0)} → ${Math.round(p1)} → ${Math.round(p2)})`;
        }

        return `${moveNum}. ${playerMove} - ${computerMove}${opening}${evalInfo}`;
    }).join("\n");
}

export function buildGameOverAnalysisPrompt(args: {
    history: MoveHistoryItem[];
    language: "en" | "de" | "fr" | "it";
    result: string;
    winner: "White" | "Black" | "Draw";
}) {
    const mistakes = classifyMoveHistory(args.history);
    const blunders = mistakes.filter((mistake) => mistake.category === "blunder");
    const ordinaryMistakes = mistakes.filter((mistake) => mistake.category === "mistake");
    const inaccuracies = mistakes.filter((mistake) => mistake.category === "inaccuracy");

    const mistakesText = mistakes.map((mistake) => {
        const tacticSummary = describeTactics(mistake.missedTactics);
        const bestMoveDisplay = mistake.bestMoveSan || mistake.bestMove || "N/A";
        const tacticNote = tacticSummary ? ` Tactics missed: ${tacticSummary}.` : "";
        return `Move ${mistake.moveNumber}: ${mistake.move} (${mistake.category.toUpperCase()}: -${Math.round(mistake.cpLoss)}cp loss, eval ${Math.round(mistake.evalBefore)} → ${Math.round(mistake.evalAfter)}). Best was: ${bestMoveDisplay}.${tacticNote}`;
    }).join("\n");

    return {
        mistakes,
        prompt: `
You are a Chess Coach analyzing a completed game.

GAME RESULT: ${args.result} (${args.winner === "Draw" ? "Draw" : `${args.winner} Won`})

PLAYER'S PERFORMANCE SUMMARY:
- Blunders (300+ cp loss): ${blunders.length}
- Mistakes (100-300 cp loss): ${ordinaryMistakes.length}
- Inaccuracies (50-100 cp loss): ${inaccuracies.length}
- Total moves played: ${args.history.length}

${mistakesText ? `CRITICAL MISTAKES:\n${mistakesText}` : "No significant mistakes detected - excellent play!"}

COMPLETE GAME MOVES:
${buildGameNarrative(args.history)}

INSTRUCTIONS:
1. Briefly comment on the game result and overall performance.
2. If there were mistakes, explain WHY the worst ones were bad:
   - What tactical or positional themes were missed?
   - What should the player have looked for? (hanging pieces, forks, pins, back rank threats, etc.)
   - Were there patterns in the mistakes? (time pressure, opening knowledge, endgame technique?)
3. Identify any TURNING POINTS where the evaluation swung significantly.
4. If no mistakes, praise the solid play and suggest specific areas for improvement.
5. Be encouraging but educational. Focus on actionable learning points.
6. Keep your response concise (3-5 paragraphs maximum).
7. Respond in ${args.language.toUpperCase()}.

Remember: Your goal is to help the player LEARN and IMPROVE, not just list mistakes.

OUTPUT FORMAT:
Plain text paragraph (2-3 sentences).
        `,
    };
}


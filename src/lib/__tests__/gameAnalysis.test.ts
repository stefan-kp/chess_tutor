import { buildGameNarrative, buildGameOverAnalysisPrompt, classifyMoveHistory } from "@/lib/gameAnalysis";
import { MoveHistoryItem } from "@/components/GameOverModal";

const historyItem: MoveHistoryItem = {
  moveNumber: 1,
  playerMove: "e4",
  playerColor: "white",
  fenBeforePlayerMove: "fen-0",
  evalBeforePlayerMove: { bestMove: "e2e4", ponder: null, score: 120, mate: null, depth: 15 },
  fenAfterPlayerMove: "fen-1",
  evalAfterPlayerMove: { bestMove: "e7e5", ponder: null, score: 10, mate: null, depth: 15 },
  computerMove: "e5",
  fenAfterComputerMove: "fen-2",
  evalAfterComputerMove: { bestMove: "g1f3", ponder: null, score: 0, mate: null, depth: 15 },
  opening: "King's Pawn Game",
  cpLoss: 110,
  bestMoveSan: "Nf3",
  missedTactics: [{ tactic_type: "fork", affected_squares: ["e5"], material_delta: 300, piece_roles: ["white knight"], move: "Nf3" }],
};

describe("gameAnalysis", () => {
  it("classifies move history into categorized mistakes", () => {
    const mistakes = classifyMoveHistory([historyItem]);

    expect(mistakes).toHaveLength(1);
    expect(mistakes[0].category).toBe("mistake");
    expect(mistakes[0].evalBefore).toBe(120);
    expect(mistakes[0].evalAfter).toBe(10);
  });

  it("builds a narrative with opening and evaluation swings", () => {
    const narrative = buildGameNarrative([historyItem]);

    expect(narrative).toContain("1. e4 - e5 [King's Pawn Game]");
    expect(narrative).toContain("(eval: 120 → 10 → 0)");
  });

  it("builds a game-over prompt with aggregated mistake counts", () => {
    const { mistakes, prompt } = buildGameOverAnalysisPrompt({
      history: [historyItem],
      language: "en",
      result: "Checkmate! You lost.",
      winner: "Black",
    });

    expect(mistakes).toHaveLength(1);
    expect(prompt).toContain("Blunders (300+ cp loss): 0");
    expect(prompt).toContain("Mistakes (100-300 cp loss): 1");
    expect(prompt).toContain("Tactics missed: fork (~300cp) [white knight].");
  });
});


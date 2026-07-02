import { Chess } from "chess.js";

import { buildAutomaticAnalysisPrompt, buildMoveCommentaryPrompt, buildTeachingPrompt } from "@/lib/analysisPrompts";

describe("analysisPrompts", () => {
  it("builds a hint prompt with current position context", () => {
    const prompt = buildTeachingPrompt(
      "Give me a hint",
      "test-fen",
      { bestMove: "e2e4", ponder: null, score: 34, mate: null, depth: 15 },
      [{ name: "Ruy Lopez", eco: "C60", moves: "1. e4 e5 2. Nf3 Nc6 3. Bb5", src: "" }],
      "en"
    );

    expect(prompt).toContain("[SYSTEM TRIGGER: hint]");
    expect(prompt).toContain("FEN: test-fen");
    expect(prompt).toContain("Best Move: e2e4");
    expect(prompt).toContain("Ruy Lopez (C60)");
  });

  it("builds an automatic move analysis prompt with tactical context", () => {
    const game = new Chess();
    const userMove = game.move("e4");
    const computerMove = game.move("e5");
    const prompt = buildAutomaticAnalysisPrompt({
      computerMove: computerMove!,
      currentFen: game.fen(),
      evalP0: { bestMove: "e2e4", ponder: null, score: 20, mate: null, depth: 15 },
      evalP2: { bestMove: "g1f3", ponder: null, score: -120, mate: null, depth: 15 },
      game,
      language: "en",
      missedTactics: [{
        tactic_type: "fork",
        affected_squares: ["e5"],
        material_delta: 300,
        piece_roles: ["white knight"],
        move: "Nf3",
      }],
      openingData: [{ name: "King's Pawn Game", eco: "C20", moves: "1. e4 e5", src: "" }],
      playerColorName: "White",
      tutorColorName: "Black",
      userMove: userMove!,
    });

    expect(prompt).toContain("[SYSTEM TRIGGER: move_exchange]");
    expect(prompt).toContain("TACTICAL OPPORTUNITY MISSED");
    expect(prompt).toContain("FORK involving white knight");
    expect(prompt).toContain("King's Pawn Game (C20)");
  });

  it("builds a move commentary prompt with normalized fields", () => {
    const prompt = buildMoveCommentaryPrompt({
      bestMove: "Nf3",
      color: "white",
      cpLoss: 85,
      evalAfter: -0.4,
      evalBefore: 0.2,
      fenAfter: "fen-after",
      fenBefore: "fen-before",
      mateInfo: "No mate detected",
      moveNumber: 4,
      openings: "Ruy Lopez (C60)",
      san: "Bb5",
      tactics: "fork (~3.0 pawns)",
    });

    expect(prompt).toContain("Move number: 4");
    expect(prompt).toContain("Move played (SAN): Bb5");
    expect(prompt).toContain("Evaluation shift (centipawns): 85");
    expect(prompt).toContain("Missed tactics: fork (~3.0 pawns)");
  });
});


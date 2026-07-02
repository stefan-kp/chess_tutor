import { Chess } from "chess.js";

import { buildMoveHistoryItem, getCapturedState } from "@/lib/gameState";

jest.mock("@/lib/tacticDetection", () => ({
  detectMissedTactics: jest.fn(() => [{ tactic_type: "fork", affected_squares: ["e5"], material_delta: 300, piece_roles: ["white knight"], move: "Nf3" }]),
  uciToSan: jest.fn(() => "Nf3"),
}));

describe("gameState", () => {
  it("derives captured state from move history", () => {
    const game = new Chess();
    game.move("e4");
    game.move("d5");
    game.move("exd5");
    game.move("Qxd5");

    const capturedState = getCapturedState(game);

    expect(capturedState.whitePiecesLost).toEqual(["p"]);
    expect(capturedState.blackPiecesLost).toEqual(["p"]);
    expect(capturedState.whiteLostScore).toBe(1);
    expect(capturedState.blackLostScore).toBe(1);
  });

  it("builds a move history item with cp loss and derived tactics", () => {
    const game = new Chess();
    const playerMove = game.move("e4")!;
    const computerMove = game.move("e5")!;

    const { historyItem, missedTactics } = buildMoveHistoryItem({
      computerMove,
      evalP0: { bestMove: "g1f3", ponder: null, score: 80, mate: null, depth: 15 },
      fenAfterComputerMove: game.fen(),
      fenBeforePlayerMove: "start-fen",
      openingData: [{ name: "King's Pawn Game", eco: "C20", moves: "1. e4 e5", src: "" }],
      p1Eval: { bestMove: "e7e5", ponder: null, score: 20, mate: null, depth: 15 },
      p2Eval: { bestMove: "g1f3", ponder: null, score: 10, mate: null, depth: 15 },
      playerColor: "white",
      playerMove,
    });

    expect(historyItem.playerMove).toBe("e4");
    expect(historyItem.computerMove).toBe("e5");
    expect(historyItem.opening).toBe("King's Pawn Game");
    expect(historyItem.bestMoveSan).toBe("Nf3");
    expect(historyItem.cpLoss).toBe(60);
    expect(missedTactics).toHaveLength(1);
  });
});

import { Chess } from "chess.js";
import {
  Color,
  GeneratedTacticPosition,
  TacticalPatternType,
  generateBackRankWeaknessPosition,
  generateDiscoveredCheckPosition,
  generateDoubleAttackPosition,
  generateForkPosition,
  generateOverloadingPosition,
  generatePinPosition,
  generateSkewerPosition,
  generateTrappedPiecePosition,
} from "../tacticalLibrary";

type GeneratorEntry = {
  patternType: TacticalPatternType;
  side: Color;
  generator: () => GeneratedTacticPosition;
};

const generators: GeneratorEntry[] = [
  { patternType: "PIN", side: "white", generator: () => generatePinPosition({ side: "white" }) },
  { patternType: "SKEWER", side: "white", generator: () => generateSkewerPosition({ side: "white" }) },
  { patternType: "FORK", side: "white", generator: () => generateForkPosition({ side: "white" }) },
  { patternType: "DISCOVERED_CHECK", side: "white", generator: () => generateDiscoveredCheckPosition({ side: "white" }) },
  { patternType: "DOUBLE_ATTACK", side: "white", generator: () => generateDoubleAttackPosition({ side: "white" }) },
  { patternType: "OVERLOADING", side: "white", generator: () => generateOverloadingPosition({ side: "white" }) },
  { patternType: "BACK_RANK_WEAKNESS", side: "white", generator: () => generateBackRankWeaknessPosition({ side: "white" }) },
  { patternType: "TRAPPED_PIECE", side: "white", generator: () => generateTrappedPiecePosition({ side: "white" }) },
];

describe("tactic generators", () => {
  it.each(generators)(
    "generates valid %s tactical puzzles from Lichess database",
    ({ patternType, side, generator }) => {
      const scenario = generator();

      // Verify the scenario has all required fields
      expect(scenario.initialPosition.fen).toBeTruthy();
      expect(scenario.creatingMove).toBeDefined();
      expect(scenario.creatingMove.from).toBeTruthy();
      expect(scenario.creatingMove.to).toBeTruthy();
      expect(scenario.resultingPosition.fen).toBeTruthy();
      expect(scenario.expectedPattern.type).toBe(patternType);
      expect(scenario.side).toBe(side);

      // Verify the first move (bestMove) is legal in the initial position
      const chess = new Chess(scenario.initialPosition.fen);
      const firstMove = chess.move({
        from: scenario.creatingMove.from,
        to: scenario.creatingMove.to,
        promotion: scenario.creatingMove.promotion,
      });
      expect(firstMove).toBeTruthy();
      expect(firstMove).toMatchObject({
        from: scenario.creatingMove.from,
        to: scenario.creatingMove.to,
      });

      // Verify it's the correct side's turn
      const turnColor = scenario.initialPosition.fen.split(' ')[1];
      expect(turnColor).toBe(side === 'white' ? 'w' : 'b');
    },
  );
});


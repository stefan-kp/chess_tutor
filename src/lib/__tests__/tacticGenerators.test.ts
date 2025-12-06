import {
  Color,
  GeneratedTacticPosition,
  TacticalPatternType,
  detectTacticsForSide,
  findTacticalOpportunitiesForSide,
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
  { patternType: "BACK_RANK_WEAKNESS", side: "black", generator: () => generateBackRankWeaknessPosition({ side: "black" }) },
  { patternType: "TRAPPED_PIECE", side: "black", generator: () => generateTrappedPiecePosition({ side: "black" }) },
];

describe("tactic generators", () => {
  it.each(generators)(
    "creates scenarios where opportunities expose %s",
    ({ patternType, side, generator }) => {
      const scenario = generator();

      const opportunities = findTacticalOpportunitiesForSide(scenario.initialPosition, side);
      const opportunity = opportunities.find(
        (o) =>
          o.move.from === scenario.creatingMove.from &&
          o.move.to === scenario.creatingMove.to &&
          o.pattern.type === patternType,
      );

      expect(opportunity).toBeDefined();
      expect(opportunity?.pattern).toMatchObject({ type: patternType });

      const resultingPatterns = detectTacticsForSide(scenario.resultingPosition, side);
      const directMatch = resultingPatterns.find((p) => p.type === patternType);

      expect(directMatch).toBeDefined();
      expect(scenario.resultingPosition.fen).toBeTruthy();
    },
  );
});


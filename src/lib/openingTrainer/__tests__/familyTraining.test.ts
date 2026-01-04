/**
 * Integration tests for Family Training Mode
 * Tests the variation tree and multi-variation support
 */

import {
  buildVariationTree,
  getTreeNodeAtPosition,
  getMatchingVariations,
  getAllPossibleNextMoves,
  isMoveInVariationTree,
  identifyCurrentVariation,
  describeCurrentPosition,
} from '../gameLogic';
import { OpeningMetadata } from '@/lib/openings';
import { MoveHistoryEntry } from '@/types/openingTraining';

// ============================================================================
// Test Data - Italian Game variations
// ============================================================================

const italianGameVariations: OpeningMetadata[] = [
  {
    eco: 'C50',
    name: 'Italian Game',
    moves: '1. e4 e5 2. Nf3 Nc6 3. Bc4',
    src: 'test',
    isEcoRoot: true,
  },
  {
    eco: 'C53',
    name: 'Italian Game: Classical Variation',
    moves: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3',
    src: 'test',
  },
  {
    eco: 'C54',
    name: 'Italian Game: Giuoco Piano',
    moves: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d4',
    src: 'test',
  },
  {
    eco: 'C55',
    name: 'Italian Game: Two Knights Defense',
    moves: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6',
    src: 'test',
  },
];

function createMoveEntry(
  san: string,
  color: 'white' | 'black',
  moveNumber: number
): MoveHistoryEntry {
  return {
    moveNumber,
    color,
    san,
    uci: 'e2e4',
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    timestamp: Date.now(),
    evaluation: { score: 0, mate: null, depth: 15, bestMove: 'e4', ponder: null },
    classification: {
      category: 'in-theory',
      inRepertoire: true,
      evaluationChange: 0,
      isSignificantSwing: false,
      theoreticalAlternatives: [],
    },
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('Family Training Mode - Variation Tree', () => {
  describe('buildVariationTree', () => {
    it('should build a tree from multiple variations', () => {
      const tree = buildVariationTree(italianGameVariations, 'Italian Game');

      expect(tree.familyName).toBe('Italian Game');
      expect(tree.allVariations).toHaveLength(4);
      expect(tree.children.size).toBe(1); // Only 1. e4 at root
      expect(tree.children.has('e4')).toBe(true);
    });

    it('should create correct branching structure', () => {
      const tree = buildVariationTree(italianGameVariations, 'Italian Game');

      // After 1. e4 e5 2. Nf3 Nc6 3. Bc4, there should be 2 branches
      const e4Node = tree.children.get('e4')!;
      const e5Node = e4Node.children.get('e5')!;
      const nf3Node = e5Node.children.get('Nf3')!;
      const nc6Node = nf3Node.children.get('Nc6')!;
      const bc4Node = nc6Node.children.get('Bc4')!;

      // After Bc4, should have Bc5 and Nf6 as options
      expect(bc4Node.children.size).toBe(2);
      expect(bc4Node.children.has('Bc5')).toBe(true);
      expect(bc4Node.children.has('Nf6')).toBe(true);
    });

    it('should track variations at each node', () => {
      const tree = buildVariationTree(italianGameVariations, 'Italian Game');

      const e4Node = tree.children.get('e4')!;
      // All variations start with e4
      expect(e4Node.variations).toHaveLength(4);
    });

    it('should mark end of line correctly', () => {
      const tree = buildVariationTree(italianGameVariations, 'Italian Game');

      // Navigate to end of "Italian Game" (shortest variation)
      const e4Node = tree.children.get('e4')!;
      const e5Node = e4Node.children.get('e5')!;
      const nf3Node = e5Node.children.get('Nf3')!;
      const nc6Node = nf3Node.children.get('Nc6')!;
      const bc4Node = nc6Node.children.get('Bc4')!;

      expect(bc4Node.isEndOfLine).toBe(true); // End of C50 variation
    });
  });

  describe('getTreeNodeAtPosition', () => {
    it('should return root node for empty move history', () => {
      const tree = buildVariationTree(italianGameVariations, 'Italian Game');
      const node = getTreeNodeAtPosition(tree, []);

      expect(node).not.toBeNull();
      expect(node!.variations).toHaveLength(4);
    });

    it('should navigate to correct position', () => {
      const tree = buildVariationTree(italianGameVariations, 'Italian Game');
      const moveHistory = [
        createMoveEntry('e4', 'white', 1),
        createMoveEntry('e5', 'black', 1),
        createMoveEntry('Nf3', 'white', 2),
      ];

      const node = getTreeNodeAtPosition(tree, moveHistory);

      expect(node).not.toBeNull();
      expect(node!.move).toBe('Nf3');
    });

    it('should return null for moves not in any variation', () => {
      const tree = buildVariationTree(italianGameVariations, 'Italian Game');
      const moveHistory = [
        createMoveEntry('d4', 'white', 1), // Not in Italian Game!
      ];

      const node = getTreeNodeAtPosition(tree, moveHistory);

      expect(node).toBeNull();
    });
  });

  describe('getMatchingVariations', () => {
    it('should return all variations at start', () => {
      const tree = buildVariationTree(italianGameVariations, 'Italian Game');
      const variations = getMatchingVariations(tree, []);

      expect(variations).toHaveLength(4);
    });

    it('should narrow down variations as moves are played', () => {
      const tree = buildVariationTree(italianGameVariations, 'Italian Game');

      // After 1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6
      const moveHistory = [
        createMoveEntry('e4', 'white', 1),
        createMoveEntry('e5', 'black', 1),
        createMoveEntry('Nf3', 'white', 2),
        createMoveEntry('Nc6', 'black', 2),
        createMoveEntry('Bc4', 'white', 3),
        createMoveEntry('Nf6', 'black', 3),
      ];

      const variations = getMatchingVariations(tree, moveHistory);

      // Only Two Knights Defense
      expect(variations).toHaveLength(1);
      expect(variations[0].name).toBe('Italian Game: Two Knights Defense');
    });

    it('should return empty array for off-book moves', () => {
      const tree = buildVariationTree(italianGameVariations, 'Italian Game');
      const moveHistory = [
        createMoveEntry('e4', 'white', 1),
        createMoveEntry('c5', 'black', 1), // Sicilian, not Italian!
      ];

      const variations = getMatchingVariations(tree, moveHistory);

      expect(variations).toHaveLength(0);
    });
  });

  describe('getAllPossibleNextMoves', () => {
    it('should return all possible first moves', () => {
      const tree = buildVariationTree(italianGameVariations, 'Italian Game');
      const moves = getAllPossibleNextMoves(tree, []);

      expect(moves).toHaveLength(1);
      expect(moves[0].move).toBe('e4');
      expect(moves[0].variations).toHaveLength(4);
    });

    it('should return multiple options at branch points', () => {
      const tree = buildVariationTree(italianGameVariations, 'Italian Game');

      // After 1. e4 e5 2. Nf3 Nc6 3. Bc4
      const moveHistory = [
        createMoveEntry('e4', 'white', 1),
        createMoveEntry('e5', 'black', 1),
        createMoveEntry('Nf3', 'white', 2),
        createMoveEntry('Nc6', 'black', 2),
        createMoveEntry('Bc4', 'white', 3),
      ];

      const moves = getAllPossibleNextMoves(tree, moveHistory);

      // Should have Bc5 (Classical/Giuoco Piano) and Nf6 (Two Knights)
      expect(moves).toHaveLength(2);
      const moveNames = moves.map(m => m.move).sort();
      expect(moveNames).toEqual(['Bc5', 'Nf6']);
    });

    it('should return empty array at end of all variations', () => {
      const tree = buildVariationTree(italianGameVariations, 'Italian Game');

      // Go to end of longest variation (Giuoco Piano)
      const moveHistory = [
        createMoveEntry('e4', 'white', 1),
        createMoveEntry('e5', 'black', 1),
        createMoveEntry('Nf3', 'white', 2),
        createMoveEntry('Nc6', 'black', 2),
        createMoveEntry('Bc4', 'white', 3),
        createMoveEntry('Bc5', 'black', 3),
        createMoveEntry('c3', 'white', 4),
        createMoveEntry('Nf6', 'black', 4),
        createMoveEntry('d4', 'white', 5),
      ];

      const moves = getAllPossibleNextMoves(tree, moveHistory);

      expect(moves).toHaveLength(0);
    });
  });

  describe('isMoveInVariationTree', () => {
    it('should return true for valid moves', () => {
      const tree = buildVariationTree(italianGameVariations, 'Italian Game');

      const isValid = isMoveInVariationTree(tree, [], 'e4');
      expect(isValid).toBe(true);
    });

    it('should return false for invalid moves', () => {
      const tree = buildVariationTree(italianGameVariations, 'Italian Game');

      const isValid = isMoveInVariationTree(tree, [], 'd4');
      expect(isValid).toBe(false);
    });

    it('should validate moves at branch points', () => {
      const tree = buildVariationTree(italianGameVariations, 'Italian Game');

      const moveHistory = [
        createMoveEntry('e4', 'white', 1),
        createMoveEntry('e5', 'black', 1),
        createMoveEntry('Nf3', 'white', 2),
        createMoveEntry('Nc6', 'black', 2),
        createMoveEntry('Bc4', 'white', 3),
      ];

      expect(isMoveInVariationTree(tree, moveHistory, 'Bc5')).toBe(true);
      expect(isMoveInVariationTree(tree, moveHistory, 'Nf6')).toBe(true);
      expect(isMoveInVariationTree(tree, moveHistory, 'd6')).toBe(false);
    });
  });

  describe('describeCurrentPosition', () => {
    it('should describe starting position', () => {
      const tree = buildVariationTree(italianGameVariations, 'Italian Game');
      const desc = describeCurrentPosition(tree, []);

      expect(desc.matchingCount).toBe(4);
      expect(desc.isEndOfLine).toBe(false);
      expect(desc.nextMoves).toContain('e4');
    });

    it('should identify branch points', () => {
      const tree = buildVariationTree(italianGameVariations, 'Italian Game');

      const moveHistory = [
        createMoveEntry('e4', 'white', 1),
        createMoveEntry('e5', 'black', 1),
        createMoveEntry('Nf3', 'white', 2),
        createMoveEntry('Nc6', 'black', 2),
        createMoveEntry('Bc4', 'white', 3),
      ];

      const desc = describeCurrentPosition(tree, moveHistory);

      expect(desc.matchingCount).toBe(4); // All 4 variations pass through this position
      expect(desc.nextMoves).toHaveLength(2);
      expect(desc.nextMoves).toContain('Bc5');
      expect(desc.nextMoves).toContain('Nf6');
    });

    it('should detect end of line', () => {
      const tree = buildVariationTree(italianGameVariations, 'Italian Game');

      // Go to actual end of a line (Giuoco Piano)
      const moveHistory = [
        createMoveEntry('e4', 'white', 1),
        createMoveEntry('e5', 'black', 1),
        createMoveEntry('Nf3', 'white', 2),
        createMoveEntry('Nc6', 'black', 2),
        createMoveEntry('Bc4', 'white', 3),
        createMoveEntry('Bc5', 'black', 3),
        createMoveEntry('c3', 'white', 4),
        createMoveEntry('Nf6', 'black', 4),
        createMoveEntry('d4', 'white', 5),
      ];

      const desc = describeCurrentPosition(tree, moveHistory);

      expect(desc.isEndOfLine).toBe(true); // End of Giuoco Piano
      expect(desc.matchingCount).toBe(1); // Only Giuoco Piano reaches here
      expect(desc.nextMoves).toHaveLength(0); // No more moves in repertoire
    });
  });

  describe('identifyCurrentVariation', () => {
    it('should identify specific variation', () => {
      const tree = buildVariationTree(italianGameVariations, 'Italian Game');

      // Two Knights Defense
      const moveHistory = [
        createMoveEntry('e4', 'white', 1),
        createMoveEntry('e5', 'black', 1),
        createMoveEntry('Nf3', 'white', 2),
        createMoveEntry('Nc6', 'black', 2),
        createMoveEntry('Bc4', 'white', 3),
        createMoveEntry('Nf6', 'black', 3),
      ];

      const result = identifyCurrentVariation(tree, moveHistory);

      expect(result.exact).toHaveLength(1);
      expect(result.exact[0].name).toBe('Italian Game: Two Knights Defense');
    });

    it('should return multiple variations when moves overlap', () => {
      const tree = buildVariationTree(italianGameVariations, 'Italian Game');

      // After Bc5, both Classical and Giuoco Piano are possible
      const moveHistory = [
        createMoveEntry('e4', 'white', 1),
        createMoveEntry('e5', 'black', 1),
        createMoveEntry('Nf3', 'white', 2),
        createMoveEntry('Nc6', 'black', 2),
        createMoveEntry('Bc4', 'white', 3),
        createMoveEntry('Bc5', 'black', 3),
      ];

      const result = identifyCurrentVariation(tree, moveHistory);

      // No exact matches at this position, but multiple possible continuations
      expect(result.possible.length).toBeGreaterThanOrEqual(2);
      const names = result.possible.map(v => v.name);
      expect(names).toContain('Italian Game: Classical Variation');
      expect(names).toContain('Italian Game: Giuoco Piano');
    });
  });
});

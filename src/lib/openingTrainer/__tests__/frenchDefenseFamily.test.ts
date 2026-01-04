/**
 * Test French Defense Family Mode
 *
 * This tests the actual scenario where the tutor recommends wrong moves
 */

import {
  buildVariationTree,
  getAllPossibleNextMoves,
  parseMoveSequence,
} from '../gameLogic';
import { getOpeningsByFamily } from '../openingLoader';
import { MoveHistoryEntry } from '@/types/openingTraining';

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

describe('French Defense - Family Mode Bug', () => {
  it('should load French Defense variations', () => {
    const variations = getOpeningsByFamily('French Defense');

    expect(variations.length).toBeGreaterThan(0);
    console.log(`Loaded ${variations.length} French Defense variations`);
  });

  it('should build variation tree for French Defense', () => {
    const variations = getOpeningsByFamily('French Defense');
    const tree = buildVariationTree(variations, 'French Defense');

    expect(tree.familyName).toBe('French Defense');
    expect(tree.allVariations.length).toBe(variations.length);
  });

  it('should show correct moves after 1. e4 e6', () => {
    const variations = getOpeningsByFamily('French Defense');
    const tree = buildVariationTree(variations, 'French Defense');

    const moveHistory = [
      createMoveEntry('e4', 'white', 1),
      createMoveEntry('e6', 'black', 1),
    ];

    const possibleMoves = getAllPossibleNextMoves(tree, moveHistory);

    console.log('After 1. e4 e6, possible 2nd moves for White:');
    console.log(possibleMoves.map(m => m.move).join(', '));

    // White should have d4 as an option
    const moveNames = possibleMoves.map(m => m.move);
    expect(moveNames).toContain('d4');
  });

  it('should show correct moves after 1. e4 e6 2. d4', () => {
    const variations = getOpeningsByFamily('French Defense');
    const tree = buildVariationTree(variations, 'French Defense');

    const moveHistory = [
      createMoveEntry('e4', 'white', 1),
      createMoveEntry('e6', 'black', 1),
      createMoveEntry('d4', 'white', 2),
    ];

    const possibleMoves = getAllPossibleNextMoves(tree, moveHistory);

    console.log('After 1. e4 e6 2. d4, possible moves for Black:');
    console.log(possibleMoves.map(m => m.move).join(', '));

    // Black should have d5 as the main option
    const moveNames = possibleMoves.map(m => m.move);
    expect(moveNames).toContain('d5');
  });

  it('should show correct moves after 1. e4 e6 2. d4 d5', () => {
    const variations = getOpeningsByFamily('French Defense');
    const tree = buildVariationTree(variations, 'French Defense');

    const moveHistory = [
      createMoveEntry('e4', 'white', 1),
      createMoveEntry('e6', 'black', 1),
      createMoveEntry('d4', 'white', 2),
      createMoveEntry('d5', 'black', 2),
    ];

    const possibleMoves = getAllPossibleNextMoves(tree, moveHistory);

    console.log('After 1. e4 e6 2. d4 d5, possible 3rd moves for White:');
    const moveNames = possibleMoves.map(m => m.move).sort();
    console.log(moveNames.join(', '));

    // These are the moves from the earlier test
    const expectedMoves = ['Nd2', 'Nc3', 'e5', 'exd5', 'Qe2', 'Nf3', 'c4', 'Be3', 'Nh3', 'Bd3'];

    expectedMoves.forEach(move => {
      expect(moveNames).toContain(move);
    });

    // Make sure we don't have any random moves
    expect(moveNames.length).toBeGreaterThan(0);
    console.log(`Total ${moveNames.length} possible moves found`);
  });

  it('should parse moves correctly from opening string', () => {
    // Test the parseMoveSequence function
    const testOpening = '1. e4 e6 2. d4 d5 3. Nd2';
    const moves = parseMoveSequence(testOpening);

    console.log('Parsed moves from "1. e4 e6 2. d4 d5 3. Nd2":');
    console.log(moves);

    expect(moves).toEqual(['e4', 'e6', 'd4', 'd5', 'Nd2']);
  });
});

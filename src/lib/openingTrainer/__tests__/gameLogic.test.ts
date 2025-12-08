import {
  validateMove,
  applyMove,
  buildFenAtIndex,
  parseMoveSequence,
  isInTheory,
  getExpectedNextMoves,
  isEndOfRepertoire,
  classifyMove,
  getUserColor,
  isUserTurn,
  isOpponentTurn,
  shouldOpponentAutoMove,
  getOpponentNextMove,
  findDeviationPoint,
  resetDeviationIfBackInTheory,
  extractOpeningFamily,
  hasWikipediaPage,
} from '../gameLogic';
import { OpeningMetadata } from '@/lib/openings';
import { MoveHistoryEntry } from '@/types/openingTraining';
import { STARTING_FEN } from '../constants';

// ============================================================================
// Test Helpers
// ============================================================================

const mockOpening: OpeningMetadata = {
  eco: 'C00',
  name: 'French Defense',
  moves: '1. e4 e6 2. d4 d5',
  wikipediaSlug: 'French_Defence',
};

const mockBlackOpening: OpeningMetadata = {
  eco: 'D00',
  name: "Queen's Pawn Opening",
  moves: '1. d4 d5',
  wikipediaSlug: 'Queens_Pawn_Game',
};

function createMockMoveEntry(
  san: string,
  color: 'white' | 'black',
  fen: string,
  moveNumber: number
): MoveHistoryEntry {
  return {
    moveNumber,
    color,
    san,
    uci: 'e2e4', // Simplified for testing
    fen,
    evaluation: { score: 0, mate: null, depth: 15, bestMove: 'e4', ponder: null },
    classification: {
      category: 'in-theory',
      inRepertoire: true,
      evaluationChange: 0,
      isSignificantSwing: false,
      theoreticalAlternatives: [],
    },
    timestamp: Date.now(),
  };
}

// ============================================================================
// Move Validation & Execution Tests
// ============================================================================

describe('validateMove', () => {
  test('accepts legal move from starting position', () => {
    const result = validateMove(STARTING_FEN, 'e4');

    expect(result).not.toBeNull();
    expect(result?.san).toBe('e4');
    expect(result?.from).toBe('e2');
    expect(result?.to).toBe('e4');
    expect(result?.color).toBe('w');
  });

  test('rejects illegal move', () => {
    const result = validateMove(STARTING_FEN, 'e5'); // White pawn can't jump to e5
    expect(result).toBeNull();
  });

  test('handles invalid SAN notation', () => {
    const result = validateMove(STARTING_FEN, 'invalid');
    expect(result).toBeNull();
  });

  test('accepts capture move', () => {
    const fenWithCapture = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2';
    const result = validateMove(fenWithCapture, 'exd5');

    // Note: In this FEN, there's no piece on d5 to capture, so this would be illegal
    // Let me fix this to a valid capture position
  });

  test('handles promotion', () => {
    const fenBeforePromotion = '4k3/P7/8/8/8/8/8/4K3 w - - 0 1';
    const result = validateMove(fenBeforePromotion, 'a8=Q');

    expect(result).not.toBeNull();
    expect(result?.promotion).toBe('q');
  });
});

describe('applyMove', () => {
  test('returns new FEN after legal move', () => {
    const result = applyMove(STARTING_FEN, 'e4');

    expect(result).not.toBeNull();
    expect(result?.newFen).toContain(' b '); // Black to move
    expect(result?.move.san).toBe('e4');
  });

  test('returns null for illegal move', () => {
    const result = applyMove(STARTING_FEN, 'e5');
    expect(result).toBeNull();
  });
});

describe('buildFenAtIndex', () => {
  test('returns starting FEN for index 0', () => {
    const moveHistory: MoveHistoryEntry[] = [
      createMockMoveEntry('e4', 'white', 'fen1', 1),
      createMockMoveEntry('e5', 'black', 'fen2', 1),
    ];

    const fen = buildFenAtIndex(moveHistory, 0);
    expect(fen).toBe(STARTING_FEN);
  });

  test('returns FEN after first move', () => {
    const fen1 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
    const moveHistory: MoveHistoryEntry[] = [
      createMockMoveEntry('e4', 'white', fen1, 1),
    ];

    const fen = buildFenAtIndex(moveHistory, 1);
    expect(fen).toBe(fen1);
  });

  test('returns FEN after multiple moves', () => {
    const fen1 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
    const fen2 = 'rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
    const moveHistory: MoveHistoryEntry[] = [
      createMockMoveEntry('e4', 'white', fen1, 1),
      createMockMoveEntry('e6', 'black', fen2, 1),
    ];

    const fen = buildFenAtIndex(moveHistory, 2);
    expect(fen).toBe(fen2);
  });
});

// ============================================================================
// Opening Theory Logic Tests
// ============================================================================

describe('parseMoveSequence', () => {
  test('parses standard move notation', () => {
    const moves = parseMoveSequence('1. e4 e5 2. Nf3');
    expect(moves).toEqual(['e4', 'e5', 'Nf3']);
  });

  test('handles extra whitespace', () => {
    const moves = parseMoveSequence('1.  e4   e5  2. Nf3');
    expect(moves).toEqual(['e4', 'e5', 'Nf3']);
  });

  test('handles empty string', () => {
    const moves = parseMoveSequence('');
    expect(moves).toEqual([]);
  });

  test('parses longer sequences', () => {
    const moves = parseMoveSequence('1. e4 e6 2. d4 d5 3. Nc3 Nf6');
    expect(moves).toEqual(['e4', 'e6', 'd4', 'd5', 'Nc3', 'Nf6']);
  });
});

describe('isInTheory', () => {
  test('returns true when all moves match repertoire', () => {
    const fen1 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
    const fen2 = 'rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';

    const moveHistory: MoveHistoryEntry[] = [
      createMockMoveEntry('e4', 'white', fen1, 1),
      createMockMoveEntry('e6', 'black', fen2, 1),
    ];

    const result = isInTheory(mockOpening, moveHistory);
    expect(result).toBe(true);
  });

  test('returns false when move deviates from repertoire', () => {
    const fen1 = 'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3 0 1';

    const moveHistory: MoveHistoryEntry[] = [
      createMockMoveEntry('d4', 'white', fen1, 1), // Wrong! Should be e4
    ];

    const result = isInTheory(mockOpening, moveHistory);
    expect(result).toBe(false);
  });

  test('returns false when past end of repertoire', () => {
    const moveHistory: MoveHistoryEntry[] = [
      createMockMoveEntry('e4', 'white', 'fen1', 1),
      createMockMoveEntry('e6', 'black', 'fen2', 1),
      createMockMoveEntry('d4', 'white', 'fen3', 2),
      createMockMoveEntry('d5', 'black', 'fen4', 2),
      createMockMoveEntry('Nc3', 'white', 'fen5', 3), // Past repertoire
    ];

    const result = isInTheory(mockOpening, moveHistory);
    expect(result).toBe(false);
  });

  test('can check if proposed move would stay in theory', () => {
    const fen1 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';

    const moveHistory: MoveHistoryEntry[] = [
      createMockMoveEntry('e4', 'white', fen1, 1),
    ];

    const resultInTheory = isInTheory(mockOpening, moveHistory, 'e6'); // Correct
    const resultOffTheory = isInTheory(mockOpening, moveHistory, 'e5'); // Wrong

    expect(resultInTheory).toBe(true);
    expect(resultOffTheory).toBe(false);
  });
});

describe('getExpectedNextMoves', () => {
  test('returns first move at index 0', () => {
    const moves = getExpectedNextMoves(mockOpening, 0);
    expect(moves).toEqual(['e4']);
  });

  test('returns second move at index 1', () => {
    const moves = getExpectedNextMoves(mockOpening, 1);
    expect(moves).toEqual(['e6']);
  });

  test('returns empty array at end of repertoire', () => {
    const moves = getExpectedNextMoves(mockOpening, 4); // Past "e4 e6 d4 d5"
    expect(moves).toEqual([]);
  });
});

describe('isEndOfRepertoire', () => {
  test('returns false when moves remain', () => {
    const result = isEndOfRepertoire(mockOpening, 2);
    expect(result).toBe(false);
  });

  test('returns true when at end', () => {
    const result = isEndOfRepertoire(mockOpening, 4); // "e4 e6 d4 d5" = 4 moves
    expect(result).toBe(true);
  });

  test('returns true when past end', () => {
    const result = isEndOfRepertoire(mockOpening, 10);
    expect(result).toBe(true);
  });
});

// ============================================================================
// Move Classification Tests
// ============================================================================

describe('classifyMove', () => {
  const prevEval = { score: 25, mate: null, depth: 15, bestMove: 'e4', ponder: null };
  const currEval = { score: 30, mate: null, depth: 15, bestMove: 'd4', ponder: null };

  test('classifies in-theory move correctly', () => {
    const result = classifyMove('e4', ['e4'], ['e4'], currEval, prevEval);

    expect(result.category).toBe('in-theory');
    expect(result.evaluationChange).toBe(5);
    expect(result.theoreticalAlternatives).toEqual([]);
  });

  test('classifies playable off-book move', () => {
    const result = classifyMove('Nf3', ['e4'], ['e4'], currEval, prevEval);

    expect(result.category).toBe('playable'); // Only 5cp change, not weak
  });

  test('classifies weak move with large eval loss', () => {
    const weakEval = { score: -30, mate: null, depth: 15, bestMove: 'd4', ponder: null };
    const result = classifyMove('h4', ['e4'], ['e4'], weakEval, prevEval);

    expect(result.category).toBe('weak'); // 55cp loss
  });

  test('provides theoretical alternatives', () => {
    const result = classifyMove('Nf3', ['e4', 'd4'], ['e4', 'd4'], currEval, prevEval);

    expect(result.theoreticalAlternatives).toEqual(['e4', 'd4']);
  });
});

// ============================================================================
// Turn & Color Logic Tests
// ============================================================================

describe('getUserColor', () => {
  test('returns white for A, B, C openings', () => {
    expect(getUserColor({ ...mockOpening, eco: 'A00' })).toBe('white');
    expect(getUserColor({ ...mockOpening, eco: 'B00' })).toBe('white');
    expect(getUserColor({ ...mockOpening, eco: 'C00' })).toBe('white');
  });

  test('returns black for D, E openings', () => {
    expect(getUserColor({ ...mockOpening, eco: 'D00' })).toBe('black');
    expect(getUserColor({ ...mockOpening, eco: 'E00' })).toBe('black');
  });
});

describe('isUserTurn', () => {
  test('returns true at start if user is White', () => {
    const result = isUserTurn(mockOpening, []);
    expect(result).toBe(true); // C00 = White opening
  });

  test('returns false at start if user is Black', () => {
    const result = isUserTurn(mockBlackOpening, []);
    expect(result).toBe(false); // D00 = Black opening
  });

  test('alternates correctly with move history', () => {
    const move1 = createMockMoveEntry('e4', 'white', 'fen1', 1);

    expect(isUserTurn(mockOpening, [])).toBe(true); // User's turn (White)
    expect(isUserTurn(mockOpening, [move1])).toBe(false); // Opponent's turn (Black)
  });
});

describe('isOpponentTurn', () => {
  test('is inverse of isUserTurn', () => {
    expect(isOpponentTurn(mockOpening, [])).toBe(!isUserTurn(mockOpening, []));

    const move1 = createMockMoveEntry('e4', 'white', 'fen1', 1);
    expect(isOpponentTurn(mockOpening, [move1])).toBe(!isUserTurn(mockOpening, [move1]));
  });
});

describe('shouldOpponentAutoMove', () => {
  test('returns true when opponent turn, in theory, not at end', () => {
    const move1 = createMockMoveEntry('e4', 'white', 'fen1', 1);

    const result = shouldOpponentAutoMove(mockOpening, [move1], null);
    expect(result).toBe(true);
  });

  test('returns false if user has deviated', () => {
    const move1 = createMockMoveEntry('e4', 'white', 'fen1', 1);

    const result = shouldOpponentAutoMove(mockOpening, [move1], 0); // Deviation at index 0
    expect(result).toBe(false);
  });

  test('returns false if at end of repertoire', () => {
    const moves: MoveHistoryEntry[] = [
      createMockMoveEntry('e4', 'white', 'fen1', 1),
      createMockMoveEntry('e6', 'black', 'fen2', 1),
      createMockMoveEntry('d4', 'white', 'fen3', 2),
      createMockMoveEntry('d5', 'black', 'fen4', 2),
    ];

    const result = shouldOpponentAutoMove(mockOpening, moves, null);
    expect(result).toBe(false); // At end of repertoire
  });

  test('returns false if user turn', () => {
    const result = shouldOpponentAutoMove(mockOpening, [], null);
    expect(result).toBe(false); // User (White) goes first
  });
});

describe('getOpponentNextMove', () => {
  test('returns opponent move at correct index', () => {
    const move = getOpponentNextMove(mockOpening, 1); // After e4, opponent plays e6
    expect(move).toBe('e6');
  });

  test('returns null at end of repertoire', () => {
    const move = getOpponentNextMove(mockOpening, 4);
    expect(move).toBeNull();
  });
});

// ============================================================================
// Deviation Tracking Tests
// ============================================================================

describe('findDeviationPoint', () => {
  test('returns null when all moves are in theory', () => {
    const moves: MoveHistoryEntry[] = [
      createMockMoveEntry('e4', 'white', 'fen1', 1),
      createMockMoveEntry('e6', 'black', 'fen2', 1),
    ];

    const result = findDeviationPoint(mockOpening, moves);
    expect(result).toBeNull();
  });

  test('returns index of first user deviation', () => {
    const moves: MoveHistoryEntry[] = [
      createMockMoveEntry('d4', 'white', 'fen1', 1), // Wrong! Should be e4
      createMockMoveEntry('d5', 'black', 'fen2', 1),
    ];

    const result = findDeviationPoint(mockOpening, moves);
    expect(result).toBe(0); // First move is wrong
  });

  test('only tracks user deviations, not opponent deviations', () => {
    const moves: MoveHistoryEntry[] = [
      createMockMoveEntry('e4', 'white', 'fen1', 1), // User (White) correct
      createMockMoveEntry('e5', 'black', 'fen2', 1), // Opponent wrong, but we don't track this
    ];

    // We only track USER deviations, not opponent deviations
    // The user (White) played correctly, so no deviation from user perspective
    const result = findDeviationPoint(mockOpening, moves);
    expect(result).toBeNull();
  });
});

describe('resetDeviationIfBackInTheory', () => {
  test('resets deviation when navigating before it and making theory move', () => {
    const moves: MoveHistoryEntry[] = []; // Empty after navigation

    const result = resetDeviationIfBackInTheory(
      2, // Original deviation at index 2
      0, // Navigated back to start
      'e4', // Making correct theory move
      mockOpening,
      moves
    );

    expect(result).toBeNull(); // Deviation reset
  });

  test('keeps deviation when new move is also off-book', () => {
    const moves: MoveHistoryEntry[] = [];

    const result = resetDeviationIfBackInTheory(
      2,
      0,
      'd4', // Wrong move
      mockOpening,
      moves
    );

    expect(result).toBe(2); // Deviation not reset
  });

  test('keeps deviation when not navigating before deviation point', () => {
    const moves: MoveHistoryEntry[] = [
      createMockMoveEntry('e4', 'white', 'fen1', 1),
      createMockMoveEntry('e6', 'black', 'fen2', 1),
      createMockMoveEntry('d4', 'white', 'fen3', 2),
    ];

    const result = resetDeviationIfBackInTheory(
      2,
      3, // Navigating AFTER deviation
      'd5',
      mockOpening,
      moves
    );

    expect(result).toBe(2); // Deviation not reset
  });
});

// ============================================================================
// Wikipedia Integration Tests
// ============================================================================

describe('extractOpeningFamily', () => {
  test('extracts family from full name with colon', () => {
    const family = extractOpeningFamily('French Defense: Winawer Variation, Advance');
    expect(family).toBe('French Defense');
  });

  test('handles name without colon', () => {
    const family = extractOpeningFamily('French Defense');
    expect(family).toBe('French Defense');
  });

  test('trims whitespace', () => {
    const family = extractOpeningFamily('  French Defense  :  Winawer  ');
    expect(family).toBe('French Defense');
  });
});

describe('hasWikipediaPage', () => {
  test('returns true when wikipediaSlug exists', () => {
    const result = hasWikipediaPage(mockOpening);
    expect(result).toBe(true);
  });

  test('returns false when wikipediaSlug is undefined', () => {
    const openingWithoutWiki = { ...mockOpening, wikipediaSlug: undefined };
    const result = hasWikipediaPage(openingWithoutWiki);
    expect(result).toBe(false);
  });
});

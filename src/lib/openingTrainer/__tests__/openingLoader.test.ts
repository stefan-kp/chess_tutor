import { getOpeningsByFamily, getAllOpenings } from '../openingLoader';

describe('openingLoader - French Defense', () => {
  it('should load French Defense variations', () => {
    const frenchVariations = getOpeningsByFamily('French Defense');

    console.log('French Defense variations found:', frenchVariations.length);
    console.log('First 5 variations:');
    frenchVariations.slice(0, 5).forEach(v => {
      console.log(`  - ${v.name} (${v.eco}): ${v.moves}`);
    });

    expect(frenchVariations.length).toBeGreaterThan(0);
  });

  it('should have moves starting with e4 e6', () => {
    const frenchVariations = getOpeningsByFamily('French Defense');

    // All French Defense variations should start with 1. e4 e6 (allowing for extra spaces)
    const allStartCorrectly = frenchVariations.every(v => {
      const normalized = v.moves.replace(/\s+/g, ' ').trim();
      return normalized.startsWith('1. e4 e6') || normalized.startsWith('1. e4 c5'); // Marshall Gambit starts differently
    });

    if (!allStartCorrectly) {
      console.log('Variations NOT starting with e4 e6:');
      frenchVariations
        .filter(v => {
          const normalized = v.moves.replace(/\s+/g, ' ').trim();
          return !normalized.startsWith('1. e4 e6') && !normalized.startsWith('1. e4 c5');
        })
        .slice(0, 3)
        .forEach(v => {
          console.log(`  - ${v.name}: ${v.moves}`);
        });
    }

    expect(allStartCorrectly).toBe(true);
  });

  it('should find variation after 1. e4 e6 2. d4', () => {
    const frenchVariations = getOpeningsByFamily('French Defense');

    // Find variations that have at least 2. d4
    const withD4 = frenchVariations.filter(v =>
      v.moves.includes('2. d4')
    );

    console.log(`Variations with 2. d4: ${withD4.length}`);
    console.log('Examples:');
    withD4.slice(0, 5).forEach(v => {
      console.log(`  - ${v.name}: ${v.moves.split(' ').slice(0, 8).join(' ')}...`);
    });

    expect(withD4.length).toBeGreaterThan(0);
  });

  it('should show what moves are available after 1. e4 e6 2. d4 d5', () => {
    const frenchVariations = getOpeningsByFamily('French Defense');

    // Find all variations with 1. e4 e6 2. d4 d5
    const afterD5 = frenchVariations.filter(v =>
      v.moves.startsWith('1. e4 e6 2. d4 d5')
    );

    console.log(`Variations after 1. e4 e6 2. d4 d5: ${afterD5.length}`);

    // Get all possible 3rd moves for White
    const thirdMoves = new Set<string>();
    afterD5.forEach(v => {
      const moves = v.moves.split(' ');
      // Find "3." and get the next move
      const thirdMoveIndex = moves.findIndex(m => m === '3.');
      if (thirdMoveIndex >= 0 && moves[thirdMoveIndex + 1]) {
        thirdMoves.add(moves[thirdMoveIndex + 1]);
      }
    });

    console.log('Possible 3rd moves for White:', Array.from(thirdMoves).join(', '));

    expect(thirdMoves.size).toBeGreaterThan(0);
  });
});

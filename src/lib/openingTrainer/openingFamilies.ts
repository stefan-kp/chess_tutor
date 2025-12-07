import { OpeningMetadata } from '@/lib/openings';

/**
 * Utilities for grouping openings into families (e.g., "Italian Game", "Sicilian Defense")
 */

export interface OpeningFamily {
  name: string;
  ecoRange: string; // e.g., "C50-C59"
  variationCount: number;
  variations: OpeningMetadata[];
  totalMoves: number; // Sum of moves across all variations
  popularity: number; // Derived from ECO codes
}

/**
 * Extract the family name from an opening name
 * Examples:
 *   "Italian Game: Classical Variation" -> "Italian Game"
 *   "Sicilian Defense, Najdorf Variation" -> "Sicilian Defense"
 *   "Queen's Gambit Declined" -> "Queen's Gambit"
 */
export function extractFamilyName(openingName: string): string {
  // Split by common delimiters
  const separators = [':', ',', '–', '—', ' - '];

  for (const sep of separators) {
    if (openingName.includes(sep)) {
      return openingName.split(sep)[0].trim();
    }
  }

  // If no separator, check for common patterns
  // "Queen's Gambit Declined" -> "Queen's Gambit"
  if (openingName.includes('Declined') || openingName.includes('Accepted')) {
    return openingName.replace(/\s+(Declined|Accepted).*$/, '').trim();
  }

  // Default: return the full name (it's probably already a family name)
  return openingName;
}

/**
 * Count moves in an opening
 */
function countMoves(movesString: string): number {
  if (!movesString) return 0;
  const moves = movesString.split(' ').filter(m => !m.match(/^\d+\.$/));
  return moves.length;
}

/**
 * Determine popularity score for sorting
 */
function getPopularityScore(ecoCode: string): number {
  // Very popular openings (most common in practice)
  const veryPopular = [
    'C50', 'C55', 'C60', 'C65', 'C80', 'C90', // Italian, Spanish
    'D00', 'D06', 'D30', 'D35', 'D37', // Queen's Gambit
    'E00', 'E20', 'E60', 'E90', // Indian Defenses
    'B10', 'B12', 'B20', 'B30', 'B33', 'B40', 'B50', 'B90', // Sicilian, Caro-Kann
  ];
  if (veryPopular.some(code => ecoCode.startsWith(code))) return 3;

  // Popular openings
  const popular = [
    'A00', 'A04', 'A10', 'A40', 'A45', // English, other flank
    'C00', 'C01', 'C02', 'C10', 'C15', 'C20', 'C30', 'C40', // French, misc 1.e4
    'D10', 'D20', 'D40', 'D50', 'D60', 'D70', 'D80', // Other Queen's pawn
    'E10', 'E30', 'E40', 'E50', 'E70', // Indian variations
    'B00', 'B01', 'B02', // Other semi-open
  ];
  if (popular.some(code => ecoCode.startsWith(code))) return 2;

  return 1;
}

/**
 * Group openings by family name
 */
export function groupOpeningsByFamily(openings: OpeningMetadata[]): OpeningFamily[] {
  // Filter out single-move openings first
  const validOpenings = openings.filter(opening => countMoves(opening.moves) > 1);

  // Group by family name
  const familyMap = new Map<string, OpeningMetadata[]>();

  validOpenings.forEach(opening => {
    const familyName = extractFamilyName(opening.name);

    if (!familyMap.has(familyName)) {
      familyMap.set(familyName, []);
    }
    familyMap.get(familyName)!.push(opening);
  });

  // Convert to OpeningFamily objects
  const families: OpeningFamily[] = [];

  familyMap.forEach((variations, familyName) => {
    // Calculate ECO range
    const ecoCodes = variations.map(v => v.eco).sort();
    const ecoRange = ecoCodes.length === 1
      ? ecoCodes[0]
      : `${ecoCodes[0]}-${ecoCodes[ecoCodes.length - 1]}`;

    // Calculate total moves and average popularity
    const totalMoves = variations.reduce((sum, v) => sum + countMoves(v.moves), 0);
    const avgPopularity = variations.reduce((sum, v) => sum + getPopularityScore(v.eco), 0) / variations.length;

    families.push({
      name: familyName,
      ecoRange,
      variationCount: variations.length,
      variations,
      totalMoves,
      popularity: avgPopularity,
    });
  });

  // Sort by popularity (desc), then variation count (desc), then name
  families.sort((a, b) => {
    if (a.popularity !== b.popularity) {
      return b.popularity - a.popularity;
    }
    if (a.variationCount !== b.variationCount) {
      return b.variationCount - a.variationCount;
    }
    return a.name.localeCompare(b.name);
  });

  return families;
}

/**
 * Get all variations for a specific family
 */
export function getVariationsByFamily(
  openings: OpeningMetadata[],
  familyName: string
): OpeningMetadata[] {
  return openings.filter(opening => {
    const extractedFamily = extractFamilyName(opening.name);
    return extractedFamily === familyName && countMoves(opening.moves) > 1;
  }).sort((a, b) => {
    // Sort variations by move count (desc) within family
    const movesA = countMoves(a.moves);
    const movesB = countMoves(b.moves);
    if (movesA !== movesB) {
      return movesB - movesA;
    }
    return a.eco.localeCompare(b.eco);
  });
}

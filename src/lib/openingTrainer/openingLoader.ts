import { OpeningMetadata } from '@/lib/openings';
import ecoA from '../../../public/openings/ecoA.json';
import ecoB from '../../../public/openings/ecoB.json';
import ecoC from '../../../public/openings/ecoC.json';
import ecoD from '../../../public/openings/ecoD.json';
import ecoE from '../../../public/openings/ecoE.json';

/**
 * Centralized opening data loader to avoid duplicate imports
 */

// Merge all ECO databases (keyed by FEN)
const ALL_OPENINGS_BY_FEN = {
  ...ecoA,
  ...ecoB,
  ...ecoC,
  ...ecoD,
  ...ecoE,
} as Record<string, OpeningMetadata>;

// Convert to array for listing
const OPENINGS_ARRAY = Object.values(ALL_OPENINGS_BY_FEN);

// Create ECO-indexed lookup for fast access (only root openings)
const OPENINGS_BY_ECO: Record<string, OpeningMetadata> = {};
OPENINGS_ARRAY.forEach((opening) => {
  if (opening.eco && opening.isEcoRoot === true) {
    OPENINGS_BY_ECO[opening.eco] = opening;
  }
});

/**
 * Get all openings as an array
 */
export function getAllOpenings(): OpeningMetadata[] {
  return OPENINGS_ARRAY;
}

/**
 * Get all ECO root openings (for the selector)
 */
export function getEcoRootOpenings(): OpeningMetadata[] {
  return OPENINGS_ARRAY.filter((opening) => opening.isEcoRoot === true);
}

/**
 * Get a specific opening by ECO code
 * Prefers variations with more moves for better training experience
 */
export function getOpeningByEco(eco: string): OpeningMetadata | null {
  const rootOpening = OPENINGS_BY_ECO[eco];
  if (!rootOpening) return null;

  // Find all openings with this ECO code
  const allVariations = OPENINGS_ARRAY.filter((opening) => opening.eco === eco);

  // Count moves in each variation
  const variationsWithMoves = allVariations.map((opening) => ({
    opening,
    moveCount: opening.moves ? opening.moves.split(' ').filter(m => !m.match(/^\d+\.$/)).length : 0,
  }));

  // Sort by move count descending (prefer variations with more moves)
  variationsWithMoves.sort((a, b) => b.moveCount - a.moveCount);

  // Return the variation with the most moves (better for training)
  // But require at least 2 moves (user move + opponent response)
  const bestVariation = variationsWithMoves.find((v) => v.moveCount >= 2);

  return bestVariation ? bestVariation.opening : rootOpening;
}

/**
 * Get all openings as a record keyed by FEN (for backwards compatibility)
 */
export function getAllOpeningsByFen(): Record<string, OpeningMetadata> {
  return ALL_OPENINGS_BY_FEN;
}

/**
 * Get all openings as a record keyed by ECO code
 */
export function getAllOpeningsByEco(): Record<string, OpeningMetadata> {
  return OPENINGS_BY_ECO;
}

/**
 * Extract the family name from an opening name
 */
function extractFamilyName(openingName: string): string {
  const separators = [':', ',', '–', '—', ' - '];
  for (const sep of separators) {
    if (openingName.includes(sep)) {
      return openingName.split(sep)[0].trim();
    }
  }
  // Handle "Queen's Gambit Declined" -> "Queen's Gambit"
  if (openingName.includes('Declined') || openingName.includes('Accepted')) {
    return openingName.replace(/\s+(Declined|Accepted).*$/, '').trim();
  }
  return openingName;
}

/**
 * Count moves in an opening's move string
 */
function countMoves(movesString: string): number {
  if (!movesString) return 0;
  return movesString.split(' ').filter(m => !m.match(/^\d+\.$/)).length;
}

/**
 * Get all openings belonging to a specific family
 * Returns variations sorted by move count (most moves first)
 */
export function getOpeningsByFamily(familyName: string): OpeningMetadata[] {
  return OPENINGS_ARRAY
    .filter((opening) => {
      const family = extractFamilyName(opening.name);
      return family === familyName && countMoves(opening.moves) > 1;
    })
    .sort((a, b) => {
      // Sort by move count descending (more moves = deeper line)
      const movesA = countMoves(a.moves);
      const movesB = countMoves(b.moves);
      if (movesA !== movesB) return movesB - movesA;
      return a.eco.localeCompare(b.eco);
    });
}

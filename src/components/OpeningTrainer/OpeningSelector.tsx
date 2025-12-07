'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { OpeningMetadata } from '@/lib/openings';
import { loadSession } from '@/lib/openingTrainer/sessionManager';

interface OpeningSelectorProps {
  openings: OpeningMetadata[];
  selectedFamily?: string;
  onBackToFamilies?: () => void;
}

  // Helper function to count moves in an opening
  const countMoves = (movesString: string): number => {
    if (!movesString) return 0;
    // Filter out move numbers (e.g., "1.", "2.") and count actual moves
    const moves = movesString.split(' ').filter(m => !m.match(/^\d+\.$/));
    return moves.length;
  };

  // Helper function to extract variation name (after family prefix)
  const getVariationName = (fullName: string, familyName?: string): string => {
    if (!familyName) return fullName;

    // Remove family prefix and common delimiters
    const separators = [':', ',', '–', '—', ' - '];
    for (const sep of separators) {
      if (fullName.includes(sep)) {
        const parts = fullName.split(sep);
        if (parts.length > 1) {
          return parts.slice(1).join(sep).trim();
        }
      }
    }

    // If no separator found, return full name
    return fullName;
  };

  // Helper function to determine opening popularity for sorting
  const getPopularityScore = (eco: string): number => {
    // Very popular openings (most common in practice)
    const veryPopular = ['C50', 'C55', 'C60', 'C65', 'C80', 'C90', 'D00', 'D06', 'D30', 'D35', 'D37', 'E00', 'E20', 'E60', 'E90', 'B10', 'B12', 'B20', 'B30', 'B33', 'B40', 'B50', 'B90'];
    if (veryPopular.some(code => eco.startsWith(code))) return 3;

    // Popular openings
    const popular = ['A00', 'A04', 'A10', 'A40', 'A45', 'C00', 'C01', 'C02', 'C10', 'C15', 'C20', 'C30', 'C40', 'D10', 'D20', 'D40', 'D50', 'D60', 'D70', 'D80', 'E10', 'E30', 'E40', 'E50', 'E70', 'B00', 'B01', 'B02'];
    if (popular.some(code => eco.startsWith(code))) return 2;

    // Less common
    return 1;
  };

export default function OpeningSelector({ openings, selectedFamily, onBackToFamilies }: OpeningSelectorProps) {
  const [colorFilter, setColorFilter] = useState<'all' | 'white' | 'black'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Helper to extract family name from opening name
  const extractFamilyName = (openingName: string): string => {
    const separators = [':', ',', '–', '—', ' - '];
    for (const sep of separators) {
      if (openingName.includes(sep)) {
        return openingName.split(sep)[0].trim();
      }
    }
    return openingName;
  };

  // Filter openings based on color, search query, family, and move count
  const filteredOpenings = useMemo(() => {
    return openings.filter((opening) => {
      // Filter out openings with only 1 move (not useful for training)
      const moveCount = countMoves(opening.moves);
      if (moveCount <= 1) {
        return false;
      }

      // Family filter (if a family is selected)
      if (selectedFamily) {
        const family = extractFamilyName(opening.name);
        if (family !== selectedFamily) {
          return false;
        }
      }

      // Color filter (based on ECO code patterns)
      // A00-A99, B00-B99, C00-C99 are generally White openings
      // D00-D99, E00-E99 are generally Black defenses
      if (colorFilter !== 'all') {
        const ecoLetter = opening.eco[0];
        if (colorFilter === 'white' && !['A', 'B', 'C'].includes(ecoLetter)) {
          return false;
        }
        if (colorFilter === 'black' && !['D', 'E'].includes(ecoLetter)) {
          return false;
        }
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          opening.name.toLowerCase().includes(query) ||
          opening.eco.toLowerCase().includes(query)
        );
      }

      return true;
    }).sort((a, b) => {
      // Sort by move count (descending) when family is selected, otherwise by popularity
      if (selectedFamily) {
        const movesA = countMoves(a.moves);
        const movesB = countMoves(b.moves);
        if (movesA !== movesB) {
          return movesB - movesA; // More moves first
        }
      } else {
        const scoreA = getPopularityScore(a.eco);
        const scoreB = getPopularityScore(b.eco);
        if (scoreA !== scoreB) {
          return scoreB - scoreA; // Higher score first
        }
      }
      return a.eco.localeCompare(b.eco); // Alphabetical by ECO
    });
  }, [openings, colorFilter, searchQuery, selectedFamily]);

  // Group openings by ECO family (first letter)
  const groupedOpenings = useMemo(() => {
    const groups: Record<string, OpeningMetadata[]> = {
      A: [],
      B: [],
      C: [],
      D: [],
      E: [],
    };

    filteredOpenings.forEach((opening) => {
      const family = opening.eco[0];
      if (groups[family]) {
        groups[family].push(opening);
      }
    });

    return groups;
  }, [filteredOpenings]);

  // Check if an opening has an active session
  const hasActiveSession = (eco: string): boolean => {
    return loadSession(eco) !== null;
  };

  return (
    <div className="space-y-6">
      {/* Back button and header (when family is selected) */}
      {selectedFamily && onBackToFamilies && (
        <div className="flex items-center gap-4">
          <button
            onClick={onBackToFamilies}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
          >
            ← Back to Families
          </button>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {selectedFamily} - Select Variation
          </h2>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Color filter */}
        <div className="flex gap-2">
          <button
            onClick={() => setColorFilter('all')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              colorFilter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            All Openings
          </button>
          <button
            onClick={() => setColorFilter('white')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              colorFilter === 'white'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            White
          </button>
          <button
            onClick={() => setColorFilter('black')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              colorFilter === 'black'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Black
          </button>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search openings..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Results count */}
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Showing {filteredOpenings.length} opening{filteredOpenings.length !== 1 ? 's' : ''}
      </p>

      {/* Grouped openings */}
      {Object.entries(groupedOpenings).map(([family, familyOpenings]) => {
        if (familyOpenings.length === 0) return null;

        return (
          <div key={family} className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              ECO {family} ({familyOpenings.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {familyOpenings.map((opening) => {
                const hasSession = hasActiveSession(opening.eco);
                const moveCount = countMoves(opening.moves);

                return (
                  <Link
                    key={opening.eco}
                    href={`/learning/openings/${opening.eco}`}
                    data-opening-eco={opening.eco}
                    data-testid={`opening-card-${opening.eco}`}
                    className="block p-4 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-md transition-all"
                    aria-label={`Select ${opening.name} opening`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {selectedFamily ? getVariationName(opening.name, selectedFamily) : opening.name}
                      </h4>
                      <div className="flex gap-2">
                        {hasSession && (
                          <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 px-2 py-1 rounded">
                            In Progress
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-sm text-gray-600 dark:text-gray-400">{opening.eco}</p>
                      <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 px-2 py-1 rounded font-medium">
                        {moveCount} move{moveCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-500 font-mono truncate">
                      {opening.moves.substring(0, 30)}
                      {opening.moves.length > 30 ? '...' : ''}
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}

      {filteredOpenings.length === 0 && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          No openings found matching your filters.
        </div>
      )}
    </div>
  );
}

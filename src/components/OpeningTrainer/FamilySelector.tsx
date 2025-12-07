'use client';

import { useMemo } from 'react';
import { OpeningFamily } from '@/lib/openingTrainer/openingFamilies';

interface FamilySelectorProps {
  families: OpeningFamily[];
  onSelectFamily: (familyName: string) => void;
}

export default function FamilySelector({ families, onSelectFamily }: FamilySelectorProps) {
  // Group families by ECO range for display
  const groupedFamilies = useMemo(() => {
    const groups: Record<string, OpeningFamily[]> = {
      'White Openings (1.e4)': [],
      'White Openings (1.d4)': [],
      'Black Defenses vs 1.e4': [],
      'Black Defenses vs 1.d4': [],
      'Other Openings': [],
    };

    families.forEach(family => {
      const firstEco = family.ecoRange[0];

      if (firstEco === 'C') {
        groups['White Openings (1.e4)'].push(family);
      } else if (firstEco === 'D') {
        groups['White Openings (1.d4)'].push(family);
      } else if (firstEco === 'B') {
        groups['Black Defenses vs 1.e4'].push(family);
      } else if (firstEco === 'E') {
        groups['Black Defenses vs 1.d4'].push(family);
      } else {
        groups['Other Openings'].push(family);
      }
    });

    return groups;
  }, [families]);

  return (
    <div className="space-y-8">
      {Object.entries(groupedFamilies).map(([category, categoryFamilies]) => {
        if (categoryFamilies.length === 0) return null;

        return (
          <div key={category} className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {category} ({categoryFamilies.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoryFamilies.map((family) => (
                <button
                  key={family.name}
                  onClick={() => onSelectFamily(family.name)}
                  className="block p-6 border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-lg transition-all text-left"
                  aria-label={`Select ${family.name} opening family`}
                >
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-3">
                    {family.name}
                  </h3>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Variations:</span>
                      <span className="font-semibold text-blue-600 dark:text-blue-400">
                        {family.variationCount}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">ECO Range:</span>
                      <span className="font-mono text-xs text-gray-700 dark:text-gray-300">
                        {family.ecoRange}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Total Moves:</span>
                      <span className="font-semibold text-gray-700 dark:text-gray-300">
                        {family.totalMoves}
                      </span>
                    </div>
                  </div>

                  {/* Popularity indicator */}
                  {family.popularity >= 2.5 && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <span className="inline-flex items-center text-xs font-medium text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded">
                        ⭐ Popular
                      </span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

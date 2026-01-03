'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Header from '@/components/Header';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { SupportedLanguage } from '@/lib/i18n/translations';
import { OpeningMetadata } from '@/lib/openings';
import { OpeningTrainingProvider } from '@/contexts/OpeningTrainingContext';
import OpeningTrainer from '@/components/OpeningTrainer/OpeningTrainer';
import { OpeningTrainerErrorBoundary } from '@/components/OpeningTrainer/ErrorBoundary';
import { getOpeningsByFamily } from '@/lib/openingTrainer/openingLoader';
import { buildVariationTree, VariationTree } from '@/lib/openingTrainer/gameLogic';
import { Personality, PERSONALITIES } from '@/lib/personalities';

/**
 * Family Training Page
 *
 * This page enables training on an entire opening family (e.g., "Italian Game")
 * instead of a single specific variation. Users can play any moves that exist
 * in any variation, and the tutor will guide them through the repertoire.
 */
export default function FamilyTrainingPage() {
  const params = useParams();
  const router = useRouter();
  const familyName = decodeURIComponent(params.familyName as string);

  const [language, setLanguage] = useState<SupportedLanguage>('en');
  const [mounted, setMounted] = useState(false);
  const [variations, setVariations] = useState<OpeningMetadata[]>([]);
  const [variationTree, setVariationTree] = useState<VariationTree | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPersonality, setSelectedPersonality] = useState<Personality>(PERSONALITIES[0]);
  const [apiKey, setApiKey] = useState<string>('');

  useEffect(() => {
    const storedLang = localStorage.getItem('chess_tutor_language');
    if (storedLang) setLanguage(storedLang as SupportedLanguage);

    // Load API key
    const storedApiKey = localStorage.getItem('gemini_api_key');
    if (storedApiKey) setApiKey(storedApiKey);

    // Load personality
    const storedPersonalityId = localStorage.getItem('chess_tutor_personality');
    if (storedPersonalityId) {
      const personality = PERSONALITIES.find(p => p.id === storedPersonalityId);
      if (personality) setSelectedPersonality(personality);
    }

    setMounted(true);
  }, []);

  const t = useTranslation(language);

  useEffect(() => {
    if (mounted) {
      loadFamilyVariations();
    }
  }, [familyName, mounted]);

  const loadFamilyVariations = () => {
    setIsLoading(true);

    // Get all variations for this family
    const familyVariations = getOpeningsByFamily(familyName);

    if (familyVariations.length === 0) {
      // No variations found - redirect back to selection
      router.push('/learning/openings');
      return;
    }

    setVariations(familyVariations);

    // Build the variation tree for efficient lookup
    const tree = buildVariationTree(familyVariations, familyName);
    setVariationTree(tree);

    setIsLoading(false);
  };

  // Create a "representative" opening for the family
  // Uses the first ECO code and combines info from all variations
  const familyOpening: OpeningMetadata | null = useMemo(() => {
    if (variations.length === 0) return null;

    // Get all unique ECO codes
    const ecoCodes = [...new Set(variations.map((v: OpeningMetadata) => v.eco))].sort();
    const ecoRange = ecoCodes.length === 1
      ? ecoCodes[0]
      : `${ecoCodes[0]}-${ecoCodes[ecoCodes.length - 1]}`;

    // Find the variation with the most moves (for the initial repertoire display)
    const longestVariation = variations[0]; // Already sorted by move count

    // Create a combined opening metadata
    return {
      eco: longestVariation.eco,
      name: familyName,
      moves: longestVariation.moves, // Use longest for display, but tree handles all
      src: 'family',
      isEcoRoot: true,
      wikipediaSlug: longestVariation.wikipediaSlug,
    };
  }, [variations, familyName]);

  if (!mounted) return null;

  if (isLoading) {
    return (
      <>
        <Header language={language} />
        <div className="flex-grow bg-gray-100 dark:bg-gray-900 p-4 flex flex-col">
          <div className="max-w-6xl mx-auto w-full">
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center space-y-4">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-gray-600 dark:text-gray-400">{t.learning.openingTrainer.loadingSession}</p>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!familyOpening || !variationTree) {
    return (
      <>
        <Header language={language} />
        <div className="flex-grow bg-gray-100 dark:bg-gray-900 p-4 flex flex-col">
          <div className="max-w-6xl mx-auto w-full">
            <div className="text-center py-12">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                {t.learning.openingTrainer.openingNotFound}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                No variations found for &quot;{familyName}&quot;
              </p>
              <button
                onClick={() => router.push('/learning/openings')}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {t.learning.openingTrainer.backToOpeningSelection}
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header language={language} />
      <div className="flex-grow bg-gray-100 dark:bg-gray-900 p-4 flex flex-col">
        <div className="max-w-6xl mx-auto w-full">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <button
              onClick={() => router.push('/learning/openings')}
              className="p-2 md:px-4 md:py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 text-sm font-medium transition-colors flex items-center gap-2"
            >
              <ArrowLeft size={20} />
              <span className="hidden md:inline">{t.learning.openingTrainer.backToOpeningSelection}</span>
            </button>
          </div>

          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{familyName}</h1>
            <p className="text-gray-600 dark:text-gray-400">
              {variations.length} variation{variations.length !== 1 ? 's' : ''} available
            </p>
          </div>

          <OpeningTrainerErrorBoundary>
            <OpeningTrainingProvider>
              <OpeningTrainer
                opening={familyOpening}
                personality={selectedPersonality}
                apiKey={apiKey}
                language={language}
                variationTree={variationTree}
                allVariations={variations}
              />
            </OpeningTrainingProvider>
          </OpeningTrainerErrorBoundary>
        </div>
      </div>
    </>
  );
}

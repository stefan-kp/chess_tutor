'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Header from '@/components/Header';
import OpeningSelector from '@/components/OpeningTrainer/OpeningSelector';
import FamilySelector from '@/components/OpeningTrainer/FamilySelector';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { SupportedLanguage } from '@/lib/i18n/translations';
import { getEcoRootOpenings } from '@/lib/openingTrainer/openingLoader';
import { groupOpeningsByFamily } from '@/lib/openingTrainer/openingFamilies';

export default function OpeningsPage() {
  const router = useRouter();
  const [language, setLanguage] = useState<SupportedLanguage>('en');
  const [mounted, setMounted] = useState(false);
  const [selectedFamily, setSelectedFamily] = useState<string | null>(null);

  useEffect(() => {
    const storedLang = localStorage.getItem('chess_tutor_language');
    if (storedLang) setLanguage(storedLang as SupportedLanguage);
    setMounted(true);
  }, []);

  const t = useTranslation(language);

  // Get ECO root openings for display
  const allOpenings = useMemo(() => {
    return getEcoRootOpenings();
  }, []);

  // Group openings by family
  const openingFamilies = useMemo(() => {
    return groupOpeningsByFamily(allOpenings);
  }, [allOpenings]);

  const handleSelectFamily = (familyName: string) => {
    setSelectedFamily(familyName);
  };

  const handleBackToFamilies = () => {
    setSelectedFamily(null);
  };

  if (!mounted) return null;

  return (
    <>
      <Header language={language} />
      <div className="flex-grow bg-gray-100 dark:bg-gray-900 p-4 flex flex-col">
        <div className="max-w-6xl mx-auto w-full">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <button
              onClick={() => router.push('/learning')}
              className="p-2 md:px-4 md:py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 text-sm font-medium transition-colors flex items-center gap-2"
            >
              <ArrowLeft size={20} />
              <span className="hidden md:inline">{t.learning.backToMenu}</span>
            </button>
          </div>

          {!selectedFamily ? (
            <>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Opening Training
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mb-8">
                Select an opening family to explore. Each family contains multiple variations
                with engine-backed feedback and AI-powered explanations.
              </p>

              <FamilySelector
                families={openingFamilies}
                onSelectFamily={handleSelectFamily}
              />
            </>
          ) : (
            <OpeningSelector
              openings={allOpenings}
              selectedFamily={selectedFamily}
              onBackToFamilies={handleBackToFamilies}
            />
          )}
        </div>
      </div>
    </>
  );
}

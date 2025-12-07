'use client';

import { useState, useEffect } from 'react';
import { WikipediaSummary as WikipediaSummaryType } from '@/types/openingTraining';
import { getWikipediaSummary } from '@/lib/openingTrainer/wikipediaService';

interface WikipediaSummaryProps {
  openingName: string;
  wikipediaSlug?: string; // Preferred: direct slug from database
}

export default function WikipediaSummary({ openingName, wikipediaSlug }: WikipediaSummaryProps) {
  const [summary, setSummary] = useState<WikipediaSummaryType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSummary();
  }, [openingName, wikipediaSlug]);

  const fetchSummary = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Use slug if provided, otherwise fall back to name lookup
      const data = await getWikipediaSummary(openingName, wikipediaSlug);

      if (!data) {
        setError('No Wikipedia article found for this opening');
        setSummary(null);
        return;
      }

      setSummary(data);
    } catch (err) {
      setError('Failed to load opening background information');
      setSummary(null);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 border-2 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-blue-800 dark:text-blue-300">Loading opening background...</p>
        </div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          No background information available for this opening.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-3">
      <div className="flex justify-between items-start">
        <h3 className="font-semibold text-blue-900 dark:text-blue-300">{summary.title}</h3>
        <a
          href={summary.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          Wikipedia ↗
        </a>
      </div>
      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{summary.extract}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Source: Wikipedia (cached {new Date(summary.fetchedAt).toLocaleDateString()})
      </p>
    </div>
  );
}

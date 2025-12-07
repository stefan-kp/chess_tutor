import { WikipediaSummary } from '@/types/openingTraining';

const WIKI_CACHE_KEY_PREFIX = 'wiki_summary_';

/**
 * Fetches Wikipedia summary for an opening
 * Priority: 1. Direct slug from database, 2. Local cache by name, 3. localStorage cache, 4. API
 */
export async function getWikipediaSummary(
  openingName: string,
  wikipediaSlug?: string
): Promise<WikipediaSummary | null> {
  try {
    // If we have a slug from the database, use it directly (most reliable)
    if (wikipediaSlug) {
      const slugCached = await getLocalWikipediaCacheBySlug(wikipediaSlug);
      if (slugCached) {
        console.log('[Wikipedia] Using local cache (direct slug):', wikipediaSlug);
        return slugCached;
      }
    }

    // Try local cached Wikipedia files by name
    const localCached = await getLocalWikipediaCache(openingName);
    if (localCached) {
      console.log('[Wikipedia] Using local cache (by name):', openingName);
      return localCached;
    }

    // Check localStorage cache
    const cached = getCachedSummary(openingName);
    if (cached && !isCacheExpired(cached)) {
      console.log('[Wikipedia] Using localStorage cache for:', openingName);
      return cached;
    }

    // Cache miss - fetch from API
    console.log('[Wikipedia] Fetching from API for:', openingName);
    const response = await fetch(
      `/api/v1/wikipedia/summary?opening=${encodeURIComponent(openingName)}`
    );

    if (!response.ok) {
      // Remove stale cache entry on 404
      if (response.status === 404) {
        removeCachedSummary(openingName);
      }
      return null;
    }

    const summary: WikipediaSummary = await response.json();

    // Cache the fresh result
    cacheSummary(openingName, summary);

    return summary;
  } catch (error) {
    console.error('Wikipedia service error:', error);
    return null;
  }
}

/**
 * Load Wikipedia content from local cache by slug (most reliable)
 */
async function getLocalWikipediaCacheBySlug(
  slug: string
): Promise<WikipediaSummary | null> {
  try {
    const cacheUrl = `/wikipedia/${slug}.json`;

    const response = await fetch(cacheUrl);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    // Convert local cache format to WikipediaSummary format
    const extract = data.sections
      .map((s: any) => {
        if (s.title === 'Introduction') {
          return s.text;
        }
        return `${s.title}\n\n${s.text}`;
      })
      .join('\n\n');

    return {
      openingName: data.openingFamily,
      title: data.title.replace(/<[^>]*>/g, ''), // Strip HTML tags
      extract: extract.substring(0, 2000), // Limit size for UI
      url: data.url,
      fetchedAt: data.fetchedAt,
      expiresAt: data.fetchedAt + 365 * 24 * 60 * 60 * 1000, // 1 year for local cache
    };
  } catch (error) {
    // File not found or error reading - not a problem, fallback to other methods
    return null;
  }
}

/**
 * Try to load Wikipedia content from local cached files by name (fallback)
 */
async function getLocalWikipediaCache(
  openingName: string
): Promise<WikipediaSummary | null> {
  // Convert opening name to slug
  const slug = openingName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return await getLocalWikipediaCacheBySlug(slug);
}

/**
 * Retrieves cached Wikipedia summary from localStorage
 */
function getCachedSummary(openingName: string): WikipediaSummary | null {
  try {
    const key = getCacheKey(openingName);
    const cached = localStorage.getItem(key);

    if (!cached) {
      return null;
    }

    return JSON.parse(cached) as WikipediaSummary;
  } catch (error) {
    console.error('Error reading Wikipedia cache:', error);
    return null;
  }
}

/**
 * Stores Wikipedia summary in localStorage cache
 */
function cacheSummary(openingName: string, summary: WikipediaSummary): void {
  try {
    const key = getCacheKey(openingName);
    localStorage.setItem(key, JSON.stringify(summary));
  } catch (error) {
    console.error('Error caching Wikipedia summary:', error);
    // Cache failure should not break the feature
  }
}

/**
 * Removes cached Wikipedia summary from localStorage
 */
function removeCachedSummary(openingName: string): void {
  try {
    const key = getCacheKey(openingName);
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Error removing Wikipedia cache:', error);
  }
}

/**
 * Checks if cached summary has expired (30 days)
 */
function isCacheExpired(summary: WikipediaSummary): boolean {
  const now = Date.now();
  return now > summary.expiresAt;
}

/**
 * Generates cache key for opening name
 */
function getCacheKey(openingName: string): string {
  return `${WIKI_CACHE_KEY_PREFIX}${openingName.toLowerCase().replace(/\s+/g, '_')}`;
}

/**
 * Cleans up all expired Wikipedia cache entries
 * Should be called periodically (e.g., on app load)
 */
export function cleanupExpiredWikipediaCache(): void {
  try {
    const keys = Object.keys(localStorage);
    const wikiKeys = keys.filter((key) => key.startsWith(WIKI_CACHE_KEY_PREFIX));

    wikiKeys.forEach((key) => {
      try {
        const cached = localStorage.getItem(key);
        if (cached) {
          const summary: WikipediaSummary = JSON.parse(cached);
          if (isCacheExpired(summary)) {
            localStorage.removeItem(key);
          }
        }
      } catch (error) {
        // Remove corrupted cache entries
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.error('Error cleaning up Wikipedia cache:', error);
  }
}

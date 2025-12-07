import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * Wikipedia Summary API Endpoint
 * Fetches Wikipedia article summaries for chess openings
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const openingName = searchParams.get('opening');

  if (!openingName) {
    return NextResponse.json(
      { error: 'Missing opening parameter' },
      { status: 400 }
    );
  }

  try {
    console.log('[Wikipedia API] Searching for:', openingName);

    // Step 1: Use Wikipedia Search API to find the best matching article
    // This handles partial matches, redirects, and disambiguations
    const searchUrl = new URL('https://en.wikipedia.org/w/api.php');
    searchUrl.searchParams.set('action', 'opensearch');
    searchUrl.searchParams.set('search', openingName);
    searchUrl.searchParams.set('limit', '5'); // Get top 5 results
    searchUrl.searchParams.set('namespace', '0'); // Main articles only
    searchUrl.searchParams.set('format', 'json');

    const searchResponse = await fetch(searchUrl.toString(), {
      headers: {
        'User-Agent': 'ChessTutorApp/1.0 (Educational chess training app)',
      },
    });

    if (!searchResponse.ok) {
      console.error('[Wikipedia API] Search failed:', searchResponse.status);
      return NextResponse.json(
        {
          error: 'Wikipedia search failed',
          fallback: 'No background information available for this opening.',
        },
        { status: 404 }
      );
    }

    const searchData = await searchResponse.json();
    // OpenSearch returns: [query, [titles], [descriptions], [urls]]
    const titles = searchData[1] as string[];
    const descriptions = searchData[2] as string[];

    if (!titles || titles.length === 0) {
      console.log('[Wikipedia API] No results found for:', openingName);
      return NextResponse.json(
        {
          error: 'Wikipedia article not found',
          fallback: 'No background information available for this opening.',
        },
        { status: 404 }
      );
    }

    // Find best match (prioritize chess-related articles)
    let bestMatch = titles[0]; // Default to first result
    for (let i = 0; i < titles.length; i++) {
      const title = titles[i];
      const description = descriptions[i] || '';

      // Prioritize results with chess-related keywords
      if (
        description.toLowerCase().includes('chess') ||
        description.toLowerCase().includes('opening') ||
        title.toLowerCase().includes('chess')
      ) {
        bestMatch = title;
        break;
      }
    }

    console.log('[Wikipedia API] Best match:', bestMatch, 'from', titles.length, 'results');

    // Step 2: Fetch summary for the best matching article
    const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
      bestMatch
    )}`;

    const summaryResponse = await fetch(summaryUrl, {
      headers: {
        'User-Agent': 'ChessTutorApp/1.0 (Educational chess training app)',
      },
    });

    if (!summaryResponse.ok) {
      console.error('[Wikipedia API] Summary fetch failed for:', bestMatch);
      return NextResponse.json(
        {
          error: 'Wikipedia article not found',
          fallback: 'No background information available for this opening.',
        },
        { status: 404 }
      );
    }

    const data = await summaryResponse.json();

    // Format the response
    const summary = {
      openingName,
      title: data.title,
      extract: data.extract,
      url:
        data.content_urls?.desktop?.page ||
        `https://en.wikipedia.org/wiki/${encodeURIComponent(bestMatch)}`,
      fetchedAt: Date.now(),
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
    };

    console.log('[Wikipedia API] Successfully fetched:', data.title);
    return NextResponse.json(summary);
  } catch (error) {
    console.error('[Wikipedia API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Wikipedia summary' },
      { status: 500 }
    );
  }
}

#!/usr/bin/env tsx

/**
 * Wikipedia Opening Cache Builder
 *
 * Fetches full Wikipedia articles for chess opening families and caches them locally.
 * This eliminates runtime API calls and makes Wikipedia content available offline.
 *
 * Wikipedia content is licensed under CC BY-SA 3.0
 * https://creativecommons.org/licenses/by-sa/3.0/
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface WikipediaArticle {
  openingFamily: string;
  title: string;
  url: string;
  sections: {
    title: string;
    text: string;
  }[];
  lastModified: string;
  license: string;
  licenseUrl: string;
  fetchedAt: number;
}

/**
 * Extract opening family names from the opening database
 */
function extractOpeningFamilies(): string[] {
  const ecoFiles = ['ecoA', 'ecoB', 'ecoC', 'ecoD', 'ecoE'];
  const families = new Set<string>();

  for (const ecoFile of ecoFiles) {
    const filePath = path.join(__dirname, '..', 'public', 'openings', `${ecoFile}.json`);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    // Extract family names from each opening
    for (const opening of Object.values(data) as any[]) {
      if (opening.name && opening.isEcoRoot === true) {
        const familyName = extractFamilyName(opening.name);
        if (familyName) {
          families.add(familyName);
        }
      }
    }
  }

  return Array.from(families).sort();
}

/**
 * Extract family name from opening name
 */
function extractFamilyName(openingName: string): string {
  const separators = [':', ',', '–', '—', ' - '];
  for (const sep of separators) {
    if (openingName.includes(sep)) {
      return openingName.split(sep)[0].trim();
    }
  }
  return openingName;
}

/**
 * Manual overrides for problematic opening names
 * Maps opening family name -> exact Wikipedia article title
 */
const WIKIPEDIA_OVERRIDES: Record<string, string> = {
  'French Defense': 'French Defence',
  'French': 'French Defence',
  'English Opening': 'English Opening',
  'English': 'English Opening',
  'Dutch Defense': 'Dutch Defence',
  'Dutch': 'Dutch Defence',
  'Spanish Game': 'Ruy Lopez',
  'Italian Game': 'Italian Game',
  'Scandinavian Defense': 'Scandinavian Defense',
  'Pirc Defense': 'Pirc Defence',
  'Modern Defense': 'Modern Defense (chess)',
};

/**
 * Search Wikipedia for the best matching article
 */
async function searchWikipedia(openingFamily: string): Promise<string | null> {
  // Check manual overrides first
  if (WIKIPEDIA_OVERRIDES[openingFamily]) {
    console.log(`  Using manual override: "${WIKIPEDIA_OVERRIDES[openingFamily]}"`);
    return WIKIPEDIA_OVERRIDES[openingFamily];
  }

  // Try two search strategies:
  // 1. Search with "chess opening" appended (more specific)
  // 2. Search with original name (fallback)
  const searchQueries = [
    `${openingFamily} chess opening`,
    openingFamily,
  ];

  for (const query of searchQueries) {
    const searchUrl = new URL('https://en.wikipedia.org/w/api.php');
    searchUrl.searchParams.set('action', 'opensearch');
    searchUrl.searchParams.set('search', query);
    searchUrl.searchParams.set('limit', '10'); // Increased from 5 to get more options
    searchUrl.searchParams.set('namespace', '0');
    searchUrl.searchParams.set('format', 'json');

    console.log(`  Searching Wikipedia for: "${query}"`);

    const response = await fetch(searchUrl.toString(), {
      headers: {
        'User-Agent': 'ChessTutorApp/1.0 (Educational chess training app; cache builder)',
      },
    });

    if (!response.ok) {
      console.error(`  ❌ Search failed: ${response.status}`);
      continue;
    }

    const data = await response.json();
    const titles = data[1] as string[];
    const descriptions = data[2] as string[];

    if (!titles || titles.length === 0) {
      console.log(`  ⚠️  No results found for this query`);
      continue;
    }

    // Score each result based on chess relevance
    const scoredResults = titles.map((title, i) => {
      const description = descriptions[i] || '';
      const lowerTitle = title.toLowerCase();
      const lowerDesc = description.toLowerCase();

      let score = 0;

      // Skip disambiguation pages (they're not what we want)
      if (lowerTitle.includes('(disambiguation)') || lowerDesc.includes('may refer to')) {
        return { title, description, score: -1000 };
      }

      // Strong chess indicators
      if (lowerDesc.includes('chess opening')) score += 100;
      if (lowerTitle.includes('chess')) score += 50;
      if (lowerDesc.includes('chess')) score += 30;
      if (lowerDesc.includes('opening')) score += 20;

      // Additional chess terms
      if (lowerDesc.includes('variation') || lowerDesc.includes('defense') || lowerDesc.includes('defence')) score += 10;
      if (lowerDesc.includes('game') && lowerDesc.includes('chess')) score += 15;

      // Prefer exact or close matches to opening name
      if (lowerTitle.includes(openingFamily.toLowerCase())) score += 40;

      // Penalize generic terms that suggest it's not the chess opening
      if (lowerDesc.includes('language') || lowerDesc.includes('people') ||
          lowerDesc.includes('cuisine') || lowerDesc.includes('culture')) {
        score -= 50;
      }

      return { title, description, score };
    });

    // Sort by score (highest first)
    scoredResults.sort((a, b) => b.score - a.score);

    // Pick the best match if it has a positive score
    const bestMatch = scoredResults[0];
    if (bestMatch && bestMatch.score > 0) {
      console.log(`  ✓ Found: "${bestMatch.title}" (score: ${bestMatch.score})`);
      return bestMatch.title;
    }
  }

  console.log(`  ⚠️  No suitable chess article found`);
  return null;
}

/**
 * Fetch full Wikipedia article content
 */
async function fetchWikipediaArticle(
  openingFamily: string,
  articleTitle: string
): Promise<WikipediaArticle | null> {
  // Use MediaWiki API to get parsed content with sections
  const apiUrl = new URL('https://en.wikipedia.org/w/api.php');
  apiUrl.searchParams.set('action', 'parse');
  apiUrl.searchParams.set('page', articleTitle);
  apiUrl.searchParams.set('prop', 'sections|text|displaytitle|revid');
  apiUrl.searchParams.set('format', 'json');
  apiUrl.searchParams.set('formatversion', '2');

  console.log(`  Fetching full article...`);

  const response = await fetch(apiUrl.toString(), {
    headers: {
      'User-Agent': 'ChessTutorApp/1.0 (Educational chess training app; cache builder)',
    },
  });

  if (!response.ok) {
    console.error(`  ❌ Fetch failed: ${response.status}`);
    return null;
  }

  const data = await response.json();

  if (data.error) {
    console.error(`  ❌ API error:`, data.error);
    return null;
  }

  const parseData = data.parse;
  const fullHtml = parseData.text;
  const sectionsData = parseData.sections || [];

  // Extract sections from the HTML
  const sections = extractSections(fullHtml, sectionsData);

  // Get last modified date
  const lastModified = new Date().toISOString();

  const article: WikipediaArticle = {
    openingFamily,
    title: parseData.displaytitle || articleTitle,
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(articleTitle)}`,
    sections,
    lastModified,
    license: 'CC BY-SA 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
    fetchedAt: Date.now(),
  };

  // Verify this is actually a chess article
  const allText = sections.map(s => s.text).join(' ').toLowerCase();
  const isChessArticle =
    allText.includes('chess') ||
    allText.includes('opening') ||
    allText.includes('variation') ||
    allText.includes('defense') ||
    allText.includes('defence') ||
    allText.includes('game') ||
    allText.includes('move');

  if (!isChessArticle) {
    console.log(`  ⚠️  Article doesn't appear to be about chess (verification failed)`);
    return null;
  }

  console.log(`  ✓ Fetched ${sections.length} sections (verified as chess content)`);
  return article;
}

/**
 * Extract clean text sections from Wikipedia HTML
 */
function extractSections(
  html: string,
  sectionsData: any[]
): { title: string; text: string }[] {
  // Parse HTML and extract meaningful sections
  // For now, we'll get the intro and first few sections
  const sections: { title: string; text: string }[] = [];

  // Extract intro (text before first heading)
  const introMatch = html.match(/<p>([\s\S]*?)(?=<h2|$)/);
  if (introMatch) {
    const introText = stripHtml(introMatch[1]);
    if (introText.trim().length > 50) {
      sections.push({
        title: 'Introduction',
        text: introText,
      });
    }
  }

  // Extract sections (we'll take first 5 for brevity)
  const relevantSections = sectionsData
    .filter((s: any) => s.toclevel === 1) // Top-level sections only
    .slice(0, 5);

  for (const section of relevantSections) {
    const sectionTitle = section.line;

    // Skip non-relevant sections
    if (
      sectionTitle.toLowerCase().includes('references') ||
      sectionTitle.toLowerCase().includes('external links') ||
      sectionTitle.toLowerCase().includes('see also') ||
      sectionTitle.toLowerCase().includes('notes')
    ) {
      continue;
    }

    // Extract section content
    const sectionRegex = new RegExp(
      `<h2[^>]*>.*?${escapeRegex(sectionTitle)}.*?</h2>([\s\S]*?)(?=<h2|$)`,
      'i'
    );
    const sectionMatch = html.match(sectionRegex);

    if (sectionMatch) {
      const sectionText = stripHtml(sectionMatch[1]);
      if (sectionText.trim().length > 50) {
        sections.push({
          title: sectionTitle,
          text: sectionText,
        });
      }
    }
  }

  return sections;
}

/**
 * Strip HTML tags and clean text
 */
function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove style tags
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove script tags
    .replace(/<sup[^>]*>[\s\S]*?<\/sup>/gi, '') // Remove citation superscripts
    .replace(/<\/?[^>]+(>|$)/g, '') // Remove all other tags
    .replace(/\[[0-9]+\]/g, '') // Remove citation numbers [1], [2], etc.
    .replace(/&nbsp;/g, ' ') // Replace &nbsp;
    .replace(/&amp;/g, '&') // Replace &amp;
    .replace(/&lt;/g, '<') // Replace &lt;
    .replace(/&gt;/g, '>') // Replace &gt;
    .replace(/\n\s*\n/g, '\n\n') // Clean up multiple newlines
    .trim();
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Main execution
 */
async function main() {
  console.log('🌐 Wikipedia Opening Cache Builder\n');
  console.log('📚 Extracting opening families from database...');

  const families = extractOpeningFamilies();
  console.log(`✓ Found ${families.length} unique opening families\n`);

  const outputDir = path.join(__dirname, '..', 'public', 'wikipedia');

  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`✓ Created directory: ${outputDir}\n`);
  }

  const results = {
    successful: 0,
    failed: 0,
    skipped: 0,
  };

  // Process each family
  for (const family of families) {
    console.log(`\n📖 Processing: ${family}`);

    try {
      // Search for the article
      const articleTitle = await searchWikipedia(family);

      if (!articleTitle) {
        console.log(`  ⚠️  Skipping (no Wikipedia article found)`);
        results.skipped++;
        continue;
      }

      // Fetch full article
      const article = await fetchWikipediaArticle(family, articleTitle);

      if (!article) {
        console.log(`  ❌ Failed to fetch article`);
        results.failed++;
        continue;
      }

      // Save to file
      const slug = family.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const filename = `${slug}.json`;
      const filepath = path.join(outputDir, filename);

      fs.writeFileSync(filepath, JSON.stringify(article, null, 2));
      console.log(`  ✓ Saved to: ${filename}`);
      results.successful++;

      // Rate limiting - be nice to Wikipedia
      await sleep(1000);
    } catch (error) {
      console.error(`  ❌ Error:`, error);
      results.failed++;
    }
  }

  // Create index file
  console.log('\n📝 Creating index file...');
  const indexPath = path.join(outputDir, 'index.json');
  const indexData = {
    generatedAt: new Date().toISOString(),
    totalFamilies: families.length,
    successful: results.successful,
    failed: results.failed,
    skipped: results.skipped,
    license: 'Wikipedia content licensed under CC BY-SA 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
  };
  fs.writeFileSync(indexPath, JSON.stringify(indexData, null, 2));

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('✨ Wikipedia Cache Build Complete!\n');
  console.log(`✓ Successful: ${results.successful}`);
  console.log(`⚠️  Skipped:    ${results.skipped}`);
  console.log(`❌ Failed:     ${results.failed}`);
  console.log(`📁 Output:     ${outputDir}`);
  console.log('='.repeat(50) + '\n');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Run the script
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

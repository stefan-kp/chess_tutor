#!/usr/bin/env tsx

/**
 * Add Wikipedia slugs to opening database
 *
 * This script updates the opening JSON files to include wikipediaSlug field
 * based on the cached Wikipedia articles we've already downloaded.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface OpeningMetadata {
  name: string;
  eco: string;
  moves: string;
  isEcoRoot?: boolean;
  wikipediaSlug?: string;
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
 * Convert family name to slug
 */
function familyNameToSlug(familyName: string): string {
  return familyName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

/**
 * Load Wikipedia cache index to see what we have
 */
function getAvailableWikipediaSlugs(): Set<string> {
  const wikiDir = path.join(__dirname, '..', 'public', 'wikipedia');
  const slugs = new Set<string>();

  if (!fs.existsSync(wikiDir)) {
    return slugs;
  }

  const files = fs.readdirSync(wikiDir);
  for (const file of files) {
    if (file.endsWith('.json') && file !== 'index.json') {
      const slug = file.replace('.json', '');
      slugs.add(slug);
    }
  }

  return slugs;
}

/**
 * Update opening database files with Wikipedia slugs
 */
function updateOpeningDatabases() {
  const availableSlugs = getAvailableWikipediaSlugs();
  console.log(`\n📚 Found ${availableSlugs.size} Wikipedia cache files\n`);

  const ecoFiles = ['ecoA', 'ecoB', 'ecoC', 'ecoD', 'ecoE'];
  let totalUpdated = 0;
  let totalSkipped = 0;

  for (const ecoFile of ecoFiles) {
    const filePath = path.join(__dirname, '..', 'public', 'openings', `${ecoFile}.json`);

    console.log(`\n📖 Processing ${ecoFile}.json...`);

    if (!fs.existsSync(filePath)) {
      console.log(`  ⚠️  File not found, skipping`);
      continue;
    }

    const data: Record<string, OpeningMetadata> = JSON.parse(
      fs.readFileSync(filePath, 'utf-8')
    );

    let updatedCount = 0;
    let skippedCount = 0;

    // Update each opening
    for (const [fen, opening] of Object.entries(data)) {
      const familyName = extractFamilyName(opening.name);
      const slug = familyNameToSlug(familyName);

      if (availableSlugs.has(slug)) {
        opening.wikipediaSlug = slug;
        updatedCount++;
      } else {
        skippedCount++;
      }
    }

    // Write updated file
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

    console.log(`  ✓ Updated ${updatedCount} openings`);
    console.log(`  ⚠️  Skipped ${skippedCount} (no Wikipedia cache)`);

    totalUpdated += updatedCount;
    totalSkipped += skippedCount;
  }

  console.log('\n' + '='.repeat(50));
  console.log('✨ Wikipedia Slug Addition Complete!\n');
  console.log(`✓ Total updated: ${totalUpdated}`);
  console.log(`⚠️  Total skipped:  ${totalSkipped}`);
  console.log('='.repeat(50) + '\n');
}

// Run the script
console.log('🔗 Adding Wikipedia Slugs to Opening Database\n');
updateOpeningDatabases();

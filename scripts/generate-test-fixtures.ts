#!/usr/bin/env tsx

/**
 * Generate Test Fixtures from Real Opening Data
 *
 * This script creates a subset of the opening database for e2e testing.
 * It extracts a representative sample from each ECO file to keep tests fast
 * while still using realistic data.
 */

import fs from 'fs';
import path from 'path';

const OPENINGS_DIR = path.join(__dirname, '../public/openings');
const FIXTURES_DIR = path.join(__dirname, '../e2e/fixtures/openings');
const ECO_FILES = ['ecoA.json', 'ecoB.json', 'ecoC.json', 'ecoD.json', 'ecoE.json'];

// Number of openings to extract from each ECO file
const SAMPLE_SIZE = 5;

console.log('🔧 Generating test fixtures from real opening data...\n');

// Safety check: Ensure we're not accidentally reading from test fixtures
const sampleFile = path.join(OPENINGS_DIR, ECO_FILES[0]);
const sampleData = JSON.parse(fs.readFileSync(sampleFile, 'utf8'));
const entryCount = Object.keys(sampleData).length;

if (entryCount < 100) {
  console.error('❌ ERROR: Source opening files appear to be test fixtures (too few entries)!');
  console.error(`   Found only ${entryCount} entries in ${ECO_FILES[0]}`);
  console.error('   Expected hundreds of entries from the real database.');
  console.error('\n💡 To restore the real opening data:');
  console.error('   git checkout 30f1e9e -- public/openings/eco*.json');
  console.error('   node scripts/buildOpeningIndex.js');
  process.exit(1);
}

console.log(`✓ Verified source data integrity (${entryCount} openings in ${ECO_FILES[0]})\n`);

// Ensure fixtures directory exists
if (!fs.existsSync(FIXTURES_DIR)) {
  fs.mkdirSync(FIXTURES_DIR, { recursive: true });
}

// Process each ECO file
for (const filename of ECO_FILES) {
  const sourcePath = path.join(OPENINGS_DIR, filename);
  const targetPath = path.join(FIXTURES_DIR, filename);

  console.log(`📖 Processing ${filename}...`);

  try {
    // Read the full ECO file
    const data = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
    const entries = Object.entries(data);

    // Take a sample from the beginning
    const sample: Record<string, any> = {};
    const sampleEntries = entries.slice(0, SAMPLE_SIZE);

    for (const [fen, opening] of sampleEntries) {
      sample[fen] = opening;
    }

    // Write the fixture file
    fs.writeFileSync(targetPath, JSON.stringify(sample, null, 2), 'utf8');
    console.log(`   ✓ Created fixture with ${sampleEntries.length} openings`);
  } catch (error) {
    console.error(`   ✗ Error processing ${filename}:`, error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

console.log('\n📊 Building move index for fixtures...');

// Build move index from fixture files
const allOpenings: any[] = [];

for (const filename of ECO_FILES) {
  const filepath = path.join(FIXTURES_DIR, filename);
  const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
  const entries = Object.entries(data);

  for (const [fen, opening] of entries) {
    allOpenings.push({
      fen,
      ...opening as any
    });
  }
}

// Build move sequence index
const moveIndex: Record<string, any[]> = {};

for (const opening of allOpenings) {
  const moveSequence = opening.moves.trim();

  if (!moveIndex[moveSequence]) {
    moveIndex[moveSequence] = [];
  }

  // Remove the 'fen' field to reduce file size
  const { fen, ...openingData } = opening;
  moveIndex[moveSequence].push(openingData);
}

// Sort each array of openings
for (const moveSequence in moveIndex) {
  moveIndex[moveSequence].sort((a, b) => {
    const aLength = a.moves.length;
    const bLength = b.moves.length;

    if (aLength !== bLength) {
      return aLength - bLength;
    }

    return a.name.localeCompare(b.name);
  });
}

// Write move index
const moveIndexPath = path.join(FIXTURES_DIR, 'moveIndex.json');
fs.writeFileSync(moveIndexPath, JSON.stringify(moveIndex, null, 2), 'utf8');
console.log(`   ✓ Created move index with ${Object.keys(moveIndex).length} sequences`);

console.log('\n✅ Test fixtures generated successfully!\n');
console.log('📁 Fixture files created in:');
console.log(`   ${FIXTURES_DIR}/\n`);
console.log('📋 Files:');
console.log('   • ecoA.json (5 sample openings)');
console.log('   • ecoB.json (5 sample openings)');
console.log('   • ecoC.json (5 sample openings)');
console.log('   • ecoD.json (5 sample openings)');
console.log('   • ecoE.json (5 sample openings)');
console.log('   • moveIndex.json (generated index)');
console.log('\n⚠️  WARNING: These are TEST FIXTURES ONLY!');
console.log('   Do NOT copy these to public/openings/ - they will overwrite real data!');
console.log('   The e2e tests should read from e2e/fixtures/openings/ directory.');

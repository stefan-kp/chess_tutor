#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ecoFiles = ['ecoA', 'ecoB', 'ecoC', 'ecoD', 'ecoE'];
const withWiki = [];
const withoutWiki = [];

for (const file of ecoFiles) {
  const filePath = path.join(__dirname, '..', 'public', 'openings', `${file}.json`);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  for (const [fen, opening] of Object.entries(data)) {
    if (opening.isEcoRoot) {
      if (opening.wikipediaSlug) {
        withWiki.push({
          eco: opening.eco,
          name: opening.name,
          slug: opening.wikipediaSlug
        });
      } else {
        withoutWiki.push({
          eco: opening.eco,
          name: opening.name
        });
      }
    }
  }
}

// Sort
withWiki.sort((a, b) => a.name.localeCompare(b.name));
withoutWiki.sort((a, b) => a.name.localeCompare(b.name));

console.log('━'.repeat(70));
console.log('WIKIPEDIA INTEGRATION SUMMARY');
console.log('━'.repeat(70));
console.log();

console.log(`✅ ECO roots WITH Wikipedia: ${withWiki.length}`);
console.log(`❌ ECO roots WITHOUT Wikipedia: ${withoutWiki.length}`);
console.log();

// Show major openings with Wikipedia
console.log('━'.repeat(70));
console.log('MAJOR OPENINGS WITH WIKIPEDIA (sample):');
console.log('━'.repeat(70));

const majorOpenings = [
  'Sicilian', 'French', 'Caro-Kann', 'Pirc', 'Alekhine',
  'Scandinavian', 'Italian', 'Spanish', 'Scotch', 'Vienna',
  'English', 'Reti', 'Bird', 'Polish', 'Nimzo', 'Queen',
  'King', 'Benoni', 'Catalan', 'Grunfeld', 'Dutch', 'Ruy Lopez'
];

const foundMajor = withWiki.filter(o =>
  majorOpenings.some(m => o.name.toLowerCase().includes(m.toLowerCase()))
);

foundMajor.slice(0, 40).forEach(o => {
  console.log(`  ${o.eco.padEnd(4)} ${o.name}`);
});

if (foundMajor.length > 40) {
  console.log(`  ... and ${foundMajor.length - 40} more major openings`);
}

console.log();
console.log('━'.repeat(70));
console.log('OPENINGS MISSING WIKIPEDIA:');
console.log('━'.repeat(70));

if (withoutWiki.length === 0) {
  console.log('  None! All ECO roots have Wikipedia articles.');
} else {
  withoutWiki.forEach(o => {
    const isVariation = o.name.includes(':');
    const marker = isVariation ? '  └─' : '  ';
    console.log(`${marker} ${o.eco.padEnd(4)} ${o.name}`);
  });
}

console.log();
console.log('━'.repeat(70));
console.log(`Coverage: ${withWiki.length}/${withWiki.length + withoutWiki.length} ECO roots (${Math.round(withWiki.length / (withWiki.length + withoutWiki.length) * 100)}%)`);
console.log('━'.repeat(70));

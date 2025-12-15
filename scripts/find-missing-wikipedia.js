#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ecoFiles = ['ecoA', 'ecoB', 'ecoC', 'ecoD', 'ecoE'];
const missingWiki = [];

for (const file of ecoFiles) {
  const filePath = path.join(__dirname, '..', 'public', 'openings', `${file}.json`);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  for (const [fen, opening] of Object.entries(data)) {
    if (opening.isEcoRoot && !opening.wikipediaSlug) {
      missingWiki.push({
        eco: opening.eco,
        name: opening.name,
        moves: opening.moves
      });
    }
  }
}

// Sort by ECO code
missingWiki.sort((a, b) => a.eco.localeCompare(b.eco));

console.log('Major openings (ECO roots) WITHOUT Wikipedia slugs:\n');
console.log('Total:', missingWiki.length, '\n');

// Group by ECO category
const byCategory = {};
for (const opening of missingWiki) {
  const category = opening.eco[0];
  if (!byCategory[category]) byCategory[category] = [];
  byCategory[category].push(opening);
}

for (const [cat, openings] of Object.entries(byCategory).sort()) {
  console.log(`\n=== ECO ${cat} (${openings.length} openings) ===`);
  openings.slice(0, 15).forEach(o => {
    console.log(`${o.eco.padEnd(4)} ${o.name}`);
  });
  if (openings.length > 15) {
    console.log(`... and ${openings.length - 15} more`);
  }
}

// Show some notable ones
console.log('\n\n=== Notable Missing Openings ===');
const notable = [
  'Sicilian', 'French', 'Caro-Kann', 'Pirc', 'Alekhine',
  'Scandinavian', 'Queen', 'English', 'Indian', 'Benoni',
  'Nimzo', 'Grunfeld', 'Dutch', 'Reti', 'Bird'
];

const notableMatches = missingWiki.filter(o =>
  notable.some(n => o.name.toLowerCase().includes(n.toLowerCase()))
);

if (notableMatches.length > 0) {
  notableMatches.forEach(o => {
    console.log(`${o.eco.padEnd(4)} ${o.name}`);
  });
} else {
  console.log('(None found - all major openings have Wikipedia slugs!)');
}

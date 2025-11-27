#!/usr/bin/env node

/**
 * Build Opening Index Script
 * 
 * This script generates a move-sequence index from the ECO opening database files.
 * It creates a JSON file that maps move sequences to arrays of opening metadata.
 * 
 * Usage: node scripts/buildOpeningIndex.js
 * 
 * Output: public/openings/moveIndex.json
 */

const fs = require('fs');
const path = require('path');

// Paths
const ECO_DIR = path.join(__dirname, '../public/openings');
const OUTPUT_FILE = path.join(ECO_DIR, 'moveIndex.json');

// ECO files to process
const ECO_FILES = ['ecoA.json', 'ecoB.json', 'ecoC.json', 'ecoD.json', 'ecoE.json'];

console.log('🚀 Building opening move index...\n');

// Load all ECO data
const allOpenings = [];
let totalOpenings = 0;

for (const filename of ECO_FILES) {
    const filepath = path.join(ECO_DIR, filename);
    console.log(`📖 Reading ${filename}...`);
    
    try {
        const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
        const entries = Object.entries(data);
        
        for (const [fen, opening] of entries) {
            allOpenings.push({
                fen,
                ...opening
            });
        }
        
        console.log(`   ✓ Loaded ${entries.length} openings`);
        totalOpenings += entries.length;
    } catch (error) {
        console.error(`   ✗ Error reading ${filename}:`, error.message);
        process.exit(1);
    }
}

console.log(`\n📊 Total openings loaded: ${totalOpenings}\n`);

// Build move sequence index
console.log('🔨 Building move sequence index...');

const moveIndex = {};
let uniqueSequences = 0;

for (const opening of allOpenings) {
    const moveSequence = opening.moves.trim();
    
    if (!moveIndex[moveSequence]) {
        moveIndex[moveSequence] = [];
        uniqueSequences++;
    }
    
    // Add opening to this move sequence
    // Remove the 'fen' field to reduce file size (we don't need it in the index)
    const { fen, ...openingData } = opening;
    moveIndex[moveSequence].push(openingData);
}

console.log(`   ✓ Created ${uniqueSequences} unique move sequences\n`);

// Sort each array of openings
console.log('📋 Sorting openings...');

for (const moveSequence in moveIndex) {
    moveIndex[moveSequence].sort((a, b) => {
        // Sort by move length (shorter first), then alphabetically by name
        const aLength = a.moves.length;
        const bLength = b.moves.length;
        
        if (aLength !== bLength) {
            return aLength - bLength;
        }
        
        return a.name.localeCompare(b.name);
    });
}

console.log('   ✓ Sorted all opening arrays\n');

// Write output file
console.log(`💾 Writing to ${OUTPUT_FILE}...`);

try {
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(moveIndex, null, 2), 'utf8');
    console.log('   ✓ File written successfully\n');
} catch (error) {
    console.error('   ✗ Error writing file:', error.message);
    process.exit(1);
}

// Statistics
const stats = {
    totalOpenings,
    uniqueSequences,
    avgOpeningsPerSequence: (totalOpenings / uniqueSequences).toFixed(2),
    fileSize: (fs.statSync(OUTPUT_FILE).size / 1024 / 1024).toFixed(2) + ' MB'
};

console.log('✅ Build complete!\n');
console.log('📈 Statistics:');
console.log(`   - Total openings: ${stats.totalOpenings}`);
console.log(`   - Unique move sequences: ${stats.uniqueSequences}`);
console.log(`   - Average openings per sequence: ${stats.avgOpeningsPerSequence}`);
console.log(`   - Output file size: ${stats.fileSize}`);
console.log('\n🎯 Next step: Run this file and commit public/openings/moveIndex.json to git\n');


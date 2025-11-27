#!/usr/bin/env node

/**
 * Test script for opening lookup functionality
 * Tests the hybrid approach: exact matches + common continuations
 */

const moveIndex = require('../public/openings/moveIndex.json');

function lookupPossibleOpenings(moveSequence, maxResults = 5) {
    const normalized = moveSequence.trim();
    const results = [];
    const seenEcoRoots = new Set();
    
    // Step 1: Add exact matches first
    const exactMatches = moveIndex[normalized] || [];
    for (const opening of exactMatches) {
        if (results.length >= maxResults) break;
        results.push(opening);
        const ecoRoot = opening.eco.substring(0, 2);
        seenEcoRoots.add(ecoRoot);
    }
    
    // Step 2: If we haven't reached maxResults, look for common continuations
    if (results.length < maxResults) {
        const continuations = [];

        for (const [seq, openings] of Object.entries(moveIndex)) {
            if (seq.startsWith(normalized + ' ')) {
                const ourPly = normalized.split(/\s+/).filter(s => s && !s.match(/^\d+\.$/)).length;
                const theirPly = seq.split(/\s+/).filter(s => s && !s.match(/^\d+\.$/)).length;
                const depth = theirPly - ourPly;

                if (depth > 0 && depth <= 4) {
                    continuations.push({ sequence: seq, openings, depth });
                }
            }
        }

        continuations.sort((a, b) => {
            if (a.depth !== b.depth) return a.depth - b.depth;

            const aHasRoot = a.openings.some(o => o.isEcoRoot);
            const bHasRoot = b.openings.some(o => o.isEcoRoot);
            if (aHasRoot && !bHasRoot) return -1;
            if (!aHasRoot && bHasRoot) return 1;

            const aEco = a.openings[0]?.eco || 'ZZZ';
            const bEco = b.openings[0]?.eco || 'ZZZ';
            return aEco.localeCompare(bEco);
        });

        for (const { openings } of continuations) {
            if (results.length >= maxResults) break;

            const opening = openings[0];
            if (opening) {
                const ecoRoot = opening.eco.substring(0, 2);
                if (!seenEcoRoots.has(ecoRoot)) {
                    results.push(opening);
                    seenEcoRoots.add(ecoRoot);
                }
            }
        }
    }
    
    return results.slice(0, maxResults);
}

// Test cases
console.log('🧪 Testing Opening Lookup\n');

const testCases = [
    '1. e4',
    '1. e4 e5',
    '1. e4 c5',
    '1. d4',
    '1. e4 e5 2. Nf3',
    '1. e4 e5 2. Nf3 Nc6 3. Bb5'
];

for (const moveSeq of testCases) {
    console.log(`\n📍 Move sequence: "${moveSeq}"`);
    const openings = lookupPossibleOpenings(moveSeq, 5);
    console.log(`   Found ${openings.length} opening(s):`);
    openings.forEach((o, i) => {
        const type = moveIndex[moveSeq]?.includes(o) ? '[EXACT]' : '[CONTINUATION]';
        console.log(`   ${i + 1}. ${type} ${o.name} (${o.eco}) - ${o.moves}`);
    });
}

console.log('\n✅ Test complete!\n');


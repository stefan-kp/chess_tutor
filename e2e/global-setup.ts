import fs from 'fs';
import path from 'path';

/**
 * Global setup for Playwright e2e tests
 * Copies test fixtures to public directory before tests run
 */
export default function globalSetup() {
  console.log('🔧 Setting up e2e test environment...');

  const fixturesDir = path.join(__dirname, 'fixtures/openings');
  const targetDir = path.join(__dirname, '../public/openings');

  // Ensure target directory exists
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // Copy fixture files
  const files = ['ecoA.json', 'ecoB.json', 'ecoC.json', 'ecoD.json', 'ecoE.json', 'moveIndex.json'];

  for (const file of files) {
    const source = path.join(fixturesDir, file);
    const target = path.join(targetDir, file);

    if (fs.existsSync(source)) {
      fs.copyFileSync(source, target);
      console.log(`   ✓ Copied ${file}`);
    } else {
      console.warn(`   ⚠️  Fixture not found: ${file}`);
    }
  }

  console.log('✅ Test fixtures ready\n');
}

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const wikiDir = path.join(__dirname, '..', 'public', 'wikipedia');
const lockFile = path.join(wikiDir, '.rebuilding');

// Clear stale lock file on startup
if (fs.existsSync(lockFile)) {
  console.log('🧹 Removing stale .rebuilding lock file...');
  fs.unlinkSync(lockFile);
}

function needsRebuild() {
  if (!fs.existsSync(wikiDir)) return true;
  
  const files = fs.readdirSync(wikiDir);
  const jsonFiles = files.filter(f => f.endsWith('.json') && f !== 'index.json');
  
  // If we have fewer than 20 files, it's probably incomplete
  return jsonFiles.length < 20;
}

if (needsRebuild()) {
  console.log('📦 Wikipedia cache empty or incomplete. Rebuilding...');
  const result = spawnSync('npm', ['run', 'cache:wikipedia'], { 
    stdio: 'inherit', 
    shell: true 
  });
  
  if (result.status !== 0) {
    console.warn('⚠️  Wikipedia cache rebuild failed. The application will start anyway.');
  }
} else {
  console.log('✅ Wikipedia cache is populated.');
}

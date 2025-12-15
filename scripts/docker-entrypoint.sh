#!/bin/sh
set -e

echo "🔧 Chess Tutor Docker Entrypoint"

# Create directories if they don't exist (with error handling)
mkdir -p public/openings 2>/dev/null || echo "⚠️  Cannot create public/openings (may already exist)"
mkdir -p public/wikipedia 2>/dev/null || echo "⚠️  Cannot create public/wikipedia (volume mounted)"
mkdir -p fixtures/tactics 2>/dev/null || echo "⚠️  Cannot create fixtures/tactics (volume mounted)"
mkdir -p downloads 2>/dev/null || echo "⚠️  Cannot create downloads (volume mounted)"

# Check if opening database exists
if [ ! -f "public/openings/ecoA.json" ]; then
  echo "⚠️  Warning: Opening database not found in public/openings/"
  echo "   Please ensure opening database files (ecoA-E.json, moveIndex.json) are in your build context"
  echo "   The application will continue but opening training may not work properly"
else
  echo "✅ Opening database found"
fi

# Check if Wikipedia cache needs to be populated
# Count JSON files (excluding index.json and .gitkeep)
WIKI_COUNT=$(find public/wikipedia -name "*.json" -not -name "index.json" 2>/dev/null | wc -l | tr -d ' ')

if [ "$WIKI_COUNT" -lt 10 ]; then
  echo "📚 Wikipedia cache empty or incomplete (found $WIKI_COUNT files)"
  echo "   Fetching Wikipedia opening data..."
  npm run cache:wikipedia || echo "⚠️  Warning: Wikipedia fetch failed, continuing..."

  echo "🔗 Updating Wikipedia slugs in opening database..."
  npm run update:wikipedia-slugs || echo "⚠️  Warning: Wikipedia slug update failed, continuing..."

  echo "📊 Rebuilding opening move index..."
  npm run build:opening-index || echo "⚠️  Warning: Move index rebuild failed, continuing..."

  # Mark as initialized (with error handling for permissions)
  touch public/wikipedia/.initialized 2>/dev/null || echo "⚠️  Cannot create marker file (permission issue, but cache is populated)"
  echo "✅ Wikipedia data initialized"
else
  echo "✅ Wikipedia cache already populated ($WIKI_COUNT files), skipping..."
fi

echo "🚀 Starting Chess Tutor application..."

# Execute the main command (node server.js)
exec "$@"

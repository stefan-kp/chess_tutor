#!/bin/sh
set -e

echo "🔧 Chess Tutor Docker Entrypoint"

# Create directories if they don't exist
mkdir -p public/openings
mkdir -p public/wikipedia

# Check if Wikipedia cache needs to be populated
if [ ! -f "public/wikipedia/.initialized" ] || [ -z "$(ls -A public/wikipedia/*.json 2>/dev/null)" ]; then
  echo "📚 Fetching Wikipedia opening data..."
  npm run cache:wikipedia || echo "⚠️  Warning: Wikipedia fetch failed, continuing..."

  echo "🔗 Updating Wikipedia slugs in opening database..."
  npm run update:wikipedia-slugs || echo "⚠️  Warning: Wikipedia slug update failed, continuing..."

  # Mark as initialized
  touch public/wikipedia/.initialized
  echo "✅ Wikipedia data initialized"
else
  echo "✅ Wikipedia cache already populated, skipping..."
fi

# Check if opening database exists
if [ ! -f "public/openings/ecoA.json" ]; then
  echo "⚠️  Warning: Opening database not found in public/openings/"
  echo "   Please ensure opening database files (ecoA-E.json, moveIndex.json) are available"
  echo "   The application will continue but opening training may not work properly"
fi

echo "🚀 Starting Chess Tutor application..."

# Execute the main command (node server.js)
exec "$@"

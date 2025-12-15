#!/bin/bash
#
# Helper script to download Lichess tactical puzzles in Docker container
#
# Usage:
#   ./scripts/docker-setup-puzzles.sh [options]
#
# Options:
#   --max-puzzles NUM    Number of puzzles per pattern (default: 100)
#   --force              Force re-download even if already configured
#   --container NAME     Container name (default: chess-tutor)
#

set -e

# Default values
CONTAINER_NAME="chess-tutor"
MAX_PUZZLES=100
FORCE_FLAG=""

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --max-puzzles)
      MAX_PUZZLES="$2"
      shift 2
      ;;
    --force)
      FORCE_FLAG="--force"
      shift
      ;;
    --container)
      CONTAINER_NAME="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: $0 [--max-puzzles NUM] [--force] [--container NAME]"
      exit 1
      ;;
  esac
done

echo "=========================================="
echo "Chess Tutor - Puzzle Setup (Docker)"
echo "=========================================="
echo "Container: $CONTAINER_NAME"
echo "Puzzles per pattern: $MAX_PUZZLES"
echo "=========================================="
echo ""

# Check if container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "❌ Error: Container '$CONTAINER_NAME' is not running"
  echo ""
  echo "Start it with: docker-compose up -d"
  exit 1
fi

echo "✅ Container is running"
echo ""

# Check if already configured (unless --force)
if [ -z "$FORCE_FLAG" ]; then
  if docker exec "$CONTAINER_NAME" test -f .tactical_puzzles_configured 2>/dev/null; then
    echo "⚠️  Puzzles are already configured!"
    echo ""
    read -p "Do you want to re-download? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      echo "Exiting..."
      exit 0
    fi
    FORCE_FLAG="--force"
  fi
fi

# Run the setup script inside the container
echo "🎯 Starting puzzle download..."
echo "This will download ~500MB and may take 5-10 minutes"
echo ""

docker exec -it "$CONTAINER_NAME" \
  python3 scripts/setup_tactical_puzzles.py --max-puzzles "$MAX_PUZZLES" $FORCE_FLAG

echo ""
echo "=========================================="
echo "✅ Puzzle setup complete!"
echo "=========================================="
echo ""
echo "The puzzles are now available in your Chess Tutor app."
echo "They will persist across container restarts."
echo ""
echo "To check the downloaded puzzles:"
echo "  docker exec $CONTAINER_NAME ls -lh fixtures/tactics/"
echo ""

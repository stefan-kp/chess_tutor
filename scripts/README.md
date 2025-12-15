# Build Scripts

## Overview

This directory contains setup and build scripts for the chess tutor application:
1. **Tactical Puzzles Setup** - Downloads and configures tactical puzzles from Lichess
2. **Wikipedia Cache Builder** - Downloads Wikipedia articles for chess openings

---

# Tactical Puzzles Setup Script

## Quick Start

### Docker (Recommended for production)

**Use the helper script from your host machine:**

```bash
# Default: 100 puzzles per pattern (800 total)
./scripts/docker-setup-puzzles.sh

# Customize number of puzzles
./scripts/docker-setup-puzzles.sh --max-puzzles 500

# Force re-download
./scripts/docker-setup-puzzles.sh --force
```

The script will:
- Check if your container is running
- Download puzzles inside the container
- Store them in persistent Docker volumes
- Puzzles persist across container restarts

### Local Development

**Run this command once before using the tactical practice feature:**

```bash
cd chess_tutor
python3 scripts/setup_tactical_puzzles.py

# Or specify the number of puzzles:
python3 scripts/setup_tactical_puzzles.py --max-puzzles 100
python3 scripts/setup_tactical_puzzles.py --max-puzzles 500
```

## What It Does

The setup script automatically:

1. ✅ **Checks dependencies** - Verifies `zstd` is installed (installs it if needed)
2. ✅ **Downloads database** - Fetches the Lichess puzzle database (~500MB compressed)
3. ✅ **Decompresses** - Extracts the CSV file (~3.5GB uncompressed)
4. ✅ **Filters puzzles** - Extracts 20 high-quality puzzles for each tactical pattern:
   - PIN
   - FORK
   - SKEWER
   - DISCOVERED_CHECK
   - DOUBLE_ATTACK
   - OVERLOADING
   - BACK_RANK_WEAKNESS
   - TRAPPED_PIECE
5. ✅ **Converts format** - Transforms Lichess format to our JSON fixture format
6. ✅ **Saves fixtures** - Writes to `fixtures/tactics/*.json`
7. ✅ **Creates marker** - Places `.tactical_puzzles_configured` file to prevent re-running

## Command Line Options

```bash
python3 scripts/setup_tactical_puzzles.py [OPTIONS]

Options:
  --max-puzzles N    Number of puzzles to extract per pattern (default: 20)
  --force            Force re-run setup without prompting
  -h, --help         Show help message

Examples:
  # Default: 20 puzzles per pattern (160 total)
  python3 scripts/setup_tactical_puzzles.py

  # 100 puzzles per pattern (800 total)
  python3 scripts/setup_tactical_puzzles.py --max-puzzles 100

  # 500 puzzles per pattern (4000 total) - recommended for production
  python3 scripts/setup_tactical_puzzles.py --max-puzzles 500

  # Force re-run without prompting
  python3 scripts/setup_tactical_puzzles.py --max-puzzles 200 --force
```

## Requirements

- **Python 3.7+** (with `python-chess` library - auto-installed if missing)
- **zstd** (auto-installed on macOS/Linux if missing)
- **~4GB disk space** (for downloaded and decompressed database)
- **Internet connection** (for downloading ~500MB file)

## Time Estimate

- **First run**: 5-10 minutes (depending on internet speed)
- **Subsequent runs**: Instant (uses cached database)

## Quality Criteria

The script filters puzzles based on:

- **Popularity**: ≥ 50 (well-liked by users)
- **Rating**: 1200-2000 (appropriate difficulty for learning)
- **Plays**: ≥ 50 (well-tested)
- **Theme**: Must match the tactical pattern

Only the top 20 puzzles (by popularity) are selected for each pattern.

## File Structure

```
chess_tutor/
├── scripts/
│   ├── setup_tactical_puzzles.py    # Main setup script
│   └── README.md                     # This file
├── downloads/                        # Created by script
│   ├── lichess_db_puzzle.csv.zst    # Downloaded database (cached)
│   └── lichess_db_puzzle.csv        # Decompressed database (cached)
├── fixtures/
│   └── tactics/                      # Created by script
│       ├── pin.json                  # 20 PIN puzzles
│       ├── fork.json                 # 20 FORK puzzles
│       ├── skewer.json               # 20 SKEWER puzzles
│       └── ...                       # Other patterns
└── .tactical_puzzles_configured      # Marker file (created by script)
```

## Re-running Setup

If you want to re-run the setup (e.g., to get fresh puzzles):

```bash
# Option 1: Delete the marker file and re-run
rm chess_tutor/.tactical_puzzles_configured
python3 scripts/setup_tactical_puzzles.py

# Option 2: The script will ask if you want to re-run
python3 scripts/setup_tactical_puzzles.py
# Answer 'y' when prompted
```

## Cleaning Up

To save disk space after setup:

```bash
# Delete the downloaded database (keeps the fixtures)
rm -rf chess_tutor/downloads/

# The fixtures in chess_tutor/fixtures/tactics/ will remain
```

## Troubleshooting

### "zstd not found"

The script will attempt to auto-install `zstd`. If it fails:

**macOS:**
```bash
brew install zstd
```

**Ubuntu/Debian:**
```bash
sudo apt-get install zstd
```

**Fedora/RHEL:**
```bash
sudo dnf install zstd
```

### "python-chess not found"

The script will attempt to auto-install `python-chess`. If it fails:

```bash
pip3 install python-chess
```

### "Download failed"

Check your internet connection and try again. The Lichess database is updated daily, so temporary issues may occur.

### "No puzzles found for pattern X"

This is rare but can happen if the database doesn't have enough puzzles matching the criteria. The script will warn you but continue with other patterns.

## Manual Setup (Alternative)

If the automatic script doesn't work, you can manually:

1. Download: https://database.lichess.org/lichess_db_puzzle.csv.zst
2. Decompress with `zstd -d lichess_db_puzzle.csv.zst`
3. Filter puzzles using the Python code in `docs/LICHESS_PUZZLES.md`
4. Convert to JSON format and save to `fixtures/tactics/`

## Source

- **Database**: https://database.lichess.org/
- **License**: Creative Commons CC0 (public domain)
- **Documentation**: See `docs/LICHESS_PUZZLES.md` for detailed information

## Support

If you encounter issues:

1. Check the terminal output for specific error messages
2. Ensure you have Python 3.7+ installed: `python3 --version`
3. Ensure you have internet connectivity
4. Try re-running the script
5. Check `docs/LICHESS_PUZZLES.md` for manual setup instructions


---

# Wikipedia Cache Builder

## Overview

Downloads full Wikipedia articles for all chess opening families and caches them locally for offline use.

## Quick Start

```bash
# Install dependencies (if not already done)
npm install

# Run the Wikipedia cache builder
npm run cache:wikipedia
```

## Benefits

- ✅ **Offline access** - Works completely offline once cached
- ✅ **Instant loading** - No network delay
- ✅ **No rate limiting** - Avoids Wikipedia API rate limits
- ✅ **Full content** - Gets complete articles, not just summaries
- ✅ **Version controlled** - Safe to commit to git

## What It Does

1. **Extracts opening families** from your opening database (`public/openings/*.json`)
2. **Searches Wikipedia** for each family using the OpenSearch API
3. **Downloads full article content** including:
   - Introduction
   - Main sections (History, Ideas, Variations, etc.)
   - Up to 5 relevant sections per opening
4. **Saves locally** to `public/wikipedia/*.json`
5. **Creates an index** at `public/wikipedia/index.json`

## Output Structure

Each opening family gets a JSON file like `public/wikipedia/french-defense.json`:

```json
{
  "openingFamily": "French Defense",
  "title": "French Defence",
  "url": "https://en.wikipedia.org/wiki/French_Defence",
  "sections": [
    {
      "title": "Introduction",
      "text": "The French Defence is a chess opening..."
    },
    {
      "title": "History",
      "text": "The first known game with the French Defense..."
    }
  ],
  "lastModified": "2025-01-15T...",
  "license": "CC BY-SA 3.0",
  "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0/",
  "fetchedAt": 1705334400000
}
```

## Committing to Git

The generated files are **safe to commit** to your repository:
- Wikipedia content is licensed under CC BY-SA 3.0 (allows redistribution with attribution)
- Each file includes proper license information
- Files are versioned, so you can review changes before committing

## When to Run

- **Initial setup**: Run once to cache all Wikipedia articles
- **After adding new openings**: Re-run to fetch articles for new families
- **Periodically**: Re-run every few months to get updated Wikipedia content

## Rate Limiting

The script includes a 1-second delay between requests to be respectful to Wikipedia's servers.

**Estimated time:**
- 50 opening families = ~1-2 minutes
- 100 opening families = ~2-3 minutes

## Fallback Strategy

The app uses a 3-tier approach for Wikipedia content:

1. **Local cache** (`public/wikipedia/*.json`) - Fastest, always available
2. **localStorage cache** - In-browser cache for API fetches  
3. **Live API** - Fallback if local cache missing

This ensures Wikipedia content is always available, even for openings not in your local cache.

## License & Attribution

Wikipedia content is licensed under **CC BY-SA 3.0**:
- ✅ Commercial use allowed
- ✅ Modification allowed
- ✅ Redistribution allowed
- ⚠️ Attribution required (included in JSON files)
- ⚠️ Derivative works must use same license

More info: https://creativecommons.org/licenses/by-sa/3.0/

## Implementation Details

**Script location:** `scripts/fetch-wikipedia-openings.ts`

**Dependencies:** 
- Node.js 18+
- tsx (TypeScript executor)

**API endpoints used:**
- Wikipedia OpenSearch API (for finding articles)
- Wikipedia MediaWiki Parse API (for full content)

**Output directory:** `public/wikipedia/`

## Example Usage

```bash
# Run the cache builder
npm run cache:wikipedia

# Output:
# 🌐 Wikipedia Opening Cache Builder
# 📚 Extracting opening families from database...
# ✓ Found 47 unique opening families
#
# 📖 Processing: French Defense
#   Searching Wikipedia for: "French Defense"
#   ✓ Found: "French Defence"
#   Fetching full article...
#   ✓ Fetched 5 sections
#   ✓ Saved to: french-defense.json
# ...
# ✨ Wikipedia Cache Build Complete!
# ✓ Successful: 45
# ⚠️  Skipped:    2
# ❌ Failed:     0
```


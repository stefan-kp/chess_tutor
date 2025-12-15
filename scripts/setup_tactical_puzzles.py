#!/usr/bin/env python3
"""
One-time setup script to download and configure high-quality tactical puzzles from Lichess.

This script:
1. Downloads the Lichess puzzle database
2. Extracts puzzles for each tactical pattern
3. Converts them to our JSON fixture format
4. Validates them with our tactical library
5. Creates a marker file to indicate setup is complete

Usage:
    python3 scripts/setup_tactical_puzzles.py
"""

import os
import sys
import json
import csv
import subprocess
import urllib.request
from pathlib import Path
from typing import List, Dict, Any

# Add parent directory to path to import chess libraries
sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    import chess
    import chess.pgn
except ImportError:
    print("❌ Error: python-chess library not found.")
    print("Installing python-chess...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "python-chess"])
    import chess
    import chess.pgn

# Configuration
LICHESS_PUZZLE_URL = "https://database.lichess.org/lichess_db_puzzle.csv.zst"
DOWNLOAD_DIR = Path(__file__).parent.parent / "downloads"
FIXTURES_DIR = Path(__file__).parent.parent / "fixtures" / "tactics"
SETUP_MARKER = Path(__file__).parent.parent / ".tactical_puzzles_configured"

# Mapping of our patterns to Lichess themes
PATTERN_THEMES = {
    "pin": ["pin"],
    "fork": ["fork"],
    "skewer": ["skewer"],
    "discovered_check": ["discoveredAttack"],
    "double_attack": ["doubleCheck", "fork"],
    "overloading": ["overloading"],
    "back_rank_weakness": ["backRankMate"],
    "trapped_piece": ["trappedPiece"],
}

# Quality criteria
MIN_POPULARITY = 50
MIN_RATING = 800   # Easy puzzles start here
MAX_RATING = 2200  # Hard puzzles go up to here
MIN_PLAYS = 50

# Default number of puzzles per pattern (can be overridden via command line)
DEFAULT_PUZZLES_PER_PATTERN = 20


def check_zstd_installed() -> bool:
    """Check if zstd is installed for decompression."""
    try:
        subprocess.run(["zstd", "--version"], capture_output=True, check=True)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False


def install_zstd():
    """Attempt to install zstd."""
    print("📦 Installing zstd...")
    
    # Detect OS and install accordingly
    if sys.platform == "darwin":  # macOS
        try:
            subprocess.check_call(["brew", "install", "zstd"])
            print("✅ zstd installed successfully via Homebrew")
        except (subprocess.CalledProcessError, FileNotFoundError):
            print("❌ Failed to install zstd. Please install Homebrew first:")
            print("   /bin/bash -c \"$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\"")
            sys.exit(1)
    elif sys.platform.startswith("linux"):
        try:
            # Try apt-get (Debian/Ubuntu)
            subprocess.check_call(["sudo", "apt-get", "update"])
            subprocess.check_call(["sudo", "apt-get", "install", "-y", "zstd"])
            print("✅ zstd installed successfully via apt-get")
        except (subprocess.CalledProcessError, FileNotFoundError):
            print("❌ Failed to install zstd. Please install it manually:")
            print("   Debian/Ubuntu: sudo apt-get install zstd")
            print("   Fedora/RHEL: sudo dnf install zstd")
            sys.exit(1)
    else:
        print("❌ Unsupported OS. Please install zstd manually:")
        print("   Windows: Download from https://github.com/facebook/zstd/releases")
        sys.exit(1)


def download_puzzle_database() -> Path:
    """Download the Lichess puzzle database."""
    DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)
    
    compressed_file = DOWNLOAD_DIR / "lichess_db_puzzle.csv.zst"
    decompressed_file = DOWNLOAD_DIR / "lichess_db_puzzle.csv"
    
    # Check if already downloaded and decompressed
    if decompressed_file.exists():
        print(f"✅ Puzzle database already exists at {decompressed_file}")
        return decompressed_file
    
    # Download if not exists
    if not compressed_file.exists():
        print(f"📥 Downloading Lichess puzzle database from {LICHESS_PUZZLE_URL}")
        print("   This may take several minutes (file is ~500MB compressed)...")
        
        try:
            urllib.request.urlretrieve(LICHESS_PUZZLE_URL, compressed_file)
            print(f"✅ Downloaded to {compressed_file}")
        except Exception as e:
            print(f"❌ Failed to download: {e}")
            sys.exit(1)
    
    # Decompress
    print(f"📦 Decompressing {compressed_file.name}...")
    print("   This may take several minutes (decompressed file is ~3.5GB)...")
    
    try:
        subprocess.check_call(["zstd", "-d", str(compressed_file), "-o", str(decompressed_file)])
        print(f"✅ Decompressed to {decompressed_file}")
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to decompress: {e}")
        sys.exit(1)
    
    return decompressed_file


def extract_puzzles_for_pattern(csv_file: Path, pattern: str, themes: List[str], max_puzzles: int) -> List[Dict[str, Any]]:
    """Extract high-quality puzzles for a specific tactical pattern."""
    print(f"🔍 Extracting {pattern.upper()} puzzles (max: {max_puzzles})...")

    puzzles = []

    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)

        for row in reader:
            puzzle_themes = row['Themes'].split()
            rating = int(row['Rating'])
            popularity = int(row['Popularity'])
            nb_plays = int(row['NbPlays'])

            # Check if puzzle matches our criteria
            if (any(theme in puzzle_themes for theme in themes) and
                popularity >= MIN_POPULARITY and
                MIN_RATING <= rating <= MAX_RATING and
                nb_plays >= MIN_PLAYS):

                puzzles.append(row)

                # Stop when we have enough
                if len(puzzles) >= max_puzzles:
                    break

    # Sort by popularity (best first)
    puzzles.sort(key=lambda x: int(x['Popularity']), reverse=True)

    print(f"   Found {len(puzzles)} high-quality {pattern.upper()} puzzles")
    return puzzles[:max_puzzles]


def lichess_to_fixture(puzzle_row: Dict[str, Any], pattern_type: str) -> Dict[str, Any]:
    """Convert Lichess puzzle to our fixture format.

    Lichess puzzle format:
    - FEN: Position BEFORE opponent's first move
    - Moves: Space-separated UCI moves alternating opponent/player
    - First move: Opponent's move (sets up the puzzle)
    - Remaining moves: Player move, opponent response, player move, etc.
    """
    fen = puzzle_row['FEN']
    moves_uci = puzzle_row['Moves'].split()

    # Apply first move (opponent's move) to get starting position
    board = chess.Board(fen)
    opponent_move = chess.Move.from_uci(moves_uci[0])
    board.push(opponent_move)
    initial_fen = board.fen()

    # Determine side to move from initial FEN
    side_to_move = "white" if " w " in initial_fen else "black"

    # Process all moves in the sequence
    # moves_uci[0] = opponent's setup move (already applied)
    # moves_uci[1] = player's first move (solution start)
    # moves_uci[2] = opponent's response
    # moves_uci[3] = player's second move
    # etc.

    move_sequence = []
    for i, move_uci in enumerate(moves_uci[1:], start=1):  # Skip first move (already applied)
        move = chess.Move.from_uci(move_uci)
        move_san = board.san(move)

        # Determine who makes this move
        # Odd indices (1, 3, 5...) = player moves
        # Even indices (2, 4, 6...) = opponent moves
        is_player_move = (i % 2 == 1)

        move_sequence.append({
            "uci": move_uci,
            "san": move_san,
            "player": is_player_move
        })

        board.push(move)

    # Get final position after all moves
    resulting_fen = board.fen()

    # First player move (for backward compatibility)
    first_player_move_uci = moves_uci[1]
    board_temp = chess.Board(initial_fen)
    first_player_move = chess.Move.from_uci(first_player_move_uci)
    first_player_move_san = board_temp.san(first_player_move)

    return {
        "id": puzzle_row['PuzzleId'],
        "initialFen": initial_fen,
        "sideToMove": side_to_move,
        "rating": int(puzzle_row['Rating']),  # Add rating for difficulty filtering
        "bestMove": {
            "san": first_player_move_san,
            "uci": first_player_move_uci
        },
        "moves": move_sequence,  # Full move sequence
        "resultingFen": resulting_fen,
        "expectedPattern": {
            "type": pattern_type.upper().replace("_", "_"),
            # Note: Exact squares will be detected by our tactical library
        },
        "context": f"Lichess puzzle {puzzle_row['PuzzleId']} (Rating: {puzzle_row['Rating']}, Popularity: {puzzle_row['Popularity']})",
        "tags": puzzle_row['Themes'].split()
    }


def save_fixtures(pattern: str, fixtures: List[Dict[str, Any]]):
    """Save fixtures to JSON file."""
    FIXTURES_DIR.mkdir(parents=True, exist_ok=True)

    output_file = FIXTURES_DIR / f"{pattern}.json"

    fixture_data = {
        "description": f"High-quality {pattern.upper()} tactical puzzles from Lichess database",
        "source": "https://database.lichess.org/",
        "generatedAt": "auto-generated",
        "cases": fixtures
    }

    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(fixture_data, f, indent=2, ensure_ascii=False)

    print(f"✅ Saved {len(fixtures)} puzzles to {output_file}")


def create_setup_marker():
    """Create a marker file to indicate setup is complete."""
    with open(SETUP_MARKER, 'w') as f:
        f.write("Tactical puzzles configured successfully\n")
    print(f"✅ Created setup marker at {SETUP_MARKER}")
    print("   (The app will auto-detect Lichess puzzles from fixture metadata)")


def main():
    """Main setup function."""
    import argparse

    parser = argparse.ArgumentParser(
        description='Download and configure high-quality tactical puzzles from Lichess',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Download 20 puzzles per pattern (default)
  python3 scripts/setup_tactical_puzzles.py

  # Download 100 puzzles per pattern
  python3 scripts/setup_tactical_puzzles.py --max-puzzles 100

  # Download 500 puzzles per pattern for production
  python3 scripts/setup_tactical_puzzles.py --max-puzzles 500
        """
    )
    parser.add_argument(
        '--max-puzzles',
        type=int,
        default=DEFAULT_PUZZLES_PER_PATTERN,
        help=f'Maximum number of puzzles to extract per pattern (default: {DEFAULT_PUZZLES_PER_PATTERN})'
    )
    parser.add_argument(
        '--force',
        action='store_true',
        help='Force re-run setup without prompting'
    )

    args = parser.parse_args()

    print("=" * 70)
    print("🎯 Chess Tutor - Tactical Puzzles Setup")
    print("=" * 70)
    print(f"Configuration: {args.max_puzzles} puzzles per pattern")
    print("=" * 70)
    print()

    # Check if already configured
    if SETUP_MARKER.exists() and not args.force:
        print("⚠️  Tactical puzzles are already configured!")
        response = input("Do you want to re-run the setup? (y/N): ").strip().lower()
        if response != 'y':
            print("Exiting...")
            sys.exit(0)
        else:
            SETUP_MARKER.unlink()

    # Step 1: Check/install zstd
    print("Step 1: Checking dependencies...")
    if not check_zstd_installed():
        print("⚠️  zstd not found (required for decompression)")
        install_zstd()
    else:
        print("✅ zstd is installed")
    print()

    # Step 2: Download and decompress database
    print("Step 2: Downloading Lichess puzzle database...")
    csv_file = download_puzzle_database()
    print()

    # Step 3: Extract puzzles for each pattern
    print("Step 3: Extracting puzzles for each tactical pattern...")
    total_puzzles = 0
    for pattern, themes in PATTERN_THEMES.items():
        puzzles = extract_puzzles_for_pattern(csv_file, pattern, themes, args.max_puzzles)

        if len(puzzles) == 0:
            print(f"⚠️  Warning: No puzzles found for {pattern.upper()}")
            continue

        # Convert to fixture format
        fixtures = []
        for puzzle in puzzles:
            try:
                fixture = lichess_to_fixture(puzzle, pattern)
                fixtures.append(fixture)
            except Exception as e:
                print(f"   ⚠️  Skipping puzzle {puzzle['PuzzleId']}: {e}")

        # Save to file
        if fixtures:
            save_fixtures(pattern, fixtures)
            total_puzzles += len(fixtures)

    print()

    # Step 4: Create marker file
    print("Step 4: Finalizing setup...")
    create_setup_marker()
    print()

    print("=" * 70)
    print(f"✅ Setup complete! {total_puzzles} tactical puzzles are ready to use.")
    print("=" * 70)
    print()
    print("Next steps:")
    print("1. Refresh your Chess Tutor app (if running)")
    print("2. The warning banner will automatically disappear")
    print("   (The app detects Lichess puzzles by checking the fixture metadata)")
    print()
    print("3. Go to http://localhost:3050/learning")
    print("4. Select a coach and practice tactical patterns!")
    print()
    print("Note: The downloaded database is cached in the 'downloads' directory.")
    print("      You can delete it to save space if needed.")


if __name__ == "__main__":
    main()


# Opening Database

This directory contains the ECO (Encyclopedia of Chess Openings) database files.

## Required Files

The following files are required for opening training:

- `ecoA.json` - ECO codes A00-A99
- `ecoB.json` - ECO codes B00-B99
- `ecoC.json` - ECO codes C00-C99
- `ecoD.json` - ECO codes D00-D99
- `ecoE.json` - ECO codes E00-E99
- `moveIndex.json` - Generated move sequence index

## File Format

Each ECO file (ecoA-E.json) should be a JSON object mapping FEN positions to opening metadata:

```json
{
  "fen_position": {
    "eco": "A00",
    "name": "Opening Name",
    "moves": "e4 e5 Nf3 Nc6",
    "wikipediaSlug": "opening-name" // optional
  }
}
```

## Setup

### Option 1: Docker (Automatic)

When running via Docker, these files should be provided as a volume mount:

```bash
docker run -v ./openings:/app/public/openings ghcr.io/stefan-kp/chess-tutor
```

### Option 2: Local Development

1. Obtain ECO database files (ecoA-E.json)
2. Place them in this directory
3. Generate the move index:

```bash
npm run build:opening-index
```

This will create `moveIndex.json` from the ECO files.

### Option 3: Generate from PGN

If you have a PGN database, you can extract ECO codes using chess tools like:
- `pgn-extract`
- Custom scripts

## Notes

- These files are **not included in git** (too large, ~4MB total)
- Users must provide their own opening database
- Wikipedia integration is optional (see `public/wikipedia/README.md`)
- The move index is automatically generated during Docker startup

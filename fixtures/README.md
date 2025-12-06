# Tactical and Gambit Fixture Sets

This directory collects JSON fixtures for automated regression tests and training data generation.
Each file contains narrowly scoped cases for a single tactical motif or gambit family so that Jest
or other tooling can load them directly without hard-coding FEN strings in test suites.

## File naming
- `tactics/<pattern>.json` – Examples for one tactical motif. Each file follows the same schema.
- `gambits.json` – Openings that should be recognised by move-sequence matching.

## Common schema
Every tactical case shares the following shape:

```json
{
  "patternType": "PIN",
  "description": "Short explanation of the motif and what the move achieves.",
  "cases": [
    {
      "id": "unique-string",
      "initialFen": "...",
      "sideToMove": "white",
      "bestMove": { "san": "Bb5", "uci": "f1b5" },
      "resultingFen": "...",
      "expectedPattern": {
        "type": "PIN",
        "side": "white",
        "attackerSquares": ["b5"],
        "targetSquares": ["c6"],
        "keySquares": ["e8"],
        "explanationKey": "pin_to_king"
      },
      "context": "Optional PGN fragment or free-text rationale.",
      "tags": ["opening", "classical"]
    }
  ]
}
```

This layout aligns with the `TacticalPattern` interface defined in the library contract and keeps
enough metadata for round-trip testing: the move that produces the tactic, the resulting position,
and the expected pattern payload.

## Using the fixtures in tests
- Load the JSON files and iterate through `cases` to drive `detectTactics`,
  `findTacticalOpportunitiesForSide`, or higher-level exercise generators.
- The `initialFen` represents the position **before** the critical move is played.
- Apply `bestMove` to reach `resultingFen`, then assert that the reported pattern matches
  `expectedPattern`.

## Adding more cases
When adding new fixtures, prefer minimal positions that isolate the intended motif so failures
are easy to debug. Include a short `context` note so the scenario can be recreated or visualised
quickly when a test fails.

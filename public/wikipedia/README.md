# Wikipedia Opening Cache

This directory contains cached Wikipedia article summaries for chess openings.

## What is this?

The Wikipedia cache provides educational context about chess openings:
- Article summaries
- Opening history
- Strategic ideas
- Notable games

## Automatic Setup (Docker)

When running via Docker, Wikipedia data is **automatically fetched** on first startup:

```bash
docker-compose up
# Will fetch Wikipedia data on first run
# Cached for subsequent runs
```

The Docker entrypoint script (`scripts/docker-entrypoint.sh`) handles:
1. Fetching Wikipedia articles for all openings
2. Sanitizing/formatting the data
3. Linking Wikipedia slugs to opening database

## Manual Setup (Development)

```bash
# Fetch Wikipedia articles
npm run cache:wikipedia

# Update opening database with Wikipedia slugs
npm run update:wikipedia-slugs
```

## Cache Invalidation

To refresh Wikipedia data:

```bash
rm public/wikipedia/*.json
docker-compose restart
# Or: npm run cache:wikipedia
```

## Notes

- Files are **not committed to git** (generated at runtime)
- Wikipedia API has rate limits (be patient)
- Wikipedia content is optional (app works without it)
- `.initialized` marker prevents re-fetching on every startup

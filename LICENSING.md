# Licensing Strategy

## Overview

This project uses a **dual licensing approach** based on how the software is built and distributed:

### GPL-3.0 License (Web Version)

The **web version** of Chess Tutor includes Stockfish.js, which is licensed under GPL-3.0. Therefore:

- Source code: **GPL-3.0**
- Web builds (using `LocalEngine`): **GPL-3.0**
- Any distribution that includes Stockfish.js: **GPL-3.0**

Users can:
- Use the web version for free
- Bring their own API keys (Gemini)
- Run locally with client-side Stockfish

### Proprietary License (Mobile Version)

The **mobile version** (iOS/Android) does NOT bundle Stockfish.js. Instead, it uses:

- `RemoteEngine` - Makes API calls to a hosted server for chess analysis
- No GPL code is included in the mobile build
- Static export with API-only architecture

Therefore, the mobile app can be distributed under a **proprietary license**:
- Sold on App Store / Google Play
- Uses hosted API service
- No GPL restrictions apply

## How This Works

### Code Architecture

```typescript
// Engine abstraction allows swapping implementations
export interface ChessEngine {
  evaluate(fen: string, depth?: number): Promise<EngineEvaluation>;
  terminate(): void;
}

// GPL-licensed (web only)
class LocalEngine implements ChessEngine {
  // Uses stockfish.js in browser
}

// No GPL dependencies (mobile)
class RemoteEngine implements ChessEngine {
  // Calls API server
}
```

### Build Configuration

**Web Build** (`npm run build`):
- Output: `output: 'standalone'` (Next.js server)
- Includes: API routes with Stockfish
- Engine: `LocalEngine` (GPL)
- License: **GPL-3.0**

**Mobile Build** (`npm run build:mobile`):
- Output: `output: 'export'` (static HTML/JS)
- Excludes: API routes (temporarily removed during build)
- Engine: `RemoteEngine` (proprietary)
- License: **Proprietary**

## Legal Compliance

### GPL Compliance (Web)

The web version complies with GPL-3.0:
- ✅ Source code is available
- ✅ GPL license is included
- ✅ Users can modify and redistribute
- ✅ Users bring their own API keys (no lock-in)

### Mobile Compliance

The mobile version is NOT a derivative work of GPL code:
- ✅ No Stockfish.js included in build
- ✅ Uses network API calls (not linking)
- ✅ Can be licensed separately
- ✅ Users pay for hosted service

## File Structure

```
chess_tutor/
├── LICENSE              # GPL-3.0 (for source code and web)
├── LICENSING.md        # This file (dual licensing explanation)
├── src/
│   └── lib/
│       ├── stockfish.ts         # GPL-licensed (web only)
│       └── engine/
│           ├── LocalEngine.ts   # GPL-licensed (web only)
│           └── RemoteEngine.ts  # Proprietary (mobile)
├── public/              # Generated data (not in git)
│   ├── openings/*.json  # Fetched at Docker startup
│   └── wikipedia/*.json # Fetched at Docker startup
└── scripts/
    ├── docker-entrypoint.sh     # Fetches data on startup
    └── build-mobile.sh          # Excludes GPL code
```

## Developer Guidelines

### Contributing

All contributions to the source code repository are subject to **GPL-3.0**.

### Building for Web

```bash
npm run build
npm start
# GPL-3.0 applies
```

### Building for Mobile

```bash
npm run build:mobile
# Proprietary license can apply (no GPL code included)
```

### Deploying

**Web Deployment:**
- Must comply with GPL-3.0
- Must provide source code
- Can be self-hosted for free

**Mobile App Store:**
- Uses proprietary license
- Connects to hosted API
- Paid app model allowed

## Questions?

- **Web version**: GPL-3.0 applies because Stockfish.js is included
- **Mobile version**: Proprietary license allowed because no GPL code is bundled
- **Source code**: GPL-3.0 (contains GPL integration code)

This approach allows:
- ✅ Free web version (GPL-compliant)
- ✅ Paid mobile app (proprietary)
- ✅ Single codebase
- ✅ Legal compliance

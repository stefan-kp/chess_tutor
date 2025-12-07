# Licensing Strategy

## Copyright Notice

Copyright (c) 2024 Stefan (stefan-kp)

All rights reserved. See license terms below.

## Overview

This project uses a **dual licensing approach** where the copyright holder retains all rights to distribute under multiple licenses:

- **Source code repository**: GPL-3.0 (open source)
- **Mobile app distributions**: Proprietary (copyright holder only)

**Important:** Only the copyright holder (Stefan/stefan-kp) has the right to distribute this software under a proprietary license. All other parties must comply with GPL-3.0 terms.

### GPL-3.0 License (Web Version)

The **web version** of Chess Tutor includes Stockfish.js, which is licensed under GPL-3.0. Therefore:

- Source code: **GPL-3.0**
- Web builds (using `LocalEngine`): **GPL-3.0**
- Any distribution that includes Stockfish.js: **GPL-3.0**

Users can:
- Use the web version for free
- Bring their own API keys (Gemini)
- Run locally with client-side Stockfish

### Proprietary License (Mobile Version - Copyright Holder Only)

The **copyright holder of the mobile app code using Capacitor** (KaProblem/https://www.kaproblem.com/Github stefan-kp) may distribute mobile versions (iOS/Android) under a proprietary license because these builds do NOT bundle Stockfish.js. Instead, they use:

- `RemoteEngine` - Makes API calls to a hosted server for chess analysis
- No GPL code is included in the mobile build
- Static export with API-only architecture

The copyright holder may distribute mobile apps under a **proprietary license**:
- Sold on App Store / Google Play
- Uses hosted API service
- No GPL restrictions apply to copyright holder's builds

**Third parties CANNOT do this.** If you fork this project, you MUST distribute all versions (including mobile) under GPL-3.0 or obtain explicit permission from the copyright holder.

## Why This Dual Licensing Approach?

### App Store Restrictions on GPL Software

Apple's App Store and Google Play Store have terms that are **incompatible with GPL-3.0**:

**App Store Issues:**
- GPL requires users to have the right to modify and redistribute software
- App Store's DRM and closed distribution model restricts this
- Apple's developer agreements conflict with GPL's freedom requirements
- FSF (Free Software Foundation) considers App Store distribution a GPL violation

**Google Play Issues:**
- Similar restrictions on modification and redistribution
- Signed APKs with locked keys conflict with GPL freedoms
- Platform terms impose additional restrictions beyond GPL

**Therefore:**
- We CANNOT distribute GPL-licensed apps on App Store/Google Play
- Mobile builds MUST use a proprietary license
- We achieve this by NOT including GPL code (Stockfish.js) in mobile builds
- Mobile apps use `RemoteEngine` (API calls) instead of `LocalEngine` (GPL)

This is why the dual licensing approach is **necessary**, not just optional.

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

### GPL Compliance (Web & Third Party Distributions)

All distributions of this software (by anyone other than the copyright holder) must comply with GPL-3.0:
- ✅ Source code must be available
- ✅ GPL license must be included
- ✅ Modifications must be GPL-3.0
- ✅ This includes mobile app builds by third parties

### Copyright Holder's Proprietary Mobile License

Only the copyright holder can distribute mobile versions under proprietary terms because:
- ✅ Copyright holder owns all rights to the code
- ✅ No Stockfish.js included in mobile builds (no GPL dependency)
- ✅ Uses network API calls (not GPL linking)
- ✅ Dual licensing is a copyright holder's privilege

### Why This Works Legally

**Dual licensing** is only available to the copyright holder:
- The copyright holder wrote or received contributions to the code
- The copyright holder can license their work under ANY terms they choose
- Third parties receive the code under GPL-3.0 and must comply with those terms
- Third parties cannot "strip out" GPL code to make proprietary builds (license violation)
- Only the original author can grant proprietary licenses

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

By contributing to this repository, you agree that:
1. Your contributions are licensed under **GPL-3.0**
2. You grant the copyright holder (Stefan/stefan-kp) the right to use your contributions under any license, including proprietary licenses
3. This allows the copyright holder to include contributions in proprietary mobile builds

All contributions to the source code repository are subject to **GPL-3.0** for public use.

### Third Party Use

If you fork this project:
- ✅ You MAY use it under GPL-3.0 terms
- ✅ You MAY distribute web versions (GPL-3.0)
- ✅ You MAY modify and redistribute (GPL-3.0)
- ❌ You CANNOT distribute proprietary mobile apps
- ❌ You CANNOT remove GPL requirements
- ❌ You CANNOT claim copyright holder privileges

Any mobile app you build from this code MUST be distributed under GPL-3.0.

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

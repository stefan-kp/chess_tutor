# Chess Tutor Project Instructions

## Tech Stack
- **Framework:** Next.js (React 19)
- **Language:** TypeScript
- **Styling:** Tailwind CSS (v4)
- **Engine:** Stockfish.js
- **AI/LLM:** Google Generative AI (@google/generative-ai)
- **Native:** Capacitor (iOS/Android)

## Development Workflow
- **Package Manager:** npm
- **Testing:**
  - Unit/Component: Jest (`npm test`)
  - E2E: Playwright (`npm run test:e2e`)
- **TDD:** Prefer writing tests before implementation.
- **Documentation:** Maintain `README.md` and `docs/` for architecture and feature requirements.

## Key Directories
- `src/app`: Next.js pages and API routes
- `src/components`: UI components
- `src/lib`: Core logic (chess engine, analysis, tactics)
- `docs`: Technical specifications and API documentation
- `scripts`: Maintenance and build scripts

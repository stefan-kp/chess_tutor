# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.0] - 2025-12-08

### Added
- **Opening Training Mode**: Interactive opening trainer with AI tutor guidance
  - Practice chess openings with real-time feedback
  - 12,379 openings from comprehensive ECO database
  - Wikipedia integration for opening history and context
  - Deviation detection with three action options:
    - Continue Playing (transitions to game mode)
    - Undo & Return to Opening
    - Explore This Variation
  - Session persistence with resume capability
  - Move navigation and history
  - Automatic opponent moves following theory
  - Tutor message guardrail to prevent rapid-fire messages

- **Tactical Practice Mode**: Pattern-based puzzle training
  - 8 tactical patterns: Pin, Fork, Skewer, Discovered Check, Double Attack, Overloading, Back Rank Weakness, Trapped Piece
  - 20+ puzzles per pattern from Lichess database
  - Real-time feedback and scoring
  - Streak tracking

- **Game Mode Improvements**:
  - Opening context awareness when transitioning from trainer
  - Automatic computer move detection for custom positions
  - Enhanced tutor greetings with opening context

- **Mobile Support**:
  - Capacitor integration for iOS/Android apps
  - Mobile-optimized UI
  - Build scripts for mobile deployment

- **API Enhancements**:
  - Wikipedia summary endpoint
  - Opening explanation endpoint
  - Enhanced error handling with user-friendly messages

- **Developer Experience**:
  - E2E test suite with Playwright
  - Test fixtures for opening data
  - Unit tests for opening trainer modules
  - Improved build scripts with safety checks

### Changed
- Tutor now maintains dual role (opponent + coach) more consistently
- Chat interface improved with better context awareness
- Opening database now properly versioned and restored
- Test configuration updated for new features

### Fixed
- Opening database accidentally overwritten by test fixtures (restored 12,379 entries)
- Computer move timing in custom positions
- Tutor message frequency and flow control
- Game transition from opening trainer

## [1.0.0] - 2024-11-27

### Added
- Initial release with core chess tutor functionality
- Stockfish chess engine integration
- 9 AI coach personalities
- Real-time move analysis
- Tactical opportunity detection
- Post-game analysis
- Multi-language support (EN, DE, FR, IT, PL)
- PGN/FEN import and export
- Game save and resume
- Docker deployment with auto-builds
- API endpoints for external integration

### Licensing
- Dual licensing strategy implemented:
  - GPL-3.0 for source code
  - Proprietary licensing for mobile apps (App Store compliance)
- See [LICENSING.md](LICENSING.md) and [COPYRIGHT](COPYRIGHT) for details

[Unreleased]: https://github.com/stefan-kp/chess_tutor/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/stefan-kp/chess_tutor/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/stefan-kp/chess_tutor/releases/tag/v1.0.0

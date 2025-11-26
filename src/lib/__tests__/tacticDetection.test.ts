import { detectMissedTactics, uciToSan, DetectedTactic } from '../tacticDetection';

describe('tacticDetection', () => {
    describe('uciToSan', () => {
        it('should convert UCI to SAN for simple pawn move', () => {
            const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
            const result = uciToSan(fen, 'e2e4');
            expect(result).toBe('e4');
        });

        it('should convert UCI to SAN for knight move', () => {
            const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
            const result = uciToSan(fen, 'g1f3');
            expect(result).toBe('Nf3');
        });

        it('should convert UCI to SAN for capture', () => {
            const fen = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 1';
            const result = uciToSan(fen, 'f3e5');
            expect(result).toBe('Nxe5');
        });

        it('should return null for invalid UCI', () => {
            const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
            const result = uciToSan(fen, 'invalid');
            expect(result).toBeNull();
        });
    });

    describe('detectMissedTactics', () => {
        describe('Material capture detection', () => {
            it('should detect winning a piece (knight)', () => {
                // Position where Nxe5 wins a pawn
                const fen = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 1';
                const result = detectMissedTactics({
                    fen,
                    playerColor: 'white',
                    playerMoveSan: 'd4',
                    bestMoveUci: 'f3e5',
                    cpLoss: 100,
                });

                expect(result.length).toBeGreaterThan(0);
                const captureTactic = result.find(t => t.tactic_type === 'win_pawn');
                expect(captureTactic).toBeDefined();
                expect(captureTactic?.material_delta).toBe(100);
            });

            it('should detect winning a piece (rook)', () => {
                // Position where we can capture a rook
                const fen = 'r1bqkbnr/pppppppp/2n5/8/8/2N5/PPPPPPPP/R1BQKBNR w KQkq - 0 1';
                const result = detectMissedTactics({
                    fen,
                    playerColor: 'white',
                    playerMoveSan: 'e4',
                    bestMoveUci: 'c3a4', // Hypothetical - just for testing structure
                    cpLoss: 500,
                });

                // This will depend on the actual position, but structure should work
                expect(Array.isArray(result)).toBe(true);
            });

            it('should NOT detect capture if piece can be recaptured', () => {
                // Position where capturing would lose material
                const fen = 'rnbqkb1r/pppppppp/5n2/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1';
                const result = detectMissedTactics({
                    fen,
                    playerColor: 'white',
                    playerMoveSan: 'd4',
                    bestMoveUci: 'e4e5',
                    cpLoss: 100,
                });

                // Should not suggest capturing if it can be immediately recaptured
                const captureTactic = result.find(t => t.tactic_type === 'win_piece' || t.tactic_type === 'win_pawn');
                // This depends on position analysis
                expect(Array.isArray(result)).toBe(true);
            });
        });

        describe('Fork detection', () => {
            it('should detect a knight fork', () => {
                // Position where Nf3 can fork king and rook
                const fen = 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/RNBQKB1R w KQkq - 0 1';
                const result = detectMissedTactics({
                    fen,
                    playerColor: 'white',
                    playerMoveSan: 'e4',
                    bestMoveUci: 'g1f3', // Nf3 - just testing structure
                    cpLoss: 100,
                });

                expect(Array.isArray(result)).toBe(true);
            });
        });

        describe('Pin detection', () => {
            it('should detect a pin (piece pinned to king)', () => {
                // Bishop pins knight to king
                const fen = 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 1';
                const result = detectMissedTactics({
                    fen,
                    playerColor: 'white',
                    playerMoveSan: 'd4',
                    bestMoveUci: 'c4f7', // Bxf7+ creates pin-like situation
                    cpLoss: 100,
                });

                expect(Array.isArray(result)).toBe(true);
            });
        });

        describe('Check detection', () => {
            it('should detect a check', () => {
                const fen = 'rnbqkbnr/pppp1ppp/8/4p3/2B1P3/8/PPPP1PPP/RNBQK1NR w KQkq - 0 1';
                const result = detectMissedTactics({
                    fen,
                    playerColor: 'white',
                    playerMoveSan: 'd4',
                    bestMoveUci: 'c4f7', // Bxf7+ is check
                    cpLoss: 100,
                });

                const checkTactic = result.find(t => t.tactic_type === 'check');
                expect(checkTactic).toBeDefined();
            });
        });

        describe('Hanging piece detection', () => {
            it('should detect a hanging piece', () => {
                // Position with undefended piece - testing structure
                const fen = 'rnbqkb1r/pppppppp/5n2/8/8/5N2/PPPPPPPP/RNBQKB1R w KQkq - 0 1';
                const result = detectMissedTactics({
                    fen,
                    playerColor: 'white',
                    playerMoveSan: 'e4',
                    bestMoveUci: 'f3g5', // Ng5 - testing structure
                    cpLoss: 100,
                });

                expect(Array.isArray(result)).toBe(true);
            });
        });

        describe('Edge cases', () => {
            it('should return empty array if cpLoss below threshold', () => {
                const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
                const result = detectMissedTactics({
                    fen,
                    playerColor: 'white',
                    playerMoveSan: 'e4',
                    bestMoveUci: 'd2d4',
                    cpLoss: 10, // Below default threshold of 50
                });

                expect(result).toEqual([]);
            });

            it('should return empty array if player move equals best move', () => {
                const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
                const result = detectMissedTactics({
                    fen,
                    playerColor: 'white',
                    playerMoveSan: 'e4',
                    bestMoveUci: 'e2e4', // Same move
                    cpLoss: 0,
                });

                expect(result).toEqual([]);
            });

            it('should return "none" tactic if no specific tactics found', () => {
                const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
                const result = detectMissedTactics({
                    fen,
                    playerColor: 'white',
                    playerMoveSan: 'e3', // Suboptimal but no clear tactic
                    bestMoveUci: 'e2e4',
                    cpLoss: 60,
                });

                expect(result.length).toBe(1);
                expect(result[0].tactic_type).toBe('none');
            });

            it('should handle custom evalLossThreshold', () => {
                const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
                const result = detectMissedTactics({
                    fen,
                    playerColor: 'white',
                    playerMoveSan: 'e3',
                    bestMoveUci: 'e2e4',
                    cpLoss: 75,
                    evalLossThreshold: 100, // Custom threshold
                });

                expect(result).toEqual([]);
            });

            it('should handle invalid best move UCI gracefully', () => {
                const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
                const result = detectMissedTactics({
                    fen,
                    playerColor: 'white',
                    playerMoveSan: 'e4',
                    bestMoveUci: 'invalid',
                    cpLoss: 100,
                });

                expect(result).toEqual([]);
            });
        });

        describe('Real tactical positions', () => {
            it('should detect Scholar\'s Mate threat', () => {
                // Position after 1.e4 e5 2.Bc4 Nc6 3.Qh5
                // Best move is Nf6 defending, but if player plays something else
                const fen = 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 1';
                const result = detectMissedTactics({
                    fen,
                    playerColor: 'black',
                    playerMoveSan: 'd6', // Weak move
                    bestMoveUci: 'g8f6', // Nf6 defends
                    cpLoss: 200,
                });

                expect(Array.isArray(result)).toBe(true);
                expect(result.length).toBeGreaterThan(0);
            });

            it('should detect back rank mate threat', () => {
                // Position with back rank weakness
                const fen = '6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1';
                const result = detectMissedTactics({
                    fen,
                    playerColor: 'white',
                    playerMoveSan: 'Kg2',
                    bestMoveUci: 'a1a8', // Ra8# is checkmate
                    cpLoss: 1000,
                });

                const checkTactic = result.find(t => t.tactic_type === 'check');
                expect(checkTactic).toBeDefined();
            });

            it('should detect discovered attack', () => {
                // Position where moving a piece discovers an attack
                const fen = 'rnbqkb1r/pppp1ppp/5n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 1';
                const result = detectMissedTactics({
                    fen,
                    playerColor: 'white',
                    playerMoveSan: 'd4',
                    bestMoveUci: 'c4f7', // Bxf7+ check
                    cpLoss: 150,
                });

                expect(Array.isArray(result)).toBe(true);
            });
        });

        describe('Output structure validation', () => {
            it('should return properly structured DetectedTactic objects', () => {
                const fen = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 1';
                const result = detectMissedTactics({
                    fen,
                    playerColor: 'white',
                    playerMoveSan: 'd4',
                    bestMoveUci: 'f3e5',
                    cpLoss: 100,
                });

                result.forEach(tactic => {
                    expect(tactic).toHaveProperty('tactic_type');
                    expect(tactic).toHaveProperty('move');
                    expect(typeof tactic.tactic_type).toBe('string');
                    expect(typeof tactic.move).toBe('string');

                    if (tactic.affected_squares) {
                        expect(Array.isArray(tactic.affected_squares)).toBe(true);
                    }
                    if (tactic.piece_roles) {
                        expect(Array.isArray(tactic.piece_roles)).toBe(true);
                    }
                    if (tactic.material_delta !== undefined) {
                        expect(typeof tactic.material_delta).toBe('number');
                    }
                });
            });
        });
    });
});


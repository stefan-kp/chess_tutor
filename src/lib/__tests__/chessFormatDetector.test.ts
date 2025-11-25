import { detectChessFormat, parseChessNotation } from '../chessFormatDetector';

describe('chessFormatDetector', () => {
    describe('detectChessFormat', () => {
        describe('FEN detection', () => {
            it('should detect standard starting position FEN', () => {
                const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
                expect(detectChessFormat(fen)).toBe('fen');
            });

            it('should detect FEN with different position', () => {
                const fen = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';
                expect(detectChessFormat(fen)).toBe('fen');
            });

            it('should detect FEN with black to move', () => {
                const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
                expect(detectChessFormat(fen)).toBe('fen');
            });

            it('should detect FEN with no castling rights', () => {
                const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w - - 0 1';
                expect(detectChessFormat(fen)).toBe('fen');
            });

            it('should detect FEN with partial castling rights', () => {
                const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w Kq - 0 1';
                expect(detectChessFormat(fen)).toBe('fen');
            });
        });

        describe('PGN detection', () => {
            it('should detect PGN with headers', () => {
                const pgn = `[Event "Casual Game"]
[Site "Chess Tutor"]
[Date "2024.01.15"]
[White "Player"]
[Black "Stockfish"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 1-0`;
                expect(detectChessFormat(pgn)).toBe('pgn');
            });

            it('should detect PGN with only moves (no headers)', () => {
                const pgn = '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6';
                expect(detectChessFormat(pgn)).toBe('pgn');
            });

            it('should detect PGN with castling moves', () => {
                const pgn = '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. O-O';
                expect(detectChessFormat(pgn)).toBe('pgn');
            });

            it('should detect PGN with long game', () => {
                const pgn = '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 6. Be3 e5 7. Nb3 Be6 8. f3 Be7 9. Qd2 O-O 10. O-O-O';
                expect(detectChessFormat(pgn)).toBe('pgn');
            });

            it('should detect PGN with only headers', () => {
                const pgn = `[Event "Test"]
[White "Player"]
[Black "Computer"]`;
                expect(detectChessFormat(pgn)).toBe('pgn');
            });
        });

        describe('Invalid input detection', () => {
            it('should detect empty string as invalid', () => {
                expect(detectChessFormat('')).toBe('invalid');
            });

            it('should detect whitespace-only string as invalid', () => {
                expect(detectChessFormat('   \n  \t  ')).toBe('invalid');
            });

            it('should detect random text as invalid', () => {
                expect(detectChessFormat('this is not chess notation')).toBe('invalid');
            });

            it('should detect incomplete FEN as invalid', () => {
                expect(detectChessFormat('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR')).toBe('invalid');
            });

            it('should detect FEN with wrong number of slashes as invalid', () => {
                expect(detectChessFormat('rnbqkbnr/pppppppp/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')).toBe('invalid');
            });

            it('should detect FEN with invalid turn indicator as invalid', () => {
                expect(detectChessFormat('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR x KQkq - 0 1')).toBe('invalid');
            });
        });
    });

    describe('parseChessNotation', () => {
        it('should parse valid FEN', () => {
            const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
            const result = parseChessNotation(fen);
            expect(result).toEqual({
                format: 'fen',
                notation: fen
            });
        });

        it('should parse valid PGN', () => {
            const pgn = '1. e4 e5 2. Nf3 Nc6';
            const result = parseChessNotation(pgn);
            expect(result).toEqual({
                format: 'pgn',
                notation: pgn
            });
        });

        it('should return null for invalid input', () => {
            const result = parseChessNotation('invalid chess notation');
            expect(result).toBeNull();
        });

        it('should trim whitespace', () => {
            const fen = '  rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1  ';
            const result = parseChessNotation(fen);
            expect(result?.notation).toBe(fen.trim());
        });
    });
});


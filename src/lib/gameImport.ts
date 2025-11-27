/**
 * Game Import API Integration
 * 
 * Fetches chess games from Chess.com and Lichess public APIs
 * Both APIs are free and require no authentication for public games
 */

import { Chess } from 'chess.js';

export type Platform = 'chesscom' | 'lichess';

export interface GameMetadata {
    id: string;
    platform: Platform;
    white: string;
    black: string;
    result: string; // "1-0", "0-1", "1/2-1/2"
    date: string; // ISO date string
    timeControl: string;
    opening?: string;
    pgn: string;
    finalFen: string; // For thumbnail display
    url?: string; // Link to game on platform
}

/**
 * Fetch games from Chess.com
 * Uses the Published-Data API (PubAPI) - no authentication required
 * 
 * @param username - Chess.com username
 * @param maxGames - Maximum number of games to fetch (default: 20)
 * @returns Array of game metadata
 */
export async function fetchChessComGames(
    username: string,
    maxGames: number = 20
): Promise<GameMetadata[]> {
    try {
        // Step 1: Get list of available archives
        const archivesResponse = await fetch(
            `https://api.chess.com/pub/player/${username}/games/archives`,
            {
                headers: {
                    'User-Agent': 'ChessTutor/1.0 (Educational App)'
                }
            }
        );

        if (!archivesResponse.ok) {
            throw new Error(`Chess.com API error: ${archivesResponse.status}`);
        }

        const archivesData = await archivesResponse.json();
        const archives: string[] = archivesData.archives || [];

        if (archives.length === 0) {
            return [];
        }

        // Step 2: Fetch games from most recent archives until we have enough
        const games: GameMetadata[] = [];
        
        // Start from most recent archive
        for (let i = archives.length - 1; i >= 0 && games.length < maxGames; i--) {
            const archiveUrl = archives[i];
            const gamesResponse = await fetch(archiveUrl, {
                headers: {
                    'User-Agent': 'ChessTutor/1.0 (Educational App)'
                }
            });

            if (!gamesResponse.ok) continue;

            const gamesData = await gamesResponse.json();
            const archiveGames = gamesData.games || [];

            // Process games in reverse order (most recent first)
            for (let j = archiveGames.length - 1; j >= 0 && games.length < maxGames; j--) {
                const game = archiveGames[j];
                
                try {
                    const metadata = parseChessComGame(game);
                    games.push(metadata);
                } catch (e) {
                    console.warn('Failed to parse Chess.com game:', e);
                }
            }
        }

        return games;
    } catch (error) {
        console.error('Error fetching Chess.com games:', error);
        throw error;
    }
}

/**
 * Parse a Chess.com game object into our GameMetadata format
 */
function parseChessComGame(game: any): GameMetadata {
    const pgn = game.pgn;
    const chess = new Chess();
    chess.loadPgn(pgn);
    
    // Extract metadata from PGN headers
    const headers = chess.header();
    
    return {
        id: game.uuid || game.url,
        platform: 'chesscom',
        white: game.white.username || headers.White || 'Unknown',
        black: game.black.username || headers.Black || 'Unknown',
        result: headers.Result || '*',
        date: formatChessComDate(game.end_time),
        timeControl: game.time_class || headers.TimeControl || 'Unknown',
        opening: headers.ECO ? `${headers.ECO}: ${headers.ECOUrl?.split('/').pop()?.replace(/-/g, ' ')}` : undefined,
        pgn: pgn,
        finalFen: chess.fen(),
        url: game.url
    };
}

/**
 * Format Chess.com timestamp to ISO date string
 */
function formatChessComDate(timestamp: number): string {
    return new Date(timestamp * 1000).toISOString();
}

/**
 * Fetch games from Lichess
 * Uses the Lichess API - no authentication required for public games
 * 
 * @param username - Lichess username
 * @param maxGames - Maximum number of games to fetch (default: 20)
 * @returns Array of game metadata
 */
export async function fetchLichessGames(
    username: string,
    maxGames: number = 20
): Promise<GameMetadata[]> {
    try {
        const response = await fetch(
            `https://lichess.org/api/games/user/${username}?max=${maxGames}&pgnInJson=true&clocks=false&evals=false&opening=true`,
            {
                headers: {
                    'Accept': 'application/x-ndjson',
                    'User-Agent': 'ChessTutor/1.0 (Educational App)'
                }
            }
        );

        if (!response.ok) {
            throw new Error(`Lichess API error: ${response.status}`);
        }

        const text = await response.text();
        const lines = text.trim().split('\n');
        const games: GameMetadata[] = [];

        for (const line of lines) {
            if (!line.trim()) continue;
            
            try {
                const game = JSON.parse(line);
                const metadata = parseLichessGame(game);
                games.push(metadata);
            } catch (e) {
                console.warn('Failed to parse Lichess game:', e);
            }
        }

        return games;
    } catch (error) {
        console.error('Error fetching Lichess games:', error);
        throw error;
    }
}

/**
 * Parse a Lichess game object into our GameMetadata format
 */
function parseLichessGame(game: any): GameMetadata {
    const pgn = game.pgn;
    const chess = new Chess();
    chess.loadPgn(pgn);
    
    const players = game.players || {};
    const opening = game.opening;
    
    return {
        id: game.id,
        platform: 'lichess',
        white: players.white?.user?.name || 'Unknown',
        black: players.black?.user?.name || 'Unknown',
        result: game.status === 'draw' ? '1/2-1/2' : game.winner === 'white' ? '1-0' : game.winner === 'black' ? '0-1' : '*',
        date: new Date(game.createdAt).toISOString(),
        timeControl: game.speed || 'Unknown',
        opening: opening ? `${opening.eco}: ${opening.name}` : undefined,
        pgn: pgn,
        finalFen: chess.fen(),
        url: `https://lichess.org/${game.id}`
    };
}


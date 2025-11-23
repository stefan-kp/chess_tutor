import ecoA from '../../public/openings/ecoA.json';
import ecoB from '../../public/openings/ecoB.json';
import ecoC from '../../public/openings/ecoC.json';
import ecoD from '../../public/openings/ecoD.json';
import ecoE from '../../public/openings/ecoE.json';

export interface OpeningMetadata {
    src: string;
    eco: string;
    moves: string;
    name: string;
    aliases?: { [key: string]: string };
    meta?: {
        strengths_white?: string[];
        weaknesses_white?: string[];
        strengths_black?: string[];
        weaknesses_black?: string[];
    };
}

// Merge all ECO databases into one lookup object
const openingsData = {
    ...ecoA,
    ...ecoB,
    ...ecoC,
    ...ecoD,
    ...ecoE
} as Record<string, OpeningMetadata>;

export function lookupOpening(fen: string): OpeningMetadata | null {
    // The keys in the JSON are exact FEN strings.
    if (openingsData[fen]) {
        return openingsData[fen];
    }
    return null;
}

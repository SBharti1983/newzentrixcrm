export type AccentType = 'neutral' | 'north_indian' | 'south_indian' | 'western';

export class AccentDetector {
    static detectAccent(text: string): AccentType {
        const cleaned = text.toLowerCase().trim();

        // Heuristic checks for lexical signals of regional accents
        if (cleaned.includes('anna') || (cleaned.includes('sir') && cleaned.includes('please') && cleaned.includes('tell'))) {
            return 'south_indian';
        }
        if (cleaned.includes('bhaiya') || cleaned.includes('yaar') || cleaned.includes('kiya') || cleaned.includes('hai na')) {
            return 'north_indian';
        }

        return 'neutral';
    }
}

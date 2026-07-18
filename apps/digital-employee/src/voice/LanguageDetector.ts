import { SupportedLanguage } from '@zentrix/types';

export class LanguageDetector {
    static detectLanguage(text: string): SupportedLanguage {
        const cleaned = text.toLowerCase().trim();
        if (!cleaned) return 'unknown';

        // Keywords for heuristics classification
        const englishKeywords = ['hello', 'project', 'pricing', 'details', 'budget', 'developer', 'sqft', 'location', 'call', 'interested'];
        const hindiKeywords = ['namaste', 'bhai', 'price', 'kitna', 'kya', 'hai', 'bataiye', 'milna', 'kab', 'dekhna', 'sakte', 'achha'];

        const englishCount = englishKeywords.filter(kw => cleaned.includes(kw)).length;
        const hindiCount = hindiKeywords.filter(kw => cleaned.includes(kw)).length;

        if (englishCount > 0 && hindiCount > 0) {
            return 'hinglish';
        }
        if (englishCount > hindiCount) {
            return 'english';
        }
        if (hindiCount > englishCount) {
            return 'hindi';
        }

        return 'hinglish'; // fallback default for India market context
    }
}

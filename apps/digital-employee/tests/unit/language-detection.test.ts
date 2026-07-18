import { describe, test, expect } from 'vitest';
import { LanguageDetector } from '../../src/voice/LanguageDetector';
import { AccentDetector } from '../../src/voice/AccentDetector';

describe('Language and Accent Detection Utilities', () => {
    test('detectLanguage classifies text patterns correctly', () => {
        expect(LanguageDetector.detectLanguage('hello project details')).toBe('english');
        expect(LanguageDetector.detectLanguage('price kitna hai bataiye')).toBe('hindi');
        expect(LanguageDetector.detectLanguage('hello budget kitna hai details')).toBe('hinglish');
    });

    test('detectAccent classifies regional accent patterns correctly', () => {
        expect(AccentDetector.detectAccent('please tell sir details')).toBe('south_indian');
        expect(AccentDetector.detectAccent('bhaiya plot dikhao')).toBe('north_indian');
        expect(AccentDetector.detectAccent('good morning')).toBe('neutral');
    });
});

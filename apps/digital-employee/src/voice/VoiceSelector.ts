import { DbAIEmployeePersona, SupportedLanguage } from '@zentrix/types';

export class VoiceSelector {
    static selectVoice(
        persona: DbAIEmployeePersona,
        language: SupportedLanguage
    ): string {
        const voiceConfig = persona.voice_config;

        if (language === 'english') {
            return voiceConfig.english_voice;
        }
        if (language === 'hindi') {
            return voiceConfig.hindi_voice;
        }
        if (language === 'hinglish') {
            return voiceConfig.code_mix_voice || voiceConfig.hindi_voice;
        }

        return voiceConfig.hindi_voice; // fallback default
    }
}

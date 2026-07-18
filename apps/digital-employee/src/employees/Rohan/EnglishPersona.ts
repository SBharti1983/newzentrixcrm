import { RohanPersonaEngine } from './Persona';
import { DbAIEmployeePersona, RohanContext } from '@zentrix/types';

export class RohanEnglishPersona extends RohanPersonaEngine {
    override buildSystemPrompt(
        persona: DbAIEmployeePersona,
        context: RohanContext,
        track: 'fast' | 'reasoning'
    ): string {
        const basePrompt = super.buildSystemPrompt(persona, context, track);
        return `${basePrompt}\n\n[INSTRUCTION]: Respond EXCLUSIVELY in clear, professional English. Do not use any Hindi or Hinglish vocabulary. Ensure your vocabulary, sentence structure, and tone represent a native English speaker.`;
    }
}

const rohanEnglishPersona = new RohanEnglishPersona();
export default rohanEnglishPersona;

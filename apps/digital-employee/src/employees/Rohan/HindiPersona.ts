import { RohanPersonaEngine } from './Persona';
import { DbAIEmployeePersona, RohanContext } from '@zentrix/types';

export class RohanHindiPersona extends RohanPersonaEngine {
    override buildSystemPrompt(
        persona: DbAIEmployeePersona,
        context: RohanContext,
        track: 'fast' | 'reasoning'
    ): string {
        const basePrompt = super.buildSystemPrompt(persona, context, track);
        return `${basePrompt}\n\n[INSTRUCTION]: Respond EXCLUSIVELY in pure, polite Hindi. Avoid using English phrases, except standard real estate terms like "site visit", "booking", "brochure", or project names.`;
    }
}

const rohanHindiPersona = new RohanHindiPersona();
export default rohanHindiPersona;

import { ModelRouter } from '../../ai/routing/ModelRouter';
import { DbAIEmployeePersona, RohanContext, ReasoningOutput } from '@zentrix/types';
import rohanPersonaEngine from '../../employees/Rohan/Persona';
import rohanEnglishPersona from '../../employees/Rohan/EnglishPersona';
import rohanHindiPersona from '../../employees/Rohan/HindiPersona';

export async function executeRohanReasoning(
    persona: DbAIEmployeePersona,
    context: RohanContext,
    userMessage: string,
    signal?: AbortSignal
): Promise<ReasoningOutput> {
    const lang = context.conversation_state.language_detected || 'hinglish';
    let engine = rohanPersonaEngine;
    if (lang === 'english') {
        engine = rohanEnglishPersona;
    } else if (lang === 'hindi') {
        engine = rohanHindiPersona;
    }

    const reasoningPrompt = engine.buildSystemPrompt(persona, context, 'reasoning');

    const reasoningRaw = await ModelRouter.generateResponse(
        `System Prompt:\n${reasoningPrompt}\n\nLead Message: ${userMessage}\n\nGenerate structured analysis JSON:`,
        true,
        'reasoning',
        signal
    );

    return reasoningRaw as ReasoningOutput;
}

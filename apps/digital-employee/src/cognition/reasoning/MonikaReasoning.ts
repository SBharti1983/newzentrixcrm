import { ModelRouter } from '../../ai/routing/ModelRouter';
import { DbAIEmployeePersona, MonikaContext, ReceptionistReasoningOutput } from '@zentrix/types';
import monikaPersonaEngine from '../../employees/Monika/Persona';

export async function executeMonikaReasoning(
    persona: DbAIEmployeePersona,
    context: MonikaContext,
    userMessage: string,
    signal?: AbortSignal
): Promise<ReceptionistReasoningOutput> {
    const reasoningPrompt = monikaPersonaEngine.buildSystemPrompt(persona, context, 'reasoning');

    const reasoningRaw = await ModelRouter.generateResponse(
        `System Prompt:\n${reasoningPrompt}\n\nCaller Message: ${userMessage}\n\nGenerate structured analysis JSON:`,
        true,
        'reasoning',
        signal
    );

    return reasoningRaw as ReceptionistReasoningOutput;
}

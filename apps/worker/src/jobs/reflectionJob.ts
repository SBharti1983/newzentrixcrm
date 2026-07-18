import { pool } from '@zentrix/database';
import { logger } from '@zentrix/logger';
import axios from 'axios';

export async function processReflectionJob(): Promise<void> {
    logger.info('[Reflection Job] Starting nightly self-reflection loop...');

    const apiKey = (process.env.GROQ_API_KEY || '').trim();
    if (!apiKey) {
        logger.warn('[Reflection Job] GROQ_API_KEY is not set. Bypassing reflection.');
        return;
    }

    try {
        // 1. Query low-rapport or objection call interactions from the past 24 hours, joined with their matching persona
        const { rows: badInteractions } = await pool.query(
            `SELECT i.id, i.tenant_id, i.lead_id, i.note, i.transcript, i.sentiment, i.rapport_score,
                    p.id AS persona_internal_id, p.employee_name
             FROM interactions i
             INNER JOIN ai_employee_personas p ON p.user_id = i.user_id
             WHERE i.type = 'Call' AND (i.rapport_score < 7 OR i.outcome = 'Objection Raised' OR i.sentiment = 'negative')
             ORDER BY i.created_at DESC
             LIMIT 10`
        );

        if (badInteractions.length === 0) {
            logger.info('[Reflection Job] No negative/low rapport call interactions flagged in the past 24 hours. Reflection complete.');
            return;
        }

        logger.info(`[Reflection Job] Found ${badInteractions.length} interactions requiring self-reflection.`);

        // Group interactions by persona_internal_id
        const personaInteractionsMap = new Map<string, typeof badInteractions>();
        for (const interaction of badInteractions) {
            const personaId = (interaction as any).persona_internal_id;
            if (!personaId) continue;
            const list = personaInteractionsMap.get(personaId) || [];
            list.push(interaction);
            personaInteractionsMap.set(personaId, list);
        }

        for (const [personaId, list] of personaInteractionsMap.entries()) {
            // 2. Load the specific active AI persona
            const { rows: personas } = await pool.query(
                `SELECT id, employee_name, knowledge_scope, persona_config
                 FROM ai_employee_personas
                 WHERE id = $1 AND is_active = TRUE`,
                [personaId]
            );

            const persona = personas[0];
            if (!persona) continue;

            const config = persona.persona_config || {};
            // Skip reflection if disabled on the dashboard
            if (config.reflectionEnabled === false) {
                logger.info(`[Reflection Job] Reflection disabled for agent "${persona.employee_name}". Skipping.`);
                continue;
            }

            // 3. Format transcripts for LLM analysis
            const transcriptsText = list
                .map((int, i) => `Call #${i + 1} (Rapport: ${int.rapport_score ?? 'N/A'}, Note: ${int.note || 'None'}):\n${int.transcript || 'No transcript available.'}`)
                .join('\n\n');

            const prompt = `You are a Senior AI Agent Coach. You are reviewing recent low-performance sales call transcripts of our AI agent ${persona.employee_name}.
Analyze the following call transcripts and summary notes to identify why the customer was disengaged or why the rapport score was low:

${transcriptsText}

Based on this analysis, generate ONE precise guideline or communication boundary instruction (maximum 2 sentences) to be appended to the agent's system prompt to prevent repeating these mistakes.
Examples of good guidelines:
- "Noida Sector 62 connectivity flyover is just 12 minutes away; highlight this early for location concerns."
- "Do not commit to price drops; emphasize transparency and prompt booking waivers via manager authorization."
- "Highlight RERA approval ID UPRERAPRJ9402 immediately for all legal and compliance validation questions."

Return a JSON object with a single key "guideline" containing your generated guideline:
{
  "guideline": string
}`;

            logger.info(`[Reflection Job] Calling Groq LLM for self-reflection analysis for agent "${persona.employee_name}"...`);

            const response = await axios.post(
                'https://api.groq.com/openai/v1/chat/completions',
                {
                    model: 'llama-3.3-70b-versatile',
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.3,
                    max_tokens: 512,
                    response_format: { type: 'json_object' },
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${apiKey}`,
                    },
                }
            );

            const content = response.data.choices[0].message.content.trim();
            const parsed = JSON.parse(content);
            const newGuideline = parsed?.guideline?.trim();

            if (!newGuideline) {
                logger.warn(`[Reflection Job] Empty guideline generated for agent "${persona.employee_name}". Skipping.`);
                continue;
            }

            logger.info(`[Reflection Job] Generated guideline: "${newGuideline}"`);

            // 4. Update knowledge scope guidelines dynamically in PostgreSQL database
            const currentScope = persona.knowledge_scope || {};
            const existingBoundaries = currentScope.boundaries || '';

            // Avoid duplicate guidelines insertions
            if (!existingBoundaries.includes(newGuideline)) {
                const updatedBoundaries = existingBoundaries
                    ? `${existingBoundaries}. Also, remember: ${newGuideline}`
                    : `Remember: ${newGuideline}`;

                const updatedScope = {
                    ...currentScope,
                    boundaries: updatedBoundaries,
                };

                await pool.query(
                    `UPDATE ai_employee_personas
                     SET knowledge_scope = $1, updated_at = NOW()
                     WHERE id = $2`,
                    [JSON.stringify(updatedScope), persona.id]
                );

                logger.info(`[Reflection Job] Refined prompt boundaries for "${persona.employee_name}" based on recent calls: "${newGuideline}"`);
            } else {
                logger.info(`[Reflection Job] AI persona "${persona.employee_name}" already possesses guideline matching this objection. Skipping update.`);
            }
        }

        logger.info('[Reflection Job] Nightly self-reflection loop completed successfully.');
    } catch (err: any) {
        logger.error(`[Reflection Job] Execution failed: ${err.message}`);
    }
}

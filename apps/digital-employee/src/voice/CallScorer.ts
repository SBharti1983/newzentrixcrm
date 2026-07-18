import { pool } from '@zentrix/database';
import { logger } from '@zentrix/logger';
import { generateAIResponse } from '../ai/AIService';

export interface CallTurn {
    role: 'user' | 'agent';
    text: string;
    timestamp: number;
}

export class CallScorer {
    static async scoreCall(
        tenantId: string,
        leadId: string | undefined,
        personaId: string,
        turns: CallTurn[],
        durationSeconds: number
    ): Promise<void> {
        if (!turns || turns.length === 0) {
            logger.info('[CallScorer] Empty session turns. Skipping scoring.');
            return;
        }

        logger.info(`[CallScorer] Starting asynchronous call scoring for tenant=${tenantId}, lead=${leadId || 'none'}, persona=${personaId}`);

        try {
            // 1. Format the transcript
            const transcript = turns
                .map((t) => `${t.role === 'user' ? 'Customer' : 'Rohan'}: ${t.text}`)
                .join('\n');

            // 2. Query LLM to evaluate metrics
            const prompt = `You are an AI sales call quality auditor. Score the following call transcript between our sales associate and a prospect:

Transcript:
${transcript}

Score the call on the following metrics:
1. outcome: The final call status/result (must be one of: 'Booked Site Visit', 'Objection Raised', 'Connected', 'Disengaged')
2. sentiment: Overall caller sentiment (must be one of: 'positive', 'neutral', 'negative')
3. rapport_score: Integer rating from 1 to 10 of how well the agent built rapport with the customer.
4. closing_score: Integer rating from 1 to 10 of how effectively the agent attempted to guide the call to the next step.
5. projects_discussed: An array of project names discussed during the call.
6. note: A brief summary of the conversation (max 3 sentences).

Return ONLY a valid JSON object matching these keys:
{
  "outcome": string,
  "sentiment": string,
  "rapport_score": number,
  "closing_score": number,
  "projects_discussed": string[],
  "note": string
}`;

            const evaluation = await generateAIResponse(prompt, true);
            logger.info(`[CallScorer] Evaluation results: ${JSON.stringify(evaluation)}`);

            const outcome = evaluation?.outcome || 'Connected';
            const sentiment = evaluation?.sentiment || 'neutral';
            const rapportScore = evaluation?.rapport_score ?? 5;
            const closingScore = evaluation?.closing_score ?? 5;
            const projectsDiscussed = evaluation?.projects_discussed || [];
            const note = evaluation?.note || 'Completed voice call session.';

            // 3. Validate tenantId and leadId UUIDs
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            const validTenantId = uuidRegex.test(tenantId) ? tenantId : null;
            const validLeadId = leadId && uuidRegex.test(leadId) ? leadId : null;

            if (!validTenantId) {
                logger.warn(`[CallScorer] Invalid tenantId: "${tenantId}". Bypassing DB insert.`);
                return;
            }

            // Query the persona's user_id from the database
            let personaUserId: string | null = null;
            try {
                const { rows: personas } = await pool.query(
                    `SELECT user_id FROM ai_employee_personas
                     WHERE tenant_id = $1::uuid AND (id::text = $2 OR employee_code = $2)
                     LIMIT 1`,
                    [validTenantId, personaId]
                );
                personaUserId = personas[0]?.user_id || null;
            } catch (err: any) {
                logger.warn(`[CallScorer] Failed to resolve user_id for persona ${personaId}: ${err.message}`);
            }

            // 4. Save to interactions table with user_id
            await pool.query(
                `INSERT INTO interactions (
                    tenant_id, lead_id, user_id, type, date, duration, note, outcome, sentiment,
                    rapport_score, closing_score, projects_discussed, transcript
                ) VALUES (
                    $1::uuid, $2::uuid, $3::uuid, 'Call', NOW(), $4, $5, $6, $7, $8, $9, $10, $11
                )`,
                [
                    validTenantId,
                    validLeadId,
                    personaUserId,
                    durationSeconds,
                    note,
                    outcome,
                    sentiment,
                    rapportScore,
                    closingScore,
                    projectsDiscussed,
                    transcript,
                ]
            );

            logger.info(`[CallScorer] Successfully saved call evaluation & transcript to database.`);
        } catch (err: any) {
            logger.error(`[CallScorer] Failed scoring call: ${err.message}`);
        }
    }
}

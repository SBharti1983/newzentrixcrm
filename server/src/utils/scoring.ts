import pool from '../db/pool';
import { generateAIResponse } from './ai';

/**
 * Hybrid Intelligent Lead Scoring Engine
 * Combines deterministic engagement logic with LLM predictive analysis.
 */
export async function calculateLeadScore(leadId: string | number, tenantId: string | number) {
    try {
        // 1. Fetch Comprehensive Telemetry
        const [leadRes, interactionsRes] = await Promise.all([
            pool.query('SELECT * FROM leads WHERE id = $1 AND tenant_id = $2', [leadId, tenantId]),
            pool.query(`
                SELECT type, note, sentiment, date 
                FROM interactions 
                WHERE lead_id = $1 AND tenant_id = $2 
                ORDER BY date DESC LIMIT 30
            `, [leadId, tenantId])
        ]);

        const lead = leadRes.rows[0];
        if (!lead) return null;

        const interactions = interactionsRes.rows;
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));

        // 2. Deterministic Logic Baseline (0-40 points)
        let logicScore = 0;
        
        // Interaction Velocity (Last 7 days)
        const recentInteractions = interactions.filter(i => new Date(i.date) > sevenDaysAgo);
        logicScore += Math.min(15, recentInteractions.length * 3); // Frequency boost

        // Stage Maturity
        const stageWeights = {
            'New': 5,
            'Contacted': 10,
            'Qualified': 20,
            'Site Visit': 30,
            'Negotiation': 35,
            'Won': 40,
            'Lost': 0,
            'Disqualified': 0
        };
        logicScore += (stageWeights[lead.stage] || 0);

        // Data Completeness
        if (lead.email) logicScore += 2;
        if (lead.phone) logicScore += 3;
        if (lead.budget && lead.budget !== 'Not specified') logicScore += 5;

        // 3. AI Intelligence Prompt (Predictive Layer)
        const prompt = `
            SYSTEM: Zentrix Predictive Scoring Engine (Model: X-1 Hybrid).
            ROLE: Calculate the CLOSING PROBABILITY (0-100) based on deep behavioral telemetry.
            
            LEAD CONTEXT:
            - Name: ${lead.name} | Stage: ${lead.stage} | Logic Baseline: ${logicScore}/65
            - Source: ${lead.source} | Project: ${lead.project_id || 'Global Search'}
            - Budget: ${lead.budget || 'Undisclosed'} | Property: ${lead.property_type || 'Unknown'}

            INTERACTION PULSE (Last ${interactions.length} activities):
            ${interactions.length > 0 
                ? interactions.map(i => {
                    let d = 'Unknown Date';
                    try { 
                        const dateVal = i.date || i.created_at;
                        if (dateVal) d = new Date(dateVal).toISOString().split('T')[0]; 
                    } catch(e) {}
                    return `[${d}] ${String(i.type || 'Activity').toUpperCase()}: ${i.note || 'No notes'} (Sentiment: ${i.sentiment || 'Neutral'})`;
                }).join('\n')
                : 'CRITICAL: No interaction history found. Cold startup detected.'
            }

            EVALUATION DIRECTIVES:
            - Analyze Sentiment Momentum: Is interest cooling or heating?
            - Pattern Recognition: Do notes indicate a "Time-waster" or "Urgent Buyer"?
            - Interaction Density: Weight recent interactions 3x more than historical ones.

            OUTPUT SCHEMA (Strict JSON):
            {
              "score": number, // Final weighted score (incorporate logic baseline)
              "classification": "HOT" | "WARM" | "COLD" | "NURTURE",
              "confidence": number (0-1),
              "signals": ["list", "of", "positive/negative", "triggers"],
              "predicted_close_date": "YYYY-MM-DD or null",
              "action_strategy": "One tactical move to increase conversion"
            }
        `;

        // 4. AI Execution & Synergy
        const result = await generateAIResponse(prompt, true);
        
        if (result && typeof result.score === 'number') {
            // Synergy: Blend logic with AI prediction (40/60 weight)
            const blendedScore = Math.round((logicScore * 0.4) + (result.score * 0.6));
            const finalScore = Math.min(100, Math.max(0, blendedScore));

            const classification = (result.classification || 'Neutral').toUpperCase();
            console.log(`[AI SCORING] Updating lead ${leadId} | Score: ${finalScore} | Sentiment: ${classification}`);

            await pool.query(
                `UPDATE leads 
                 SET score = $1, 
                     ai_analysis = $2, 
                     sentiment_pulse = $3 
                 WHERE id = $4 AND tenant_id = $5`,
                [finalScore, JSON.stringify(result), classification, leadId, tenantId]
            );

            return {
                ...result,
                score: finalScore,
                logic_baseline: logicScore,
                ai_predicted: result.score
            };
        }

        return null;
    } catch (err) {
        console.error('[HYBRID SCORING ERROR]', err);
        throw err;
    }
}


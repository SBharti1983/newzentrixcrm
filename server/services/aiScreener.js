const { GoogleGenerativeAI } = require('@google/generative-ai');
const pool = require('../db/pool');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * AIScreener handles the "First Handshake" with new leads.
 * It uses AI to generate the most engaging introductory message
 * based on the lead's source and project interest.
 */
class AIScreener {
    
    async triggerHandshake(lead, io) {
        const { tenant_id, id: lead_id, name, phone, source, project_id } = lead;
        
        if (!phone || !process.env.GEMINI_API_KEY) {
            console.log('[AI Screener] Skipping handshake: No phone or API Key.');
            return;
        }

        try {
            // 1. Fetch project name if any
            let projectContext = '';
            if (project_id) {
                const { rows } = await pool.query('SELECT name FROM projects WHERE id = $1', [project_id]);
                if (rows[0]) projectContext = `specifically for ${rows[0].name}`;
            }

            // 2. Draft personalized message using AI
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const prompt = `
                You are a friendly, professional Real Estate Concierge for ZentrixCRM. 
                A new lead just signed up from ${source} ${projectContext}.
                Lead Name: ${name}
                
                Write a 2-sentence WhatsApp greeting that:
                1. Welcomes them warmly.
                2. Asks a low-friction qualifying question (e.g. if they are looking for investment or self-use, or their preferred budget range).
                
                Keep it conversational, professional, and under 160 characters. No placeholders like [Agent Name]. Use 'the Zentrix Team'.
            `;

            const result = await model.generateContent(prompt);
            const message = result.response.text().trim();

            // 3. Record in notifications (Simulating WhatsApp Outbound)
            await pool.query(
                `INSERT INTO notifications (tenant_id, lead_id, channel, recipient, body, status, metadata)
                 VALUES ($1, $2, 'WhatsApp', $3, $4, 'Sent', $5)`,
                [tenant_id, lead_id, phone, message, JSON.stringify({ ai_screener: true, step: 'greeting' })]
            );

            // 4. Log as interaction so agent sees it in timeline
            await pool.query(
                `INSERT INTO interactions (tenant_id, lead_id, user_id, type, date, note, outcome)
                 VALUES ($1, $2, $3, 'WhatsApp', NOW(), $4, 'AI Outreach')`,
                [tenant_id, lead_id, null, `AI Concierge: ${message}`]
            );

            // 5. Notify UI
            if (io) {
                io.to(`tenant_${tenant_id}`).emit('notification', {
                    title: '🤖 AI Handshake Sent',
                    message: `Initial qualification message sent to ${name}.`,
                    type: 'whatsapp_sent'
                });
            }

            console.log(`[AI Screener] Handshake sent to ${name} (${phone})`);
        } catch (err) {
            console.error('[AI Screener] Handshake failed:', err);
        }
    }

    /**
     * Process an incoming reply from a lead.
     * In a real app, this would be a Webhook from Twilio/Meta.
     */
    async processReply(leadId, replyText, io) {
        try {
            const { rows: [lead] } = await pool.query('SELECT * FROM leads WHERE id = $1', [leadId]);
            if (!lead) return;

            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const prompt = `
                You are a Lead Analyst. Extract structured data from this customer reply:
                Reply: "${replyText}"
                
                Output ONLY a JSON object with:
                - "intent": (Number 1-10 depending on buying intent: 10 is high)
                - "budget_info": (String: any budget mentioned, or null)
                - "user_use": (String: "Investment", "Self-Use", or null)
                - "summary": (String: 1-sentence summary of their requirement)
                
                Example: {"intent": 8, "budget_info": "75L", "user_use": "Investment", "summary": "Interested in 2BHK for investment."}
            `;

            const result = await model.generateContent(prompt);
            let aiData;
            try {
                const text = result.response.text().trim().replace(/^```json/, '').replace(/```$/, '');
                aiData = JSON.parse(text);
            } catch (e) {
                console.error('[AI Screener] Parse failed:', result.response.text());
                return;
            }

            // Update lead with AI findings
            const updates = [];
            const params = [leadId];
            let i = 2;

            if (aiData.intent >= 8) {
                updates.push(`priority = 'High'`);
                updates.push(`stage = 'Qualified'`);
            }
            if (aiData.budget_info) {
                updates.push(`budget = $${i++}`);
                params.push(aiData.budget_info);
            }
            if (aiData.summary) {
                updates.push(`notes = l.notes || '\nAI Summary: ' || $${i++}`);
                params.push(aiData.summary);
            }

            if (updates.length > 0) {
                await pool.query(`UPDATE leads l SET ${updates.join(', ')} WHERE id = $1`, params);
            }

            // Log the reply
            await pool.query(
                `INSERT INTO interactions (tenant_id, lead_id, user_id, type, date, note, outcome)
                 VALUES ($1, $2, $3, 'WhatsApp', NOW(), $4, 'Lead Replied')`,
                [lead.tenant_id, leadId, null, `Lead Reply: ${replyText}\nAI Analysis: ${aiData.summary}`]
            );

            if (io) {
                io.to(`tenant_${lead.tenant_id}`).emit('notification', {
                    title: '🔥 High Intent Reply',
                    message: `${lead.name} replied with high intent (${aiData.intent}/10). Lead auto-qualified.`,
                    type: 'success'
                });
            }

        } catch (err) {
            console.error('[AI Screener] Reply processing failed:', err);
        }
    }
}

module.exports = new AIScreener();

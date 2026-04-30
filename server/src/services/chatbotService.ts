import pool from '../db/pool';
import { generateAIResponse } from '../utils/ai';
import { sendWhatsappMessage } from '../utils/whatsapp';

class ChatbotService {
    /**
     * Process an incoming message and decide whether to respond automatically.
     */
    async handleIncomingMessage(tenantId: string | number, fromPhone: string, messageText: string) {
        try {
            // 1. Fetch Chatbot Settings for this tenant
            const { rows: settings } = await pool.query(
                `SELECT * FROM chatbot_settings WHERE tenant_id = $1`,
                [tenantId]
            );

            const bot = settings[0];
            if (!bot || !bot.is_active) return { handled: false };

            // 2. Fetch Project Inventory Context (so the bot knows what they are selling)
            const { rows: projects } = await pool.query(
                `SELECT name, description, location, price_range, amenities 
                 FROM projects WHERE tenant_id = $1 AND is_active = TRUE`,
                [tenantId]
            );

            const inventoryContext = projects.map(p => 
                `Project: ${p.name}\nLocation: ${p.location}\nPrice: ${p.price_range}\nAmenities: ${p.amenities}\nDesc: ${p.description}`
            ).join('\n\n');

            let responseText = '';

            if (bot.ai_enabled) {
                // 3. Generate AI Response via Gemini
                const systemPrompt = `
                    ${bot.ai_prompt || 'You are a professional real estate sales assistant.'}
                    
                    AVAILABLE PROJECTS:
                    ${inventoryContext || 'We have several premium properties in the pipeline.'}
                    
                    RULES:
                    - Be polite, concise, and helpful.
                    - If you don't know the specific price of a unit, ask them for their budget.
                    - Always encourage scheduling a site visit.
                    - Do NOT make up facts. Use the context provided above.
                    - Current User Message: "${messageText}"
                `;

                try {
                    responseText = await generateAIResponse(systemPrompt, false);
                } catch (err) {
                    console.error('[Chatbot AI Error]', err);
                    responseText = bot.fallback_message || "Thank you for your message. One of our experts will get back to you shortly.";
                }
            } else {
                // 4. Fallback to static message if AI is disabled
                responseText = bot.greeting_message || "Hello! How can we help you today?";
            }

            // 5. Dispatch the response via WhatsApp
            if (responseText) {
                await sendWhatsappMessage(tenantId, fromPhone, responseText);
                
                // 6. Log the interaction as a bot-response
                await pool.query(
                    `INSERT INTO interactions (tenant_id, user_id, type, date, note, outcome)
                     VALUES ($1, NULL, 'Message', NOW(), $2, 'Bot Filtered')`,
                    [tenantId, `BOT RESPONSE to "${messageText}":\n${responseText}`]
                );
            }

            return { handled: true, response: responseText };
        } catch (err: any) {
            console.error('[Chatbot Service] Processing failed:', err);
            return { handled: false, error: err.message };
        }
    }
}

export default new ChatbotService();


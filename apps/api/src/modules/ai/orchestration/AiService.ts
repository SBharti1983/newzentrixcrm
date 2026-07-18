import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from 'axios';
import rohanBridgeClient from '../rohanBridge/RohanBridgeClient';

class AIService {
    private genAI: GoogleGenerativeAI | null;

    constructor() {
        if (process.env.GEMINI_API_KEY) {
            this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        } else {
            this.genAI = null;
            console.warn('[AI Service] GEMINI_API_KEY not set, transcription will be disabled');
        }
    }

    /**
     * Detect MIME type from URL or filename
     */
    private _detectMimeType(url: string | null) {
        if (!url) return 'audio/mp4';
        const lower = url.toLowerCase();
        if (lower.includes('.wav')) return 'audio/wav';
        if (lower.includes('.mp3')) return 'audio/mpeg';
        if (lower.includes('.ogg')) return 'audio/ogg';
        if (lower.includes('.m4a')) return 'audio/mp4';
        // Default to mp4 since Android records in MPEG-4
        return 'audio/mp4';
    }

    /**
     * Transcribes an audio file and analyzes sentiment via Gemini.
     * When callMeta is provided, the analysis is also logged to Rohan's
     * memory (fire-and-forget) so future interactions can recall it.
     *
     * @param {string} audioUrl Public or accessible URL of the call recording
     * @param {object} callMeta Optional context for memory logging
     * @param {number} callMeta.tenant_id
     * @param {string} callMeta.lead_id
     * @param {string} callMeta.persona_id
     * @param {number} callMeta.turn_number
     * @param {string} callMeta.user_input  What the caller said (or a summary)
     */
    async transcribeCall(audioUrl: string, callMeta?: {
        tenant_id: number;
        lead_id: string;
        persona_id: string;
        turn_number: number;
        user_input: string;
    }) {
        if (!this.genAI) {
            return {
                fullAnalysis: "Transcription unavailable: GEMINI_API_KEY not configured.",
                sentiment: "Neutral"
            };
        }

        try {
            console.log(`[AI Service] Fetching audio from: ${audioUrl}`);

            // 1. Fetch the audio data as base64
            const response = await axios.get(audioUrl, {
                responseType: 'arraybuffer',
                timeout: 30000
            });
            const base64Data = Buffer.from(response.data).toString('base64');
            const mimeType = this._detectMimeType(audioUrl);
            console.log(`[AI Service] Audio fetched: ${(response.data.byteLength / 1024).toFixed(1)}KB, MIME: ${mimeType}`);

            // 2. Prepare the prompt for Gemini
            const prompt = `
                Please accurately transcribe the following sales call recording.
                After the transcription, provide a professional "Intelligence Profile":
                
                [LEAD ANALYSIS]
                1. SENTIMENT: (Select one: Positive, Neutral, Negative)
                2. CATEGORY: (Select one: Hot, Warm, Cold)
                3. SUMMARY: A 2-sentence summary of the discussion.
                4. NEXT ACTION: What is the recommended next step?

                [AGENT COACHING]
                1. RAPPORT_SCORE: (Rate 1-10 on empathy and relationship building)
                2. CLOSING_SCORE: (Rate 1-10 on driving the deal forward/objection handling)
                3. SKILLS_DETECTED: (List key skills used)

                [SMART TASKS]
                List any specific promises made by the agent. 
                Format each task as: TASK: <Description> | DUE: <Approximate time/date if mentioned, else 'Tomorrow'>

                [INVENTORY]
                PROJECTS_DISCUSSED: (List project names or unit types mentioned, e.g., West Wing Estates, 3BHK, Skyline Luxury)

                Format your response as a clear, professional log.
            `;

            // 3. Try multiple models with fallback (same chain as utils/ai.js)
            const modelsToTry = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
            let lastError: any = null;
            let analysis: string | null = null;

            for (const modelName of modelsToTry) {
                try {
                    const model = this.genAI.getGenerativeModel({ model: modelName });
                    const result = await model.generateContent([
                        prompt,
                        {
                            inlineData: {
                                mimeType: mimeType,
                                data: base64Data
                            }
                        }
                    ]);
                    analysis = result.response.text();
                    console.log(`[AI Service] Transcription complete via ${modelName}`);
                    break;
                } catch (modelErr: any) {
                    lastError = modelErr;
                    console.warn(`[AI Service] Model ${modelName} failed:`, modelErr.message);
                    if (modelErr.status === 404 || modelErr.status === 429 || modelErr.status === 503) continue;
                    throw modelErr;
                }
            }

            if (!analysis) {
                throw lastError || new Error('All models failed');
            }

            console.log(`[AI Service] Transcription, Coaching, Smart Tasks & Inventory Audit Complete`);

            // Extract sentiment badge for the database
            let sentiment = 'Neutral';
            if (analysis.includes('Hot') || analysis.includes('Positive')) sentiment = 'Hot';
            else if (analysis.includes('Warm')) sentiment = 'Warm';
            else if (analysis.includes('Cold') || analysis.includes('Negative')) sentiment = 'Cold';

            // Extract scores via Regex
            const rapportMatch = analysis.match(/RAPPORT_SCORE:\s*(\d+)/i);
            const closingMatch = analysis.match(/CLOSING_SCORE:\s*(\d+)/i);
            const skillsMatch = analysis.match(/SKILLS_DETECTED:\s*(.*)/i);

            // Extract Smart Tasks
            const taskLines = analysis.match(/TASK:\s*(.*)/gi) || [];
            const smartTasks = taskLines.map(line => {
                const parts = line.split('|');
                return {
                    description: parts[0].replace(/TASK:\s*/i, '').trim(),
                    due: parts[1] ? parts[1].replace(/DUE:\s*/i, '').trim() : 'Tomorrow'
                };
            });

            // Extract Projects Discussed
            const projectsMatch = analysis.match(/PROJECTS_DISCUSSED:\s*(.*)/i);
            const projectsDiscussed = projectsMatch ? projectsMatch[1].split(',').map(p => p.trim()).filter(p => p && p !== 'None') : [];

            const result = {
                fullAnalysis: analysis,
                sentiment: sentiment,
                rapportScore: rapportMatch ? parseInt(rapportMatch[1]) : 5,
                closingScore: closingMatch ? parseInt(closingMatch[1]) : 5,
                skills: skillsMatch ? skillsMatch[1].split(',').map(s => s.trim()) : [],
                smartTasks: smartTasks,
                projectsDiscussed: projectsDiscussed
            };

            // ── Post-call reflection: log analysis to Rohan's memory (fire-and-forget) ──
            if (callMeta) {
                rohanBridgeClient.logCall({
                    tenant_id: callMeta.tenant_id,
                    lead_id: callMeta.lead_id,
                    persona_id: callMeta.persona_id,
                    channel: 'voice',
                    turn_number: callMeta.turn_number,
                    user_input: callMeta.user_input,
                    response_given: analysis,
                    intent: sentiment,
                    emotion: sentiment
                }).catch(err => console.warn('[AiService] Rohan memory log failed (non-fatal):', err));
            }

            return result;
        } catch (error: any) {
            console.error('[AI Service] Error:', error.message);
            return {
                fullAnalysis: "Transcription failed, but call was recorded.",
                sentiment: "Neutral"
            };
        }
    }
    /**
     * Generates a personalized feedback request after a site visit
     */
    async generateFeedbackRequest(leadName: string, projectName: string) {
        if (!this.genAI) return `Hi ${leadName}, how was your visit to ${projectName} today?`;

        try {
            const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const prompt = `Write a short, professional, and warm WhatsApp message asking for feedback after a real estate site visit. 
            Lead Name: ${leadName}
            Project Visited: ${projectName}
            
            Keep it under 30 words. Include emojis like 🏠 or ✨. Use a tone that encourages honest feedback.`;

            const result = await model.generateContent(prompt);
            return result.response.text().trim();
        } catch (e) {
            return `Hi ${leadName}, how was your visit to ${projectName} today? We value your feedback!`;
        }
    }
    /**
     * Generates a strategic briefing for the agent's top 5 leads
     */
    async generateDailyBriefing(leads: any[]) {
        if (!this.genAI || leads.length === 0) return "No intelligence available today.";

        try {
            const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const prompt = `You are a Senior Real Estate Sales Coach. Analyze these leads and pick the TOP 5 that the agent must call TODAY.
            For each lead, explain WHY (based on their behavior) and give 1 "Magic Talking Point".
            
            Leads Data: ${JSON.stringify(leads)}
            
            Format your response as a JSON array of objects:
            [ { "id": "lead_id", "priority": "High", "reason": "Why today?", "talkingPoint": "What to say?" } ]
            Return ONLY the JSON.`;

            const result = await model.generateContent(prompt);
            const text = result.response.text().trim();
            // Clean JSON from potential markdown blocks
            const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(cleaned);
        } catch (e) {
            console.error('[AI Briefing Error]', e);
            return leads.slice(0, 5).map(l => ({
                id: l.id,
                priority: "High",
                reason: "Consistent interest in " + (l.project_name || "projects"),
                talkingPoint: "Ask them about their thoughts on the recent floor plan shared."
            }));
        }
    }
    /**
     * Generates a professional Booking Agreement or Welcome Letter
     */
    async generateAgreement(lead: any, project: any, unit: any) {
        if (!this.genAI) return "Agreement generation unavailable.";

        try {
            const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const prompt = `You are a Legal & Sales Ops specialized in Real Estate. Generate a professional "Booking Summary & Welcome Letter" for a new property purchase.
            
            LEAD: ${lead.name}
            PROJECT: ${project.name} at ${project.location}
            UNIT DETAILS: Unit ${unit.number}, Type ${unit.type}, Floor ${unit.floor}
            PRICING: Total ₹${unit.price}, Booking Amount Paid ₹${unit.bookingAmount}
            PAYMENT PLAN: ${unit.plan}
            
            Structure the response as:
            1. [HEADER]: Professional Title
            2. [GREETING]: Personal welcome
            3. [UNIT_DETAILS]: Table-like summary of the unit
            4. [FINANCIALS]: Breakdown of price and payment schedule
            5. [TERMS]: 3-4 standard booking terms
            6. [SIGNATURE]: Professional closing
            
            Keep the tone authoritative yet celebratory.`;

            const result = await model.generateContent(prompt);
            return result.response.text().trim();
        } catch (e) {
            console.error('[Agreement Generation Error]', e);
            return `Agreement for ${lead.name} at ${project.name}. Total Price: ₹${unit.price}. Unit: ${unit.number}.`;
        }
    }
    /**
     * Generates hyper-personalized messages for a batch of leads
     */
    async generatePersonalizedBulkMessages(leads: any[], globalGoal: string) {
        if (!this.genAI || leads.length === 0) return [];

        try {
            const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const prompt = `You are an expert personalized marketing agent.
            GOAL: ${globalGoal}
            
            For each lead in the list below, write a SHORT, warm WhatsApp message (max 20 words).
            Use their name and mention their interested project or last status if available.
            
            LEADS: ${JSON.stringify(leads.map(l => ({ id: l.id, name: l.name, project: l.project_name, stage: l.stage })))}
            
            Format your response as a JSON array:
            [ { "id": "lead_id", "message": "The personalized message" } ]
            Return ONLY the JSON.`;

            const result = await model.generateContent(prompt);
            const text = result.response.text().trim();
            const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(cleaned);
        } catch (e) {
            console.error('[Bulk AI Personalization Error]', e);
            return leads.map(l => ({
                id: l.id,
                message: `Hi ${l.name}, reaching out regarding ${l.project_name || 'our projects'}. Would love to discuss further!`
            }));
        }
    }
    /**
     * Generates a single hyper-personalized follow-up message for a lead
     */
    async generateSuggestedMessage(lead: any, interactions: any[], project: any, reason: string) {
        if (!this.genAI) return `Hi ${lead.name}, reaching out to check in on your interest in ${project?.name || 'our project'}. Let me know if you have any questions!`;

        try {
            const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const interactionsString = interactions.map(i => `[${i.type}] ${i.note}`).join('\n');

            const prompt = `You are a high-performing real estate sales consultant. 
            Write a SHORT, warm, and hyper-personalized WhatsApp message for a lead.
            
            LEAD: ${lead.name}
            PROJECT: ${project?.name || 'Zentrix Premium Portfolio'}
            REASON FOR CONTACT: ${reason}
            
            HISTORY:
            ${interactionsString || 'Initial discovery phase.'}
            
            INSTRUCTIONS:
            1. Use the lead's name.
            2. Reference a specific detail from their history if available (e.g., they liked the floorplan, they were budget sensitive, they visited on Sunday).
            3. Address the 'REASON FOR CONTACT'.
            4. Keep it under 25 words.
            5. Use a soft, non-pushy tone.
            6. Include 1 emoji.
            
            Return ONLY the message text.`;

            const result = await model.generateContent(prompt);
            return result.response.text().trim();
        } catch (e) {
            console.error('[AI Suggested Message Error]', e);
            return `Hi ${lead.name}, reaching out regarding ${project?.name || 'our projects'}. Let's connect soon!`;
        }
    }
    /**
     * Generates a conversational chat response for the public concierge
     */
    async generateChatResponse(systemPrompt: string, message: string, history: any[] = []) {
        if (!this.genAI) return "I'm sorry, my intelligence systems are currently offline. Please use the 'Enquire Now' form.";

        try {
            const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const chat = model.startChat({
                history: history.map(h => ({
                    role: h.role === 'user' ? 'user' : 'model',
                    parts: [{ text: h.text }]
                })),
                generationConfig: {
                    maxOutputTokens: 250,
                },
            });

            const result = await chat.sendMessage([
                { text: systemPrompt },
                { text: message }
            ]);

            return result.response.text().trim();
        } catch (e) {
            console.error('[AI Chat Response Error]', e);
            return "That's a great question! To provide you with the most accurate details regarding pricing and availability, would you like to leave your number for a quick callback?";
        }
    }
}

export default new AIService();



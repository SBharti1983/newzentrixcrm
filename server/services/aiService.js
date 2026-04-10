const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require('axios');

class AIService {
    constructor() {
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    }

    /**
     * Transcribes an audio file and analyzes sentiment via Gemini 1.5
     * @param {string} audioUrl Public or accessible URL of the call recording
     */
    async transcribeCall(audioUrl) {
        try {
            console.log(`[AI Service] Fetching audio from: ${audioUrl}`);
            
            // 1. Fetch the audio data as base64
            const response = await axios.get(audioUrl, { responseType: 'arraybuffer' });
            const base64Data = Buffer.from(response.data).toString('base64');

            // 2. Prepare the prompt for Gemini
            // We ask for transcription + professional sentiment analysis
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

            // 3. Send to Gemini 1.5 Flash (optimized for speed and audio)
            const result = await this.model.generateContent([
                prompt,
                {
                    inlineData: {
                        mimeType: "audio/wav",
                        data: base64Data
                    }
                }
            ]);

            const analysis = result.response.text();
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

            return {
                fullAnalysis: analysis,
                sentiment: sentiment,
                rapportScore: rapportMatch ? parseInt(rapportMatch[1]) : 5,
                closingScore: closingMatch ? parseInt(closingMatch[1]) : 5,
                skills: skillsMatch ? skillsMatch[1].split(',').map(s => s.trim()) : [],
                smartTasks: smartTasks,
                projectsDiscussed: projectsDiscussed
            };
        } catch (error) {
            console.error('[AI Service] Error:', error.message);
            return {
                fullAnalysis: "Transcription failed, but call was recorded.",
                sentiment: "Neutral"
            };
        }
    }
}

module.exports = new AIService();

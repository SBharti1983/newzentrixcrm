import { describe, test, expect } from 'vitest';
import rohanPersonaEngine from '../../src/employees/Rohan/Persona';
import rohanEnglishPersona from '../../src/employees/Rohan/EnglishPersona';
import rohanHindiPersona from '../../src/employees/Rohan/HindiPersona';
import { DbAIEmployeePersona, RohanContext } from '@zentrix/types';

describe('Lead Qualification Persona Engines', () => {
    const mockPersona: DbAIEmployeePersona = {
        id: 'test-rohan',
        tenant_id: 1,
        employee_name: 'Rohan',
        role: 'Sales Representative',
        employee_code: 'EMP001',
        type: 'sales',
        is_active: true,
        voice_config: {
            english_voice: 'en-US-Wavenet-D',
            hindi_voice: 'hi-IN-Wavenet-A',
            code_mix_voice: 'hi-IN-Wavenet-B',
        },
        persona_config: {
            personality: 'Friendly and professional',
            tone: 'Warm',
            language_style: 'Hinglish',
            patience_level: 'High',
        },
        knowledge_scope: {
            boundaries: 'Never commit to discounts or give legal advice',
        },
        escalation_rules: {
            escalate_on: ['angry', 'legal'],
        },
    } as any;

    const mockContext: RohanContext = {
        persona: mockPersona,
        conversation_state: {
            turn_count: 2,
            language_detected: 'english',
            emotion_trend: ['neutral'],
            current_goal: 'qualify_and_engage',
            missing_info: ['budget'],
            objections_raised: [],
            documents_shared: [],
            next_action: 'qualify',
            conversation_started_at: new Date().toISOString(),
        },
        recent_interactions: [],
        semantic_memories: [],
    };

    test('Rohan default persona builds prompt with employee name and guidelines', () => {
        const prompt = rohanPersonaEngine.buildSystemPrompt(mockPersona, mockContext, 'fast');
        expect(prompt).toContain('Rohan');
        expect(prompt).toContain('Friendly and professional');
    });

    test('Rohan English persona buildSystemPrompt references English language override', () => {
        const enPrompt = rohanEnglishPersona.buildSystemPrompt(mockPersona, mockContext, 'reasoning');
        expect(enPrompt).toContain('Respond EXCLUSIVELY in clear, professional English');
    });

    test('Rohan Hindi persona buildSystemPrompt references Hindi language override', () => {
        const hiPrompt = rohanHindiPersona.buildSystemPrompt(mockPersona, mockContext, 'reasoning');
        expect(hiPrompt).toContain('polite Hindi');
    });
});

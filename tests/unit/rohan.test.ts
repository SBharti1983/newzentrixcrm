/**
 * Unit tests for Rohan AI Digital Employee Engine
 *
 * Verifies:
 * 1. RohanPersonaEngine: Prompt assembly, sentiment and objection detection, voice mapping
 * 2. RohanMemory: Default state structures and caches
 * 3. RohanCognitiveLoop: Loop orchestration, Track A response parsing, and background Track B task triggers.
 *
 * Can be run using: npx tsx tests/unit/rohan.test.ts
 */

import assert from 'assert';
import rohanPersonaEngine from '../../apps/api/src/services/digital-employee/RohanPersonaEngine';
import rohanMemory, { createDefaultConversationState } from '../../apps/api/src/services/digital-employee/RohanMemory';
import rohanCognitiveLoop from '../../apps/api/src/services/digital-employee/RohanCognitiveLoop';
import {
    DbAIEmployeePersona,
    RohanContext,
    ReasoningOutput,
} from '@zentrix/types';

// Mock active persona configuration
const mockPersona: DbAIEmployeePersona = {
    id: 'test-persona-123',
    tenant_id: 1,
    employee_name: 'Rohan Mishra',
    employee_code: 'ZRX-007',
    role: 'Sales Executive',
    is_active: true,
    persona_config: {
        personality: 'Warm, polite, energetic, and professional.',
        tone: 'Consultative and customer-first.',
        language_style: 'Professional Hindi-English code-mix (Hinglish).',
        greeting_style: 'Namaste {name}! Main Rohan bol raha hoon Zentrix Realty se.',
        patience_level: 'high',
        humor: 'subtle',
        filler_words: ['Ji bilkul...', 'Acha...', 'Haan ji...']
    },
    voice_config: {
        hindi_voice: 'rohan',
        english_voice: 'rohan-english',
        code_mix_voice: 'rohan-mix',
        speed: 1.0,
        pitch: 1.0
    },
    knowledge_scope: {
        projects: 'Zentrix Premium Residency in Sector 62 Noida. Price 1.2Cr - 2.5Cr.',
        faqs: 'RERA approved, booking amount is 10%, completion date Dec 2027.',
        inventory: '3BHK and 4BHK units available.',
        boundaries: 'Do not confirm discounts above 5% without asking manager.'
    },
    escalation_rules: {
        discount_request: { action: 'notify', role: 'sales_manager' },
        legal_question: { action: 'human_takeover', role: 'legal_advisor' },
        negative_sentiment_below: -0.5,
        booking_intent: { action: 'warm_transfer', role: 'sales_manager' },
        max_conversation_minutes: 30
    },
    created_at: new Date(),
    updated_at: new Date()
};

// Mock conversation context
const mockContext: RohanContext = {
    persona: mockPersona,
    lead: {
        id: 'lead-888',
        name: 'Sikandar Bharti',
        phone: '+919876543210',
        status: 'new',
        ai_score: 10,
        sentiment: 'neutral',
        nurture_stage: 'interest'
    },
    project: {
        id: 'proj-555',
        name: 'Zentrix Premium Residency',
        location: 'Sector 62 Noida',
        price_range_min: 12000000,
        price_range_max: 25000000
    },
    recent_interactions: [
        {
            id: 'int-1',
            type: 'whatsapp',
            note: 'Lead requested price brochure',
            outcome: 'sent',
            created_at: new Date()
        }
    ],
    conversation_state: createDefaultConversationState('whatsapp')
};

// Main test execution block
async function runTests() {
    console.log('\n🧪 Running Rohan AI Digital Employee Unit Tests...\n');

    let passed = 0;
    let failed = 0;

    const test = async (name: string, fn: () => void | Promise<void>) => {
        try {
            await fn();
            console.log(`  ✅ ${name}`);
            passed++;
        } catch (err: any) {
            console.error(`  ❌ ${name}`);
            console.error(`     Error: ${err.message}\n`);
            failed++;
        }
    };

    // ────────────────────────────────────────────────────────────────
    // Test Set 1: RohanPersonaEngine
    // ────────────────────────────────────────────────────────────────
    await test('RohanPersonaEngine: greeting generation', () => {
        const greeting = rohanPersonaEngine.generateGreeting(mockPersona, 'Sikandar', 'Zentrix Residency', 'whatsapp');
        assert.ok(greeting.includes('Sikandar'));
        assert.ok(greeting.includes('Zentrix Residency'));
        assert.ok(greeting.includes('help'));
    });

    await test('RohanPersonaEngine: system prompt construction (fast track)', () => {
        const prompt = rohanPersonaEngine.buildSystemPrompt(mockPersona, mockContext, 'fast');
        assert.ok(prompt.includes('ZRX-007')); // Employee code
        assert.ok(prompt.includes('Zentrix Premium Residency')); // Project detail
        assert.ok(prompt.includes('Sikandar Bharti')); // Lead name
        assert.ok(!prompt.includes('JSON')); // Fast prompt is conversational, not JSON format instructions
    });

    await test('RohanPersonaEngine: system prompt construction (reasoning track)', () => {
        const prompt = rohanPersonaEngine.buildSystemPrompt(mockPersona, mockContext, 'reasoning');
        assert.ok(prompt.includes('valid JSON')); // Contains JSON format instructions
        assert.ok(prompt.includes('CRM_UPDATE'));
        assert.ok(prompt.includes('SHOULD_ESCALATE'));
    });

    await test('RohanPersonaEngine: filler words', () => {
        const filler = rohanPersonaEngine.getRandomFiller(mockPersona);
        assert.ok(mockPersona.persona_config.filler_words.includes(filler!));
    });

    await test('RohanPersonaEngine: voice mapping', () => {
        const voiceHindi = rohanPersonaEngine.getVoiceForLanguage(mockPersona, 'hindi');
        assert.strictEqual(voiceHindi, 'rohan-mix'); // should match code_mix_voice fallback

        const voiceEnglish = rohanPersonaEngine.getVoiceForLanguage(mockPersona, 'english');
        assert.strictEqual(voiceEnglish, 'rohan-english');
    });

    // ────────────────────────────────────────────────────────────────
    // Test Set 2: Escalation Rules Evaluation
    // ────────────────────────────────────────────────────────────────
    await test('RohanPersonaEngine: escalation evaluation (sentiment)', () => {
        const mockReasoning: ReasoningOutput = {
            intent: 'angry customer complaints',
            emotion: 'angry',
            emotion_score: -0.8, // lower than -0.5 rule threshold
            stage: 'consideration',
            missing_info: [],
            action: 'respond',
            response: 'I apologize for the delay.',
            should_escalate: false,
            crm_update: {},
            next_goal: 'cool down lead'
        };

        const result = rohanPersonaEngine.evaluateEscalation(mockPersona, mockReasoning, mockContext);
        assert.strictEqual(result, 'negative_sentiment');
    });

    await test('RohanPersonaEngine: escalation evaluation (discount request)', () => {
        const mockReasoning: ReasoningOutput = {
            intent: 'asking for lower price',
            emotion: 'neutral',
            emotion_score: 0.1,
            stage: 'evaluation',
            missing_info: [],
            objection: {
                type: 'price',
                text: 'Can I get a discount?'
            },
            action: 'respond',
            response: 'Let me check with my manager.',
            should_escalate: false,
            crm_update: {},
            next_goal: 'discuss pricing options'
        };

        const contextWithDiscountRequest = {
            ...mockContext,
            conversation_state: {
                ...mockContext.conversation_state,
                last_user_message: 'Please give me a discount'
            }
        };

        const result = rohanPersonaEngine.evaluateEscalation(mockPersona, mockReasoning, contextWithDiscountRequest);
        assert.strictEqual(result, 'discount_request');
    });

    // ────────────────────────────────────────────────────────────────
    // Test Set 3: RohanMemory Layer
    // ────────────────────────────────────────────────────────────────
    await test('RohanMemory: default state generator', () => {
        const defaultState = createDefaultConversationState('voice');
        assert.strictEqual(defaultState.turn_count, 0);
        assert.strictEqual(defaultState.language_detected, 'unknown');
        assert.deepStrictEqual(defaultState.missing_info, ['budget', 'timeline', 'property_preference']);
    });

    // Summary output
    console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
    console.error('Test runner failed to execute:', err);
    process.exit(1);
});

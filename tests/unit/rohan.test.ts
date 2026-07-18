/**
 * Unit tests for Rohan AI Digital Employee Engine
 *
 * Verifies:
 * 1. RohanPersonaEngine: Prompt assembly, sentiment and objection detection, voice mapping
 * 2. RohanMemory: Default state structures and caches
 * 3. RohanCognitiveLoop: Loop orchestration, Track A response parsing, and background Track B task triggers.
 *
 * Run using: npx vitest run tests/unit/rohan.test.ts
 */

import { describe, test } from 'vitest';
import assert from 'assert';
import rohanPersonaEngine from '../../apps/digital-employee/src/employees/Rohan/Persona';
import rohanMemory, { createDefaultConversationState, CircuitBreaker } from '../../apps/digital-employee/src/memory/MemoryService';
import {
    DbAIEmployeePersona,
    RohanContext,
    ReasoningOutput,
    MemoryTier,
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

describe('Rohan AI Digital Employee', () => {
    // ────────────────────────────────────────────────────────────────
    // Test Set 1: RohanPersonaEngine
    // ────────────────────────────────────────────────────────────────
    describe('RohanPersonaEngine', () => {
        test('greeting generation', () => {
            const greeting = rohanPersonaEngine.generateGreeting(mockPersona, 'Sikandar', 'Zentrix Residency', 'whatsapp');
            assert.ok(greeting.includes('Sikandar'));
            assert.ok(greeting.includes('Zentrix Residency'));
            assert.ok(greeting.includes('help'));
        });

        test('system prompt construction (fast track)', () => {
            const prompt = rohanPersonaEngine.buildSystemPrompt(mockPersona, mockContext, 'fast');
            assert.ok(prompt.includes('ZRX-007')); // Employee code
            assert.ok(prompt.includes('Zentrix Premium Residency')); // Project detail
            assert.ok(prompt.includes('Sikandar Bharti')); // Lead name
            assert.ok(!prompt.includes('JSON')); // Fast prompt is conversational, not JSON format instructions
        });

        test('system prompt construction (reasoning track)', () => {
            const prompt = rohanPersonaEngine.buildSystemPrompt(mockPersona, mockContext, 'reasoning');
            assert.ok(prompt.includes('valid JSON')); // Contains JSON format instructions
            assert.ok(prompt.includes('CRM_UPDATE'));
            assert.ok(prompt.includes('SHOULD_ESCALATE'));
        });

        test('filler words', () => {
            const filler = rohanPersonaEngine.getRandomFiller(mockPersona);
            assert.ok(mockPersona.persona_config.filler_words.includes(filler!));
        });

        test('voice mapping', () => {
            const voiceHindi = rohanPersonaEngine.getVoiceForLanguage(mockPersona, 'hindi');
            assert.strictEqual(voiceHindi, 'rohan-mix'); // should match code_mix_voice fallback

            const voiceEnglish = rohanPersonaEngine.getVoiceForLanguage(mockPersona, 'english');
            assert.strictEqual(voiceEnglish, 'rohan-english');
        });
    });

    // ────────────────────────────────────────────────────────────────
    // Test Set 2: Escalation Rules Evaluation
    // ────────────────────────────────────────────────────────────────
    describe('Escalation Rules Evaluation', () => {
        test('escalation evaluation (sentiment)', () => {
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

        test('escalation evaluation (discount request)', () => {
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
    });

    // ────────────────────────────────────────────────────────────────
    // Test Set 3: RohanMemory Layer
    // ────────────────────────────────────────────────────────────────
    describe('RohanMemory', () => {
        test('default state generator', () => {
            const defaultState = createDefaultConversationState('voice');
            assert.strictEqual(defaultState.turn_count, 0);
            assert.strictEqual(defaultState.language_detected, 'unknown');
            assert.deepStrictEqual(defaultState.missing_info, ['budget', 'timeline', 'property_preference']);
        });

        // ────────────────────────────────────────────────────────────────
        // Test Set 3b: Three-Tier Degradation & Circuit Breaker
        // ────────────────────────────────────────────────────────────────
        test('CircuitBreaker: opens after threshold failures then half-opens', async () => {
            const cb = new CircuitBreaker('test', 3, 100);
            // Initially closed — calls allowed
            assert.strictEqual(cb.allow(), true);
            assert.strictEqual(cb.isOpen, false);

            // Three failures open the circuit
            cb.recordFailure();
            cb.recordFailure();
            assert.strictEqual(cb.isOpen, false); // not yet
            cb.recordFailure();
            assert.strictEqual(cb.isOpen, true);

            // While open (before reset timeout), calls are blocked
            assert.strictEqual(cb.allow(), false);

            // After reset timeout, half-opens and allows a probe
            const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
            await wait(110);
            assert.strictEqual(cb.allow(), true);

            // A successful probe closes the circuit again
            cb.recordSuccess();
            assert.strictEqual(cb.isOpen, false);
            assert.strictEqual(cb.allow(), true);
        });

        test('health status reports all three tiers + circuit state', () => {
            const health = rohanMemory.getHealthStatus();
            // Shape contract — fields must exist regardless of live infra
            assert.ok(typeof health.redis === 'boolean', 'health.redis must be boolean');
            assert.ok(typeof health.tier === 'string', 'health.tier must be string');
            assert.ok(typeof health.vectorStore === 'boolean', 'health.vectorStore must be boolean');
            assert.ok(typeof health.redisCircuitOpen === 'boolean');
            assert.ok(typeof health.vectorCircuitOpen === 'boolean');
            assert.ok(health.metrics, 'health.metrics must be present');
            // Degradation metrics counters must all be numbers
            for (const key of [
                'redis_hits', 'redis_misses', 'redis_failures',
                'postgres_hits', 'postgres_failures',
                'vector_hits', 'vector_failures',
                'keyword_fallbacks', 'redis_circuit_open_count',
            ]) {
                assert.ok(typeof (health.metrics as any)[key] === 'number', `metrics.${key} must be number`);
            }
        });

        test('MemoryTier enum has the three tiers in order', () => {
            assert.strictEqual(MemoryTier.REDIS, 'redis');
            assert.strictEqual(MemoryTier.POSTGRES, 'postgres');
            assert.strictEqual(MemoryTier.VECTOR, 'vector');
        });

        test('getConversationState returns provenance even when Redis is down', async () => {
            // Force the redis breaker open so the read degrades to PG (or null).
            // We do this by tripping the breaker via repeated allow()+recordFailure.
            const anyMemory = rohanMemory as any;
            for (let i = 0; i < 6; i++) {
                anyMemory.redisBreaker.recordFailure();
            }
            // Now a state read must still resolve (never throw) and report provenance.
            const { state, provenance } = await rohanMemory.getConversationState(1, 'nonexistent-lead-degradation-test');
            // state may be null (no PG row) — that's a valid degraded result.
            assert.ok(state === null || typeof state === 'object');
            assert.ok(provenance, 'provenance must be returned');
            assert.ok(Array.isArray(provenance.degraded_tiers), 'degraded_tiers must be an array');
            assert.ok(typeof provenance.latency_ms === 'number');
            assert.ok(typeof provenance.cache_hit === 'boolean');
            // Reset breaker so subsequent tests aren't affected.
            anyMemory.redisBreaker.recordSuccess();
        });
    });
});

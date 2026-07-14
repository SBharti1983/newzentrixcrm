/**
 * Rohan AI Digital Employee — Type Definitions
 * 
 * These types mirror the PostgreSQL schema in rohan_ai_employee_v1.sql
 * and define the contracts between the Persona Engine, Memory Layer,
 * Cognitive Loop, and Channel Adapters.
 */

// ═══════════════════════════════════════════════════════════════════
// Database Row Types (mirror of SQL schema)
// ═══════════════════════════════════════════════════════════════════

export interface DbAIEmployeePersona {
    id: string;
    tenant_id: number;
    employee_name: string;
    employee_code: string;
    role: string;
    avatar_url?: string;
    persona_config: PersonaConfig;
    voice_config: VoiceConfig;
    knowledge_scope: KnowledgeScope;
    escalation_rules: EscalationRules;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
}

export interface DbAIConversationMemory {
    id: string;
    tenant_id: number;
    persona_id: string;
    lead_id?: string;
    channel: ChannelType;
    conversation_state: ConversationState;
    last_reasoning?: ReasoningOutput;
    last_reasoning_at?: Date;
    expires_at?: Date;
    created_at: Date;
    updated_at: Date;
}

export interface DbAIReasoningLog {
    id: string;
    tenant_id: number;
    persona_id: string;
    lead_id?: string;
    memory_id?: string;
    turn_number: number;
    channel: ChannelType;
    user_input?: string;
    reasoning_output: ReasoningOutput;
    response_given?: string;
    latency_ms?: number;
    reasoning_ms?: number;
    created_at: Date;
}

export interface DbAIEscalationEvent {
    id: string;
    tenant_id: number;
    persona_id: string;
    lead_id?: string;
    memory_id?: string;
    escalation_type: EscalationType;
    trigger_reason: string;
    suggested_role?: string;
    status: 'pending' | 'notified' | 'resolved' | 'dismissed';
    resolved_by?: string;
    resolved_at?: Date;
    metadata?: Record<string, unknown>;
    created_at: Date;
}

export interface DbAIEmployeeMetrics {
    id: string;
    tenant_id: number;
    persona_id: string;
    metric_date: Date;
    calls_inbound: number;
    calls_outbound: number;
    whatsapp_msgs: number;
    escalations: number;
    leads_qualified: number;
    site_visits_booked: number;
    avg_call_duration_sec: number;
    avg_response_latency_ms: number;
    csat_score?: number;
    created_at: Date;
}

// ═══════════════════════════════════════════════════════════════════
// Persona Configuration Types
// ═══════════════════════════════════════════════════════════════════

export interface PersonaConfig {
    personality: string;
    tone: string;
    language_style: string;
    greeting_style: string;
    patience_level: 'low' | 'medium' | 'high';
    humor: string;
    filler_words: string[];
}

export interface VoiceConfig {
    hindi_voice: string;
    english_voice: string;
    code_mix_voice: string;
    speed: number;
    pitch: number;
}

export interface KnowledgeScope {
    projects: string;
    faqs: string;
    inventory: string;
    boundaries: string;
}

export interface EscalationRules {
    discount_request?: EscalationRule;
    legal_question?: EscalationRule;
    negative_sentiment_below?: number;
    booking_intent?: EscalationRule;
    conversation_confusion?: EscalationRule;
    max_conversation_minutes?: number;
}

export interface EscalationRule {
    action: 'notify' | 'warm_transfer' | 'human_takeover';
    role: string;
}

// ═══════════════════════════════════════════════════════════════════
// Conversation State (Working Memory)
// ═══════════════════════════════════════════════════════════════════

export interface ConversationState {
    turn_count: number;
    language_detected: SupportedLanguage;
    emotion_trend: EmotionLabel[];
    current_goal: string;
    missing_info: string[];
    objections_raised: string[];
    documents_shared: string[];
    next_action: string;
    conversation_started_at: string; // ISO timestamp
    last_user_message?: string;
    last_rohan_message?: string;
}

export type ChannelType = 'voice' | 'whatsapp' | 'outbound';

export type SupportedLanguage =
    | 'hindi'
    | 'english'
    | 'hinglish'
    | 'tamil'
    | 'telugu'
    | 'kannada'
    | 'marathi'
    | 'bengali'
    | 'gujarati'
    | 'punjabi'
    | 'malayalam'
    | 'odia'
    | 'unknown';

export type EmotionLabel =
    | 'excited'
    | 'interested'
    | 'neutral'
    | 'skeptical'
    | 'anxious'
    | 'frustrated'
    | 'angry'
    | 'confused';

// ═══════════════════════════════════════════════════════════════════
// Reasoning Output (Track B — Chain-of-Thought)
// ═══════════════════════════════════════════════════════════════════

/**
 * The structured output of Rohan's background reasoning track.
 * This is generated asynchronously (Track B) and does NOT block
 * the fast response (Track A). It enriches the context for the
 * NEXT conversation turn.
 */
export interface ReasoningOutput {
    intent: string;
    emotion: EmotionLabel;
    emotion_score: number; // -1.0 to 1.0
    stage: BuyerJourneyStage;
    missing_info: string[];
    objection?: {
        type: ObjectionType;
        text: string;
    };
    action: ActionType;
    response: string;          // suggested response (Track B's draft)
    crm_update: CRMUpdate;
    next_goal: string;
    should_escalate: boolean;
    escalation_type?: EscalationType;
}

export type BuyerJourneyStage =
    | 'awareness'
    | 'interest'
    | 'consideration'
    | 'intent'
    | 'evaluation'
    | 'ready_to_book'
    | 'post_booking'
    | 'nurture'
    | 'cold';

export type ObjectionType =
    | 'price'
    | 'location'
    | 'timing'
    | 'trust'
    | 'competition'
    | 'financing'
    | 'family_decision'
    | 'not_interested'
    | 'none';

export type ActionType =
    | 'respond'
    | 'ask_question'
    | 'schedule_visit'
    | 'send_document'
    | 'escalate_to_human'
    | 'end_conversation';

export type EscalationType =
    | 'discount_request'
    | 'legal_question'
    | 'negative_sentiment'
    | 'booking_intent'
    | 'confusion'
    | 'max_duration_reached';

export interface CRMUpdate {
    lead_score_delta?: number;   // e.g., +10 for hot signal
    stage_change?: string;        // new stage name
    sentiment?: string;           // 'Hot' | 'Warm' | 'Cold'
    notes?: string;               // interaction note to append
    next_followup_at?: string;    // ISO timestamp
    tags_to_add?: string[];
}

// ═══════════════════════════════════════════════════════════════════
// Cognitive Loop Input/Output Contracts
// ═══════════════════════════════════════════════════════════════════

/**
 * The unified input that any channel (voice, WhatsApp, outbound)
 * sends to the Cognitive Loop.
 */
export interface CognitiveInput {
    tenant_id: number;
    persona_id: string;
    lead_id?: string;
    channel: ChannelType;
    user_message: string;          // transcribed text (voice) or raw text (WhatsApp)
    user_phone?: string;
    detected_language?: SupportedLanguage;
    is_first_turn?: boolean;
    metadata?: {
        call_id?: string;
        audio_format?: string;
        confidence_score?: number;  // ASR confidence
    };
}

/**
 * The fast response from Track A — returned immediately to the caller.
 * This is what gets spoken (TTS) or sent (WhatsApp) right away.
 */
export interface FastResponse {
    text: string;                  // the response text
    language: SupportedLanguage;   // language to respond in
    filler_prefix?: string;        // optional filler ("hmm", "theek hai") for naturalness
    confidence: number;            // 0.0 to 1.0
    latency_ms: number;            // actual measured latency
}

/**
 * The complete result of a cognitive cycle.
 * Track A (fast) is returned synchronously.
 * Track B (reasoning) is returned as a promise that resolves later.
 */
export interface CognitiveResult {
    fast_response: FastResponse;
    reasoning_promise: Promise<ReasoningOutput>;  // resolves in background
    memory_id: string;
    turn_number: number;
}

// ═══════════════════════════════════════════════════════════════════
// Context Bundle (loaded at conversation start)
// ═══════════════════════════════════════════════════════════════════

/**
 * Everything Rohan needs to know before responding.
 * Assembled by the Memory Layer from Redis (short-term),
 * PostgreSQL (working memory), and Vector DB (long-term).
 */
export interface RohanContext {
    persona: DbAIEmployeePersona;
    lead?: {
        id: string;
        name: string;
        phone?: string;
        email?: string;
        status: string;
        source?: string;
        project_id?: string;
        budget_min?: number;
        budget_max?: number;
        ai_score?: number;
        sentiment?: string;
        nurture_stage?: string;
        notes?: string;
        tags?: string[];
    };
    project?: {
        id: string;
        name: string;
        location?: string;
        price_range_min?: number;
        price_range_max?: number;
        amenities?: string[];
        description?: string;
        available_units?: number;
    };
    recent_interactions: Array<{
        id: string;
        type: string;
        note: string;
        outcome?: string;
        created_at: Date;
    }>;
    conversation_state: ConversationState;
    last_reasoning?: ReasoningOutput;  // Track B's previous output
    semantic_memories?: Array<{       // from Vector DB
        content: string;
        score: number;
        metadata?: Record<string, unknown>;
    }>;
}

// ═══════════════════════════════════════════════════════════════════
// Channel Adapter Contracts
// ═══════════════════════════════════════════════════════════════════

export interface VoiceAdapterConfig {
    media_server_url: string;      // FreeSWITCH WebSocket URL
    asr_provider: 'sarvam' | 'deepgram' | 'whisper';
    asr_api_key?: string;
    tts_provider: 'sarvam' | 'cartesia' | 'elevenlabs';
    tts_api_key?: string;
    sample_rate: number;            // 16000
    vad_threshold: number;          // 0.5 default
    barge_in_enabled: boolean;
}

export interface WhatsAppAdapterConfig {
    // Uses existing whatsapp.ts sendWhatsappMessage
    inbound_webhook_path: string;   // '/api/rohan/whatsapp/webhook'
    auto_reply_delay_ms: number;     // simulate human typing delay
    max_message_length: number;      // WhatsApp limit ~4096
}

export interface OutboundAdapterConfig {
    sip_provider: 'exotel' | 'twilio' | 'jio';
    sip_api_key?: string;
    max_concurrent_calls: number;
    calling_hours: {
        start: number;  // 9 (9 AM)
        end: number;    // 21 (9 PM)
    };
    timezone: string;  // 'Asia/Kolkata'
}

// ═══════════════════════════════════════════════════════════════════
// Error Types
// ═══════════════════════════════════════════════════════════════════

export class RohanError extends Error {
    constructor(
        message: string,
        public code: string,
        public statusCode: number = 500,
        public context?: Record<string, unknown>
    ) {
        super(message);
        this.name = 'RohanError';
    }
}

export class PersonaNotFoundError extends RohanError {
    constructor(tenantId: number) {
        super(`No active AI persona found for tenant ${tenantId}`, 'PERSONA_NOT_FOUND', 404);
    }
}

export class MemoryLoadError extends RohanError {
    constructor(leadId: string, reason: string) {
        super(`Failed to load memory for lead ${leadId}: ${reason}`, 'MEMORY_LOAD_ERROR', 500);
    }
}

export class ReasoningError extends RohanError {
    constructor(reason: string) {
        super(`Track B reasoning failed: ${reason}`, 'REASONING_ERROR', 500);
    }
}

/**
 * ZentrixCRM — Server-side Model Type Definitions & AI Contracts
 * Mirror of the PostgreSQL schema and AI Employee configurations
 */

// ═══════════════════════════════════════════════════════════════════
// Core Database Row Types (mirror of SQL schema)
// ═══════════════════════════════════════════════════════════════════

export interface DbUser {
    id: string;
    tenant_id: string;
    name: string;
    email: string;
    password_hash: string;
    role: 'admin' | 'sales_manager' | 'team_leader' | 'agent' | 'customer' | 'broker' | 'superadmin';
    avatar?: string;
    phone?: string;
    department?: string;
    is_active: boolean;
    last_login_at?: Date;
    reports_to?: string | null;
    telephony_agent_id?: string | null;
    xp?: number;
    created_at: Date;
    updated_at?: Date;
}

export interface DbTenant {
    id: string;
    name: string;
    subdomain: string;
    logo_url?: string;
    primary_color?: string;
    max_users: number;
    plan?: string;
    is_active: boolean;
    features?: Record<string, boolean>;
    created_at: Date;
}

export interface DbLead {
    id: string;
    tenant_id: string;
    name: string;
    email?: string;
    phone?: string;
    status: string;
    source?: string;
    project_id?: string;
    budget_min?: number;
    budget_max?: number;
    assigned_to?: string;
    notes?: string;
    tags?: string[];
    ai_score?: number;
    ai_summary?: string;
    ai_recommendation?: string;
    sentiment?: string;
    nurture_stage?: string;
    last_interaction_at?: Date;
    next_followup_at?: Date;
    created_at: Date;
    updated_at?: Date;
}

export interface DbProject {
    id: string;
    tenant_id: string;
    name: string;
    location?: string;
    type?: string;
    status?: string;
    total_units?: number;
    available_units?: number;
    price_range_min?: number;
    price_range_max?: number;
    amenities?: string[];
    description?: string;
    image_url?: string;
    created_at: Date;
}

export interface DbBooking {
    id: string;
    tenant_id: string;
    lead_id: string;
    project_id: string;
    unit_id?: string;
    amount: number;
    status: string;
    booking_date: Date;
    created_at: Date;
}

export interface DbNotification {
    id: string;
    tenant_id: string;
    type: string;
    title: string;
    message: string;
    read: boolean;
    from_user_id?: string;
    to_user_id?: string;
    lead_id?: string;
    metadata?: Record<string, unknown>;
    created_at: Date;
}

export interface DbAuditLog {
    id: string;
    tenant_id?: string;
    user_id?: string;
    action: string;
    entity_type?: string;
    entity_id?: string;
    details?: Record<string, unknown>;
    ip_address?: string;
    created_at: Date;
}

// ═══════════════════════════════════════════════════════════════════
// AI Employee Database Row Types
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
    customer_requested_human?: EscalationRule;
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
    turn_effectiveness?: number | null; // scale of 1 to 5
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
    | 'max_duration_reached'
    | 'customer_requested_human';

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

export interface FastResponse {
    text: string;                  // the response text
    language: SupportedLanguage;   // language to respond in
    filler_prefix?: string;        // optional filler ("hmm", "theek hai") for naturalness
    confidence: number;            // 0.0 to 1.0
    latency_ms: number;            // actual measured latency
}

export interface CognitiveResult {
    fast_response: FastResponse;
    reasoning_promise: Promise<ReasoningOutput>;  // resolves in background
    memory_id: string;
    turn_number: number;
}

// ═══════════════════════════════════════════════════════════════════
// Context Bundle (loaded at conversation start)
// ═══════════════════════════════════════════════════════════════════

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
        budget?: string;
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
        priceRange?: string;
        amenities?: string[];
        description?: string;
        availableUnits?: number;
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
    battle_card?: {
        id: string;
        projectName: string;
        usp?: string[];
        objections?: Array<{
            type: string;
            text: string;
            strategy: string;
        }>;
    };
}

// ═══════════════════════════════════════════════════════════════════
// Three-Tier Memory — Tiers & Degradation Telemetry
// ═══════════════════════════════════════════════════════════════════

/**
 * The three memory tiers, ordered from fastest/cheapest to slowest/richest.
 * Used for telemetry, health reporting, and graceful-degradation decisions.
 */
export enum MemoryTier {
    /** Tier 1 — Redis short-term cache (sub-ms, 1h TTL). */
    REDIS = 'redis',
    /** Tier 2 — PostgreSQL durable working memory. */
    POSTGRES = 'postgres',
    /** Tier 3 — pgvector semantic RAG over past conversations + knowledge. */
    VECTOR = 'vector',
}

/**
 * Which tier actually served a given memory operation. Populated by
 * RohanMemory on every read so the cognitive loop and health endpoint
 * can observe degradation in real time.
 */
export interface MemoryProvenance {
    /** The highest tier that successfully responded. */
    served_by: MemoryTier;
    /** Tiers that were attempted but failed/degraded. */
    degraded_tiers: MemoryTier[];
    /** Latency of the serving call in milliseconds. */
    latency_ms: number;
    /** Whether the result came from a cache hit (no DB/vector round-trip). */
    cache_hit: boolean;
}

/**
 * Rolling counters for the memory layer, exposed via getHealthStatus().
 * Lets operators see how often each tier is failing and how often the
 * system is degrading from Redis → PG → Vector.
 */
export interface MemoryDegradationMetrics {
    redis_hits: number;
    redis_misses: number;
    redis_failures: number;
    postgres_hits: number;
    postgres_failures: number;
    vector_hits: number;
    vector_failures: number;
    keyword_fallbacks: number;
    /** Times the circuit breaker opened for Redis. */
    redis_circuit_open_count: number;
}

/**
 * A single recalled past-conversation fragment returned by the vector tier.
 * Richer than the generic semantic_memories entry — carries the source
 * lead/channel so Rohan can cite prior interactions.
 */
export interface ConversationRecall {
    content: string;
    score: number;
    lead_id?: string;
    channel?: ChannelType;
    turn_number?: number;
    created_at?: string;
    metadata?: Record<string, unknown>;
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

// ═══════════════════════════════════════════════════════════════════
// Monika — AI Digital Receptionist Types
// ═══════════════════════════════════════════════════════════════════
//
// Monika is the front-desk AI receptionist. Unlike Rohan (sales associate)
// her job is to:
//   1. Greet & answer general queries (hours, location, projects, contact)
//   2. Schedule meetings and site visits
//   3. Route / hand off the call to the right party:
//        - Surendra  → human manager (discounts, complaints, legal, complex)
//        - Rohan     → AI sales agent (project details, pricing, booking intent)
//   4. Take messages when the requested party is unavailable
//
// She reuses the same persona table, three-tier memory, and two-track
// cognitive loop architecture as Rohan, but with a receptionist-specific
// reasoning schema and routing rules.
// ═══════════════════════════════════════════════════════════════════

/** Roles an AI digital employee can play (used for persona selection). */
export type AIEmployeeRole = 'rohan' | 'neha' | 'monika';

/**
 * The party Monika can hand a call off to.
 *  - surendra : human sales manager (real person)
 *  - rohan    : AI sales agent (digital employee)
 *  - neha     : AI accountant (digital employee)
 *  - voicemail : take a message / voicemail when nobody is available
 */
export type HandoffTarget = 'surendra' | 'rohan' | 'neha' | 'voicemail';

/** What Monika can do in a single turn (extends the sales ActionType). */
export type ReceptionistAction =
    | 'answer_query'
    | 'schedule_meeting'
    | 'schedule_site_visit'
    | 'route_to_sales'        // hand off to Rohan (AI sales agent)
    | 'route_to_manager'      // hand off to Surendra (human manager)
    | 'route_to_accounts'     // hand off to Neha (AI accountant)
    | 'take_message'
    | 'end_conversation';

/** Caller intent categories Monika classifies (receptionist-specific). */
export type ReceptionistIntent =
    | 'general_inquiry'       // hours, address, who to contact
    | 'project_inquiry'       // wants project/property details → Rohan
    | 'pricing_inquiry'       // wants price/discount → Surendra/Rohan
    | 'schedule_meeting'      // wants to book a meeting
    | 'schedule_site_visit'   // wants to visit a site
    | 'speak_to_manager'      // explicitly asks for manager → Surendra
    | 'speak_to_sales'        // explicitly asks for sales → Rohan
    | 'speak_to_accounts'     // payment/invoice/finance query → Neha
    | 'complaint'             // grievance → Surendra
    | 'legal_query'           // RERA/legal → Surendra
    | 'booking_intent'        // ready to book → Rohan/Surendra
    | 'wrong_number'
    | 'other';

/** Escalation types specific to the receptionist routing flow. */
export type ReceptionistEscalationType =
    | 'route_to_manager'      // customer wants/needs Surendra
    | 'route_to_sales'        // customer wants/needs Rohan
    | 'route_to_accounts'     // customer wants/needs Neha
    | 'complaint'
    | 'legal_query'
    | 'booking_intent'
    | 'customer_requested_human';

// ── Receptionist Reasoning Output (Track B) ─────────────────────────

/**
 * Structured analysis Monika's Track B reasoning engine produces each turn.
 * Mirrors ReasoningOutput but with receptionist-specific intents, actions,
 * and a routing decision block.
 */
export interface ReceptionistReasoningOutput {
    intent: ReceptionistIntent;
    emotion: EmotionLabel;
    emotion_score: number;          // -1.0 to 1.0
    /** What the caller is asking about, in plain terms. */
    query_summary: string;
    /** Does the caller explicitly want a specific person/department? */
    requested_party?: HandoffTarget;
    /** Information still needed to fulfil the request. */
    missing_info: string[];
    /** The action Monika should take this turn. */
    action: ReceptionistAction;
    /** Draft of Monika's reply (Track B suggestion). */
    response: string;
    /** Routing decision — populated when action is route_to_*. */
    routing?: ReceptionistRouting;
    /** Scheduling decision — populated when action is schedule_*. */
    scheduling?: ReceptionistScheduling;
    /** CRM updates to apply (lead score, tags, notes). */
    crm_update: CRMUpdate;
    /** What Monika should aim for next turn. */
    next_goal: string;
    /** Whether this turn should trigger a handoff. */
    should_handoff: boolean;
    handoff_target?: HandoffTarget;
    handoff_reason?: string;
}

/** Routing decision block produced when Monika hands a call off. */
export interface ReceptionistRouting {
    target: HandoffTarget;
    /** Why this target was chosen (context-based or customer-requested). */
    reason: 'customer_request' | 'context_based' | 'escalation_rule' | 'fallback';
    /** A short brief for the receiving party (shown on their screen). */
    brief: string;
    /** Transfer mode: warm (introduce first) vs cold (blind transfer). */
    mode: 'warm_transfer' | 'cold_transfer' | 'notify';
}

/** Scheduling decision block produced when Monika books a meeting/visit. */
export interface ReceptionistScheduling {
    type: 'meeting' | 'site_visit';
    /** ISO date-time the caller proposed or Monika suggested. */
    proposed_datetime?: string;
    /** Project/site the visit is for (if a site visit). */
    project_id?: string;
    project_name?: string;
    /** Who the meeting is with (manager/sales). */
    with_party?: HandoffTarget;
    /** Free-text note from the caller (purpose, number of visitors, etc.). */
    note?: string;
    /** Whether the slot was confirmed or still tentative. */
    status: 'proposed' | 'confirmed' | 'tentative';
}

// ── Scheduling DB Row Types ─────────────────────────────────────────

export interface DbMeeting {
    id: string;
    tenant_id: number;
    persona_id: string;          // Monika's persona id
    lead_id?: string;
    caller_name: string;
    caller_phone: string;
    meeting_type: 'meeting' | 'site_visit';
    scheduled_at: string;        // ISO timestamp
    duration_minutes: number;
    project_id?: string;
    project_name?: string;
    with_party: HandoffTarget;
    with_party_user_id?: string;  // human user id when with_party = surendra
    status: 'proposed' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
    note?: string;
    created_by: 'monika' | 'human';
    created_at: string;
    updated_at: string;
}

export interface DbSiteVisit extends DbMeeting {
    meeting_type: 'site_visit';
    number_of_visitors?: number;
    pickup_required: boolean;
    pickup_location?: string;
}

// ── Receptionist Context (extends RohanContext conceptually) ─────────

/**
 * Context bundle loaded at the start of a receptionist call.
 * Lighter than RohanContext — Monika doesn't need the full lead nurture
 * pipeline, but she does need the staff directory for routing.
 */
export interface MonikaContext {
    persona: DbAIEmployeePersona;
    caller?: {
        id?: string;
        name: string;
        phone?: string;
        is_existing_lead: boolean;
        lead_id?: string;
    };
    /** Staff Monika can route to (managers + AI agents). */
    staff_directory: StaffDirectoryEntry[];
    /** Projects Monika can mention / schedule visits for. */
    projects: Array<{
        id: string;
        name: string;
        location?: string;
        site_visit_available: boolean;
    }>;
    /** General FAQs Monika can answer (hours, address, contact). */
    faqs: Array<{ question: string; answer: string }>;
    conversation_state: ConversationState;
    last_reasoning?: ReceptionistReasoningOutput;
    semantic_memories?: Array<{
        content: string;
        score: number;
        metadata?: Record<string, unknown>;
    }>;
}

/** A single entry in the staff directory Monika uses for routing. */
export interface StaffDirectoryEntry {
    user_id?: string;            // present for human staff
    persona_id?: string;         // present for AI staff
    name: string;
    role: HandoffTarget | string;
    title: string;               // "Sales Manager", "AI Sales Agent", etc.
    is_ai: boolean;
    is_available: boolean;
    phone?: string;
    telephony_agent_id?: string;
}

// ── Receptionist Cognitive Loop Contracts ───────────────────────────

export interface ReceptionistCognitiveInput extends CognitiveInput {
    /** Caller phone, used to look up / create the caller record. */
    user_phone?: string;
    /** Caller name if provided by the telephony provider (CNAM). */
    caller_name?: string;
}

export interface ReceptionistCognitiveResult {
    fast_response: FastResponse;
    reasoning_promise: Promise<ReceptionistReasoningOutput>;
    memory_id: string;
    turn_number: number;
    /** If Monika decided to hand off, the routing decision. */
    handoff?: ReceptionistRouting;
    /** If Monika decided to schedule, the scheduling decision. */
    scheduling?: ReceptionistScheduling;
}

// ═══════════════════════════════════════════════════════════════════
// Neha — AI Digital Accountant Types
// ═══════════════════════════════════════════════════════════════════
//
// Neha is the AI Digital Accountant. She mimics a real human accountant
// (Neha) who handles inbound customer calls and:
//   1. Answers finance / accounts / GST / ITR related queries
//   2. Files / initiates GST returns and ITR returns (workflow tasks)
//   3. Handles billing, invoices, payment schedules, installments
//   4. Hands off the call to the real human manager Surendra when:
//        - the customer explicitly asks for a human / manager
//        - the query is outside Neha's scope (legal, audit, complex tax)
//        - the customer is upset / negative sentiment
//        - a filing requires human authorization / signature
//
// She reuses the same persona table, three-tier memory, and two-track
// cognitive loop architecture as Rohan & Monika, but with an
// accountant-specific reasoning schema, filing workflow actions, and
// handoff rules to Surendra.
// ═══════════════════════════════════════════════════════════════════

/** What Neha can do in a single turn (accountant-specific actions). */
export type AccountantAction =
    | 'answer_query'            // explain a finance/tax concept or status
    | 'initiate_gst_filing'      // start a GST return filing workflow
    | 'initiate_itr_filing'      // start an ITR return filing workflow
    | 'check_filing_status'      // look up status of a prior filing
    | 'send_invoice'             // email/WhatsApp an invoice or receipt
    | 'explain_payment_schedule' // walk through installment plan
    | 'route_to_manager'         // hand off to Surendra (human)
    | 'take_message'             // Surendra unavailable — take a message
    | 'end_conversation';

/** Caller intent categories Neha classifies (accountant-specific). */
export type AccountantIntent =
    | 'gst_query'                // GST registration, filing, rates, returns
    | 'itr_query'                // income tax return filing, refund, slab
    | 'invoice_query'           // invoice copy, GST invoice, receipt
    | 'payment_query'           // payment schedule, installment, dues
    | 'filing_status_query'     // status of a filed return / application
    | 'finance_general'         // general accounting / bookkeeping question
    | 'speak_to_manager'        // explicitly asks for Surendra
    | 'complaint'               // grievance about charges / service
    | 'legal_audit_query'       // audit / legal tax matter → Surendra
    | 'wrong_number'
    | 'other';

/** Escalation types specific to the accountant handoff flow. */
export type AccountantEscalationType =
    | 'route_to_manager'         // customer wants/needs Surendra
    | 'complaint'
    | 'legal_audit_query'       // audit / legal tax matter
    | 'filing_authorization'    // filing needs human sign-off
    | 'negative_sentiment'
    | 'customer_requested_human'
    | 'max_duration_reached';

/** The party Neha can hand a call off to (accountant scope). */
export type AccountantHandoffTarget = 'surendra' | 'voicemail';

/** A filing workflow Neha can initiate (GST / ITR). */
export type FilingType = 'gst' | 'itr';

/** Status of a filing workflow task. */
export type FilingStatus =
    | 'draft'
    | 'documents_requested'
    | 'documents_received'
    | 'prepared'
    | 'pending_authorization'  // waiting on Surendra / customer sign-off
    | 'filed'
    | 'rejected'
    | 'cancelled';

// ── Accountant Reasoning Output (Track B) ───────────────────────────

/**
 * Structured analysis Neha's Track B reasoning engine produces each turn.
 * Mirrors ReceptionistReasoningOutput but with accountant-specific
 * intents, actions, a filing decision block, and handoff to Surendra.
 */
export interface AccountantReasoningOutput {
    intent: AccountantIntent;
    emotion: EmotionLabel;
    emotion_score: number;          // -1.0 to 1.0
    /** What the caller is asking about, in plain terms. */
    query_summary: string;
    /** Does the caller explicitly want a human / manager? */
    requested_party?: AccountantHandoffTarget;
    /** Information still needed to fulfil the request. */
    missing_info: string[];
    /** The action Neha should take this turn. */
    action: AccountantAction;
    /** Draft of Neha's reply (Track B suggestion). */
    response: string;
    /** Filing decision — populated when action is initiate_*_filing. */
    filing?: AccountantFilingDecision;
    /** CRM updates to apply (lead score, tags, notes). */
    crm_update: CRMUpdate;
    /** What Neha should aim for next turn. */
    next_goal: string;
    /** Whether this turn should trigger a handoff to Surendra. */
    should_handoff: boolean;
    handoff_target?: AccountantHandoffTarget;
    handoff_reason?: string;
}

/** Filing decision block produced when Neha initiates a GST/ITR filing. */
export interface AccountantFilingDecision {
    type: FilingType;
    /** GST return type, e.g. GSTR-1, GSTR-3B. Only for type='gst'. */
    gst_return_type?: string;
    /** Financial year / period the filing is for, e.g. "FY2024-25" or "Jul-2025". */
    period: string;
    /** GSTIN / PAN of the customer (if known / provided). */
    gstin?: string;
    pan?: string;
    /** Documents Neha still needs from the customer to prepare the filing. */
    documents_requested: string[];
    /** Whether the filing is ready to prepare or needs more info. */
    status: FilingStatus;
    /** Free-text note from the caller. */
    note?: string;
}

/** Routing decision block produced when Neha hands a call off to Surendra. */
export interface AccountantRouting {
    target: AccountantHandoffTarget;
    /** Why this target was chosen. */
    reason: 'customer_request' | 'context_based' | 'escalation_rule' | 'fallback';
    /** A short brief for the receiving manager (shown on their screen). */
    brief: string;
    /** Transfer mode. */
    mode: 'warm_transfer' | 'cold_transfer' | 'notify';
}

// ── Filing DB Row Types ──────────────────────────────────────────────

export interface DbFilingTask {
    id: string;
    tenant_id: number;
    persona_id: string;            // Neha's persona id
    lead_id?: string;
    customer_name: string;
    customer_phone: string;
    filing_type: FilingType;       // 'gst' | 'itr'
    gst_return_type?: string;      // GSTR-1, GSTR-3B ... (gst only)
    period: string;                // FY / month
    gstin?: string;
    pan?: string;
    documents_requested: string[];
    documents_received: string[];
    status: FilingStatus;
    assigned_to_manager?: string;  // user_id of Surendra when escalated
    note?: string;
    created_by: 'neha' | 'human';
    created_at: string;
    updated_at: string;
}

// ── Accountant Context ──────────────────────────────────────────────

/**
 * Context bundle loaded at the start of an accountant call.
 * Neha needs the customer's filing history, outstanding dues, and the
 * manager directory for handoff to Surendra.
 */
export interface NehaContext {
    persona: DbAIEmployeePersona;
    caller?: {
        id?: string;
        name: string;
        phone?: string;
        email?: string;
        gstin?: string;
        pan?: string;
        is_existing_customer: boolean;
        lead_id?: string;
    };
    /** Manager Neha can hand off to (Surendra). */
    manager_directory: StaffDirectoryEntry[];
    /** Recent filings for this customer (for status queries). */
    recent_filings: Array<{
        id: string;
        filing_type: FilingType;
        gst_return_type?: string;
        period: string;
        status: FilingStatus;
        created_at: string;
    }>;
    /** Outstanding dues / payment schedule (if any). */
    outstanding_dues: Array<{
        id: string;
        description: string;
        amount: number;
        due_date?: string;
        status: string;
    }>;
    /** Accounts / tax FAQs Neha can answer directly. */
    faqs: Array<{ question: string; answer: string }>;
    conversation_state: ConversationState;
    last_reasoning?: AccountantReasoningOutput;
    semantic_memories?: Array<{
        content: string;
        score: number;
        metadata?: Record<string, unknown>;
    }>;
}

// ── Accountant Cognitive Loop Contracts ──────────────────────────────

export interface AccountantCognitiveInput extends CognitiveInput {
    /** Caller phone, used to look up / create the customer record. */
    user_phone?: string;
    /** Caller name if provided by the telephony provider (CNAM). */
    caller_name?: string;
}

export interface AccountantCognitiveResult {
    fast_response: FastResponse;
    reasoning_promise: Promise<AccountantReasoningOutput>;
    memory_id: string;
    turn_number: number;
    /** If Neha decided to hand off, the routing decision. */
    handoff?: AccountantRouting;
    /** If Neha decided to initiate a filing, the filing decision. */
    filing?: AccountantFilingDecision;
}

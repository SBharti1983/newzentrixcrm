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

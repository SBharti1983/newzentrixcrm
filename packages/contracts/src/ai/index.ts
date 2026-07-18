/**
 * AI & Cognitive Loop Domain API Contracts
 */

export interface IngestKnowledgeRequest {
    tenantId: string;
    title: string;
    content: string;
    tags?: string[];
    source?: string;
}

export interface IngestKnowledgeResponse {
    success: boolean;
    chunksCount: number;
    message?: string;
}

export interface VoiceConversationStateRequest {
    callId: string;
    tenantId: string;
    leadId: string;
    initialMessage?: string;
}

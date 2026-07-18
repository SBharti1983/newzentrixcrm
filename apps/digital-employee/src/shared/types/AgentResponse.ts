import { SupportedLanguage } from '@zentrix/types';

export interface AgentResponse {
    text: string;
    language: SupportedLanguage;
    fillerPrefix?: string;
    confidence: number;
    latencyMs: number;
    actionTaken?: string;
}

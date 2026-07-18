/**
 * Type-safe Feature Flag configurations schemas keys
 */

export interface FeatureFlagConfig {
    enabled: boolean;
    whitelistTenants?: string[];
    whitelistUsers?: string[];
    rolloutPercentage?: number; // 0 to 100
}

export const FEATURES = {
    AI_CALL_TRANSCRIPTION: 'ai-call-transcription',
    AUTO_PILOT_NURTURE: 'auto-pilot-nurture',
    COMMISSION_TRACKER_V2: 'commission-tracker-v2'
} as const;

export type FeatureKey = typeof FEATURES[keyof typeof FEATURES];

export const defaultFlags: Record<FeatureKey, FeatureFlagConfig> = {
    [FEATURES.AI_CALL_TRANSCRIPTION]: {
        enabled: true,
        rolloutPercentage: 100
    },
    [FEATURES.AUTO_PILOT_NURTURE]: {
        enabled: false,
        whitelistTenants: ['tenant-premium', 'tenant-beta']
    },
    [FEATURES.COMMISSION_TRACKER_V2]: {
        enabled: true,
        rolloutPercentage: 25 // 25% gradual rollout
    }
};

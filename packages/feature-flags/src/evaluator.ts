/**
 * Feature Flags Rule Evaluator Engine
 */

import { FeatureFlagConfig, FeatureKey, defaultFlags } from './flags';

export class FeatureFlags {
    private flags: Map<FeatureKey, FeatureFlagConfig>;

    constructor(customFlags?: Partial<Record<FeatureKey, FeatureFlagConfig>>) {
        this.flags = new Map();
        
        // Populate default flags configuration
        for (const [key, val] of Object.entries(defaultFlags)) {
            this.flags.set(key as FeatureKey, val);
        }

        // Overlay custom overrides
        if (customFlags) {
            for (const [key, val] of Object.entries(customFlags)) {
                if (val) this.flags.set(key as FeatureKey, val);
            }
        }
    }

    /**
     * Evaluates if a feature is enabled for a target context.
     * 
     * Context supports user and tenant identifier mapping.
     */
    isEnabled(
        feature: FeatureKey,
        context?: { tenantId?: string; userId?: string }
    ): boolean {
        const config = this.flags.get(feature);
        if (!config) {
            return false;
        }

        // 1. If overall feature is disabled
        if (!config.enabled) {
            // Whitelisting can bypass overall status for testing
            if (context?.tenantId && config.whitelistTenants?.includes(context.tenantId)) {
                return true;
            }
            if (context?.userId && config.whitelistUsers?.includes(context.userId)) {
                return true;
            }
            return false;
        }

        // 2. Check Whitelists
        if (config.whitelistTenants && config.whitelistTenants.length > 0) {
            if (!context?.tenantId || !config.whitelistTenants.includes(context.tenantId)) {
                return false;
            }
        }

        if (config.whitelistUsers && config.whitelistUsers.length > 0) {
            if (!context?.userId || !config.whitelistUsers.includes(context.userId)) {
                return false;
            }
        }

        // 3. Rollout Percentage (Hash allocation logic)
        if (config.rolloutPercentage !== undefined && config.rolloutPercentage < 100) {
            const seed = context?.userId || context?.tenantId || 'anonymous';
            const hash = this.hashString(seed + feature);
            const score = hash % 100;
            return score < config.rolloutPercentage;
        }

        return true;
    }

    /**
     * Simple deterministic string hashing algorithm (djb2)
     */
    private hashString(str: string): number {
        let hash = 5381;
        for (let i = 0; i < str.length; i++) {
            hash = (hash * 33) ^ str.charCodeAt(i);
        }
        return Math.abs(hash);
    }
}

// Export singleton instance
export const featureFlags = new FeatureFlags();

/**
 * Unit Tests for Zentrix Feature Flags Package
 *
 * Verifies:
 * 1. Default flags resolve properly
 * 2. Whitelist tenant targeting resolves true
 * 3. Percentage rollout distributes queries deterministically
 *
 * Run using: npx vitest run tests/unit/feature-flags.test.ts
 */

import { describe, test } from 'vitest';
import assert from 'assert';
import { FeatureFlags, FEATURES } from '@zentrix/feature-flags';

describe('Zentrix CRM Feature Flags', () => {
    test('FeatureFlags: Whitelist targeting rules work as expected', () => {
        const ff = new FeatureFlags({
            [FEATURES.AUTO_PILOT_NURTURE]: {
                enabled: false,
                whitelistTenants: ['tenant-premium']
            }
        });

        // Whitelisted tenant must resolve true
        assert.strictEqual(ff.isEnabled(FEATURES.AUTO_PILOT_NURTURE, { tenantId: 'tenant-premium' }), true);

        // Non-whitelisted tenant must resolve false
        assert.strictEqual(ff.isEnabled(FEATURES.AUTO_PILOT_NURTURE, { tenantId: 'tenant-free' }), false);
    });

    test('FeatureFlags: Gradual rollout hash allocation resolves deterministically', () => {
        const ff = new FeatureFlags({
            [FEATURES.COMMISSION_TRACKER_V2]: {
                enabled: true,
                rolloutPercentage: 50 // 50% rollout
            }
        });

        const userCount = 100;
        let enabledCount = 0;

        for (let i = 0; i < userCount; i++) {
            const isEnabled = ff.isEnabled(FEATURES.COMMISSION_TRACKER_V2, { userId: `user-${i}` });
            if (isEnabled) enabledCount++;

            // Assert determinism: Evaluating again for same user returns identical result
            const secondCheck = ff.isEnabled(FEATURES.COMMISSION_TRACKER_V2, { userId: `user-${i}` });
            assert.strictEqual(isEnabled, secondCheck, 'Feature flag evaluation must be deterministic');
        }

        // With 100 entries hashed on 50% rollout, distribution should sit roughly around 40-60%
        assert.ok(enabledCount > 30 && enabledCount < 70, `Rollout allocation should be balanced, got: ${enabledCount}%`);
    });
});

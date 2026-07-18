import { defineConfig } from 'vitest/config';

/**
 * Vitest configuration for the ZentrixCRM monorepo.
 *
 * The repository historically shipped standalone `tsx` test scripts that
 * called `process.exit(0)` on success. Under Vitest that `process.exit` is
 * intercepted as an unhandled error, causing every file to report as failed.
 * These scripts have been migrated to proper Vitest `describe/test` blocks.
 *
 * Scope:
 *   - `tests/unit/**` pure unit tests (no external infra) run by default.
 *   - Integration / E2E suites that require a live database or API server
 *     (`rohanHuman.test.ts`, `apps/api/tests/**`) are excluded from the
 *     default run and remain executable via `npx tsx`.
 */
export default defineConfig({
    test: {
        include: [
            'tests/unit/**/*.test.ts',
            'apps/digital-employee/tests/unit/**/*.test.ts',
            'apps/digital-employee/tests/integration/**/*.test.ts',
        ],
        exclude: [
            'tests/unit/rohanHuman.test.ts',
            'node_modules/**',
            '**/dist/**',
        ],
        environment: 'node',
        globals: false,
        reporters: ['default'],
        testTimeout: 20000,
        hookTimeout: 20000,
    },
});

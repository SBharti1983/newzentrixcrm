/**
 * @zentrix/config — Centralized Environment Configuration
 *
 * Single source of truth for all environment variables across the monorepo.
 * Validates required vars at startup — crashes fast with clear errors
 * instead of failing mid-request with cryptic undefined errors.
 *
 * Usage: import { config } from '@zentrix/config';
 */

function requireEnv(key: string): string {
    const val = process.env[key];
    if (!val) {
        throw new Error(
            `❌ Missing required environment variable: ${key}\n` +
            `   Add it to your .env file or deployment config.`
        );
    }
    return val;
}

function optionalEnv(key: string, fallback: string): string {
    return process.env[key] || fallback;
}

function optionalInt(key: string, fallback: number): number {
    const val = process.env[key];
    return val ? parseInt(val, 10) : fallback;
}

function optionalBool(key: string, fallback: boolean): boolean {
    const val = process.env[key];
    if (!val) return fallback;
    return val === 'true' || val === '1';
}

// ═══════════════════════════════════════════════════════════════════
// Lazy-loaded config (validates on first access, not at import time)
// ═══════════════════════════════════════════════════════════════════

let _config: ReturnType<typeof buildConfig> | null = null;

function buildConfig() {
    return {
        // ── App ──────────────────────────────────────────────────
        env: optionalEnv('NODE_ENV', 'development'),
        isProduction: process.env.NODE_ENV === 'production',
        isDevelopment: process.env.NODE_ENV !== 'production',

        // ── Database ─────────────────────────────────────────────
        database: {
            url: requireEnv('DATABASE_URL'),
            poolMin: optionalInt('DB_POOL_MIN', 2),
            poolMax: optionalInt('DB_POOL_MAX', 10),
            ssl: optionalBool('DB_SSL', true),
        },

        // ── Redis ────────────────────────────────────────────────
        redis: {
            url: optionalEnv('REDIS_URL', 'redis://localhost:6379'),
            maxRetries: optionalInt('REDIS_MAX_RETRIES', 3),
        },

        // ── AI / Gemini ──────────────────────────────────────────
        ai: {
            geminiApiKey: optionalEnv('GEMINI_API_KEY', ''),
            model: optionalEnv('GEMINI_MODEL', 'gemini-2.0-flash'),
            temperature: parseFloat(optionalEnv('AI_TEMPERATURE', '0.7')),
        },

        // ── Voice (Digital Employee) ─────────────────────────────
        voice: {
            wsPort: optionalInt('VOICE_WS_PORT', 5060),
            healthPort: optionalInt('VOICE_HEALTH_PORT', 5061),
            sarvamApiKey: optionalEnv('SARVAM_API_KEY', ''),
        },

        // ── API Server ───────────────────────────────────────────
        server: {
            port: optionalInt('PORT', 5001),
            host: optionalEnv('HOST', '0.0.0.0'),
            frontendUrl: optionalEnv('FRONTEND_URL', 'http://localhost:5174'),
            jwtSecret: optionalEnv('JWT_SECRET', 'dev-secret-change-me'),
        },

        // ── External Services ────────────────────────────────────
        services: {
            sentryDsn: optionalEnv('SENTRY_DSN', ''),
            whatsappToken: optionalEnv('WHATSAPP_TOKEN', ''),
            whatsappPhoneId: optionalEnv('WHATSAPP_PHONE_ID', ''),
            firebaseProjectId: optionalEnv('FIREBASE_PROJECT_ID', ''),
        },

        // ── Feature Flags ────────────────────────────────────────
        features: {
            enableVoice: optionalBool('FEATURE_VOICE', true),
            enableWhatsApp: optionalBool('FEATURE_WHATSAPP', true),
            enableAIScreener: optionalBool('FEATURE_AI_SCREENER', true),
            enableAnalytics: optionalBool('FEATURE_ANALYTICS', true),
        },
    };
}

/**
 * Access the config singleton. Validates on first call.
 */
export function getConfig() {
    if (!_config) {
        _config = buildConfig();
    }
    return _config;
}

// Also export as a direct getter for convenience
export const config = new Proxy({} as ReturnType<typeof buildConfig>, {
    get(_, prop) {
        return getConfig()[prop as keyof ReturnType<typeof buildConfig>];
    },
});

// Re-export helpers for custom usage
export { requireEnv, optionalEnv, optionalInt, optionalBool };

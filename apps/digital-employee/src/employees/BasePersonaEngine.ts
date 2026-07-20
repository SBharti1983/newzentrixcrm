/**
 * BasePersonaEngine — Shared persona loading, caching, voice & filler logic.
 *
 * Extracts the common infrastructure duplicated across RohanPersonaEngine,
 * MonikaPersonaEngine, and NehaPersonaEngine:
 *   - In-memory persona cache (5-min TTL) keyed by tenantId
 *   - DB lookup against `ai_employee_personas` filtered by role
 *   - getPersonaByRole() for cross-persona lookups (e.g. Monika loading Rohan)
 *   - invalidateCache()
 *   - getVoiceForLanguage() — identical Indian-language branching for all three
 *   - getTTSParams() — speed/pitch extraction
 *   - getRandomFiller() — random filler word selection
 *
 * Subclasses implement only the role-specific logic:
 *   - buildSystemPrompt()      — identity + knowledge + context + track blocks
 *   - evaluateEscalation() / evaluateRouting()
 *   - generateGreeting()
 *
 * NOTE: This module runs inside apps/digital-employee — isolated from CRM API.
 */

import { pool } from '@zentrix/database';
import { logger } from '@zentrix/logger';
import {
    DbAIEmployeePersona,
    SupportedLanguage,
    AIEmployeeRole,
    PersonaNotFoundError,
} from '@zentrix/types';
import { RedisBus } from '@zentrix/messaging';

// ── In-memory persona cache (refreshed every 5 min) ─────────────────
interface PersonaCacheEntry {
    persona: DbAIEmployeePersona;
    cached_at: number;
    /**
     * Snapshot of the persona row's `updated_at` at cache-fill time.
     * Used by the version probe (item 2.3) to detect stale cache entries
     * even when the Redis `persona:updated` invalidation (item 2.2) is
     * missed (e.g. Redis briefly down, pod restarts mid-update, or an
     * admin path that doesn't fire NOTIFY).
     */
    cached_updated_at: Date;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
/**
 * Within this window after cache-fill, the entry is trusted without a
 * DB probe (the Redis invalidation from item 2.2 covers it). Beyond this
 * window but within CACHE_TTL_MS, we issue a cheap `SELECT updated_at`
 * probe to detect silent staleness. Tuned to keep probe volume low while
 * bounding the stale-window to ~30s.
 */
const CACHE_FRESHNESS_PROBE_MS = 30 * 1000; // 30 seconds

/** Indian languages that share the code-mix / Hindi voice fallback. */
const INDIAN_LANGUAGES: SupportedLanguage[] = [
    'hindi', 'tamil', 'telugu', 'kannada', 'marathi',
    'bengali', 'gujarati', 'punjabi', 'malayalam', 'odia',
];

export abstract class BasePersonaEngine {
    /** The AI employee role this engine manages ('rohan' | 'monika' | 'neha'). */
    protected abstract readonly role: AIEmployeeRole;

    /** Log tag, e.g. '[RohanPersona]'. */
    protected abstract readonly logTag: string;

    /** Whether the primary getPersona() query filters on is_active = TRUE. */
    protected readonly requireActive: boolean = true;

    // Per-engine cache (each subclass instance gets its own map)
    private cache = new Map<number, PersonaCacheEntry>();

    // Keep track of active engine instances for cache invalidation
    private static instances: BasePersonaEngine[] = [];

    constructor() {
        BasePersonaEngine.instances.push(this);
    }

    /** Invalidate cache for all instances for a specific tenant */
    static invalidateAllCaches(tenantId: number): void {
        BasePersonaEngine.instances.forEach(instance => {
            instance.invalidateCache(tenantId);
        });
    }

    // ── Persona Loading ─────────────────────────────────────────────

    /**
     * Load this engine's persona for a tenant, using the in-memory cache.
     * Throws PersonaNotFoundError if no row matches.
     */
    async getPersona(tenantId: number): Promise<DbAIEmployeePersona> {
        const cached = this.cache.get(tenantId);
        if (cached && Date.now() - cached.cached_at < CACHE_TTL_MS) {
            // Within TTL. If the entry is still "fresh" (within
            // CACHE_FRESHNESS_PROBE_MS), trust it + the Redis invalidation
            // from item 2.2 — no DB probe needed.
            if (Date.now() - cached.cached_at < CACHE_FRESHNESS_PROBE_MS) {
                return cached.persona;
            }
            // item 2.3: entry is older than the freshness window but still
            // within TTL. Issue a cheap single-column probe to detect silent
            // staleness (missed NOTIFY, admin path without NOTIFY, etc.).
            // On probe error, fall through to full re-fetch (safe default).
            try {
                const probe = await pool.query(
                    `SELECT updated_at FROM ai_employee_personas
                     WHERE tenant_id = $1 AND role = $2
                     LIMIT 1`,
                    [tenantId, this.role]
                );
                if (probe.rows.length === 0) {
                    // Row vanished underneath us — drop cache and throw.
                    this.cache.delete(tenantId);
                    throw new PersonaNotFoundError(tenantId);
                }
                const dbUpdatedAt = new Date(probe.rows[0].updated_at);
                if (dbUpdatedAt.getTime() === cached.cached_updated_at.getTime()) {
                    // Unchanged — bump cached_at so we don't probe again
                    // for another freshness window, then return cached row.
                    cached.cached_at = Date.now();
                    return cached.persona;
                }
                // updated_at changed → fall through to full re-fetch.
                logger.info(
                    `${this.logTag} Persona row updated_at changed for tenant ${tenantId} ` +
                    `(cached=${cached.cached_updated_at.toISOString()}, db=${dbUpdatedAt.toISOString()}) — re-fetching (item 2.3)`
                );
            } catch (err) {
                if (err instanceof PersonaNotFoundError) throw err;
                // Probe failed (transient DB error) — serve stale cache
                // rather than failing the turn. Log and return cached.
                logger.warn(
                    `${this.logTag} updated_at probe failed for tenant ${tenantId}: ${err}. Serving cached persona.`
                );
                return cached.persona;
            }
        }

        try {
            const query = this.requireActive
                ? `SELECT * FROM ai_employee_personas
                   WHERE tenant_id = $1 AND role = $2 AND is_active = TRUE
                   LIMIT 1`
                : `SELECT * FROM ai_employee_personas
                   WHERE tenant_id = $1 AND role = $2
                   LIMIT 1`;
            const { rows } = await pool.query(query, [tenantId, this.role]);

            if (rows.length === 0) {
                throw new PersonaNotFoundError(tenantId);
            }

            const persona = rows[0] as DbAIEmployeePersona;
            this.cache.set(tenantId, {
                persona,
                cached_at: Date.now(),
                cached_updated_at: new Date(persona.updated_at),
            });
            return persona;
        } catch (err) {
            if (err instanceof PersonaNotFoundError) throw err;
            logger.error(`${this.logTag} Failed to load persona for tenant ${tenantId}: ${err}`);
            throw new PersonaNotFoundError(tenantId);
        }
    }

    /**
     * Load any persona by role for a tenant (no cache, no is_active filter).
     * Used by Monika/Neha to look up Rohan/other personas for the staff directory.
     */
    async getPersonaByRole(tenantId: number, role: AIEmployeeRole): Promise<DbAIEmployeePersona> {
        try {
            const { rows } = await pool.query(
                `SELECT * FROM ai_employee_personas
                 WHERE tenant_id = $1 AND role = $2
                 LIMIT 1`,
                [tenantId, role]
            );
            if (rows.length === 0) throw new PersonaNotFoundError(tenantId);
            return rows[0] as DbAIEmployeePersona;
        } catch (err) {
            if (err instanceof PersonaNotFoundError) throw err;
            logger.error(`${this.logTag} Failed to load persona role=${role} tenant=${tenantId}: ${err}`);
            throw new PersonaNotFoundError(tenantId);
        }
    }

    /** Invalidate the cached persona for a tenant (e.g. after a DB update). */
    invalidateCache(tenantId: number): void {
        this.cache.delete(tenantId);
        logger.info(`${this.logTag} Cache invalidated for tenant ${tenantId}`);
    }

    // ── Voice Configuration ─────────────────────────────────────────

    /**
     * Select the TTS voice ID for a given language.
     * Identical branching for all three employees:
     *   - english → english_voice
     *   - hinglish or any Indian language → code_mix_voice (fallback hindi_voice)
     *   - default → hindi_voice
     */
    getVoiceForLanguage(
        persona: DbAIEmployeePersona,
        language: SupportedLanguage
    ): string {
        const voiceConfig = persona.voice_config;

        if (language === 'english') {
            return voiceConfig.english_voice;
        }

        if (language === 'hinglish' || INDIAN_LANGUAGES.includes(language)) {
            return voiceConfig.code_mix_voice || voiceConfig.hindi_voice;
        }

        return voiceConfig.hindi_voice;
    }

    /** Extract TTS speed/pitch params, defaulting to 1.0. */
    getTTSParams(persona: DbAIEmployeePersona): { speed: number; pitch: number } {
        const vc = persona.voice_config;
        return {
            speed: vc.speed || 1.0,
            pitch: vc.pitch || 1.0,
        };
    }

    // ── Filler Word Injection ────────────────────────────────────────

    /** Return a random filler word from the persona config, or null if none. */
    getRandomFiller(persona: DbAIEmployeePersona): string | null {
        const fillers = persona.persona_config.filler_words;
        if (!fillers || fillers.length === 0) return null;
        return fillers[Math.floor(Math.random() * fillers.length)];
    }

    // ── Abstract: subclasses must implement ─────────────────────────

    /**
     * Build the system prompt for a given track ('fast' | 'reasoning').
     * Each employee assembles identity + knowledge + context + track-specific blocks.
     */
    abstract buildSystemPrompt(
        persona: DbAIEmployeePersona,
        context: any,
        track: 'fast' | 'reasoning'
    ): string;

    /**
     * Generate the opening greeting for a new session.
     * Signature varies by employee (Rohan takes projectName + channel; Monika/Neha take channel only).
     */
    abstract generateGreeting(
        persona: DbAIEmployeePersona,
        ...args: any[]
    ): string;
}

// ── Real-Time Cache Invalidation Listener ──────────────────────────────
const redisBus = new RedisBus();
redisBus.connect().then(() => {
    redisBus.subscribe('persona:updated', (payload) => {
        if (payload && payload.tenantId) {
            logger.info(`[BasePersonaEngine] Invalidation event received for tenant ${payload.tenantId}`);
            BasePersonaEngine.invalidateAllCaches(payload.tenantId);
        }
    });
}).catch(err => {
    logger.warn(`[BasePersonaEngine] RedisBus connection bypassed: ${err.message}`);
});

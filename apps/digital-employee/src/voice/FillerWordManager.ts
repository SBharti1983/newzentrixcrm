/**
 * FillerWordManager — Dead-Air Avoidance for the Voice Channel
 *
 * While Rohan is "thinking" (Track A LLM call in flight, before TTS starts),
 * the caller hears silence. To keep the conversation feeling live and natural,
 * this manager schedules a short filler utterance ("hmm", "theek hai", "let me
 * check") to be spoken if the main response hasn't started streaming within
 * a configurable deadline.
 *
 * Lifecycle (per turn):
 *   1. arm()  — called when a user turn is finalized and the cognitive loop starts
 *   2. if the main TTS begins before the deadline → disarm() (filler cancelled)
 *   3. if the deadline elapses → onFillerDue() fires → VoiceAdapter streams a filler
 *   4. once the main response arrives, it streams normally after the filler
 *
 * The filler pool is sourced from the persona's `filler_words` config, with
 * language-aware defaults so it works even before a persona is loaded.
 */

import { logger } from '@zentrix/logger';
import { SupportedLanguage } from '@zentrix/types';

// ── Language-aware default fillers ─────────────────────────────────

export const DEFAULT_FILLERS: Record<SupportedLanguage, string[]> = {
    hindi: ['हम्म', 'ठीक है', 'एक पल', 'सुनिए'],
    hinglish: ['hmm', 'theek hai', 'ek second', 'bataiye'],
    english: ['hmm', 'let me check', 'sure', 'one moment'],
    tamil: ['ம்ம்', 'ஒரு நொடி'],
    telugu: ['హమ్', 'ఒక క్షణం'],
    kannada: ['ಹಮ್', 'ಒಂದು ಕ್ಷಣ'],
    marathi: ['हम्म', 'एक क्षण'],
    bengali: ['হম্ম', 'একটু'],
    gujarati: ['હમ્મ', 'એક પળ'],
    punjabi: ['ਹਮ੍ਮ', 'ਇਕ ਪਲ'],
    malayalam: ['ഹം', 'ഒരു നിമിഷം'],
    odia: ['ହମ୍', 'ଗୋଟିଏ କ୍ଷଣ'],
    unknown: ['hmm', 'one moment'],
};

// ── FillerWordManager ──────────────────────────────────────────────

export interface FillerConfig {
    /** ms after arm() before a filler is due. ~400ms hides LLM cold-start. */
    deadlineMs: number;
    /** Avoid repeating the same filler within this many turns. */
    recentWindow: number;
    /** Cooldown after a filler before another can be armed (ms). */
    cooldownMs: number;
}

const DEFAULT_FILLER_CONFIG: FillerConfig = {
    deadlineMs: 400,
    recentWindow: 3,
    cooldownMs: 1500,
};

export class FillerWordManager {
    private config: FillerConfig;
    private fillers: string[];
    private recent: string[] = [];
    private timer: NodeJS.Timeout | null = null;
    private armed = false;
    private lastFillerAt = 0;
    private onFillerDue?: (filler: string) => void;

    constructor(
        language: SupportedLanguage = 'hinglish',
        personaFillers?: string[],
        onFillerDue?: (filler: string) => void,
        config: Partial<FillerConfig> = {}
    ) {
        this.config = { ...DEFAULT_FILLER_CONFIG, ...config };
        this.fillers = (personaFillers && personaFillers.length ? personaFillers : DEFAULT_FILLERS[language]) || DEFAULT_FILLERS.hinglish;
        this.onFillerDue = onFillerDue;
        logger.info(`[FillerManager] Initialized pool=${this.fillers.length} deadline=${this.config.deadlineMs}ms`);
    }

    /**
     * Arm the filler timer. If the main response starts before the deadline,
     * call disarm() to cancel the filler.
     */
    arm(): void {
        this.disarm();
        if (Date.now() - this.lastFillerAt < this.config.cooldownMs) {
            // Too soon after the last filler — skip this turn.
            return;
        }
        this.armed = true;
        this.timer = setTimeout(() => {
            if (!this.armed) return;
            const filler = this.pickFiller();
            this.armed = false;
            this.lastFillerAt = Date.now();
            logger.info(`[FillerManager] Filler due → "${filler}"`);
            this.onFillerDue?.(filler);
        }, this.config.deadlineMs);
    }

    /**
     * Cancel a pending filler (call when main TTS starts in time).
     */
    disarm(): void {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        this.armed = false;
    }

    /**
     * Update the filler pool (e.g. after persona load) and language.
     */
    setPool(language: SupportedLanguage, personaFillers?: string[]): void {
        this.fillers = (personaFillers && personaFillers.length ? personaFillers : DEFAULT_FILLERS[language]) || DEFAULT_FILLERS.hinglish;
    }

    /**
     * Register the callback invoked when a filler becomes due.
     */
    onDue(callback: (filler: string) => void): void {
        this.onFillerDue = callback;
    }

    isArmed(): boolean {
        return this.armed;
    }

    /**
     * Pick a filler, avoiding recent repeats for variety.
     */
    private pickFiller(): string {
        const available = this.fillers.filter((f) => !this.recent.includes(f));
        const pool = available.length ? available : this.fillers;
        const choice = pool[Math.floor(Math.random() * pool.length)] || 'hmm';
        this.recent.push(choice);
        if (this.recent.length > this.config.recentWindow) this.recent.shift();
        return choice;
    }
}

export default FillerWordManager;

/**
 * Predictable System Clock Provider
 * 
 * Enables mockable date/time overrides during unit and integration test runs.
 */

export class SystemClock {
    private static mockTimeMs: number | null = null;

    /**
     * Get the current date object.
     */
    static now(): Date {
        if (this.mockTimeMs !== null) {
            return new Date(this.mockTimeMs);
        }
        return new Date();
    }

    /**
     * Get the current epoch timestamp.
     */
    static timestampMs(): number {
        if (this.mockTimeMs !== null) {
            return this.mockTimeMs;
        }
        return Date.now();
    }

    /**
     * Lock the clock time to a specific epoch millisecond (Testing utility).
     */
    static setMockTime(timeMs: number | Date): void {
        this.mockTimeMs = typeof timeMs === 'number' ? timeMs : timeMs.getTime();
    }

    /**
     * Clear mock lock and restore live system clock.
     */
    static clearMockTime(): void {
        this.mockTimeMs = null;
    }
}

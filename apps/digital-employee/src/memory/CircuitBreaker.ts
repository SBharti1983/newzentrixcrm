import { logger } from '@zentrix/logger';

export class CircuitBreaker {
    private failures = 0;
    private state: 'closed' | 'open' | 'half-open' = 'closed';
    private openedAt = 0;

    constructor(
        private readonly name: string,
        private readonly failureThreshold: number = 5,
        private readonly resetTimeoutMs: number = 30_000
    ) {}

    get isOpen(): boolean {
        return this.state === 'open';
    }

    /** Returns true if a call may proceed; false if the circuit is open. */
    allow(): boolean {
        if (this.state === 'closed') return true;
        if (this.state === 'open') {
            if (Date.now() - this.openedAt >= this.resetTimeoutMs) {
                this.state = 'half-open';
                logger.info(`[CircuitBreaker:${this.name}] half-open — probing`);
                return true;
            }
            return false;
        }
        // half-open: allow one probe
        return true;
    }

    recordSuccess(): void {
        if (this.state !== 'closed') {
            logger.info(`[CircuitBreaker:${this.name}] recovered → closed`);
        }
        this.failures = 0;
        this.state = 'closed';
    }

    recordFailure(): void {
        this.failures++;
        if (this.state === 'half-open' || this.failures >= this.failureThreshold) {
            this.state = 'open';
            this.openedAt = Date.now();
            logger.warn(
                `[CircuitBreaker:${this.name}] opened after ${this.failures} failures`
            );
        }
    }
}

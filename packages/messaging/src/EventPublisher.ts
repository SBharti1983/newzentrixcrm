/**
 * Unified Event Publisher layer
 * 
 * decouples business dispatches from transport details
 */

import { LocalBus } from './LocalBus';
import { RedisBus } from './RedisBus';
import { EventMap } from '@zentrix/events';

export class EventPublisher {
    constructor(
        public readonly localBus: LocalBus = new LocalBus(),
        public readonly redisBus: RedisBus = new RedisBus()
    ) {}

    /**
     * Propagate event locally and cross-process over Redis
     */
    async publish<K extends keyof EventMap>(event: K, payload: EventMap[K]): Promise<void> {
        // Publish to local process loop
        this.localBus.publish(event, payload);
        
        // Publish to cross-process Redis channel
        await this.redisBus.publish(event, payload);
    }
}

// Export a singleton publisher instance for easy cross-process imports
export const eventPublisher = new EventPublisher();

/**
 * Local in-memory Event Bus implementation
 */

import { EventEmitter } from 'events';
import { EventMap } from '@zentrix/events';

export class LocalBus {
    private emitter = new EventEmitter();

    constructor() {
        // Increase maximum listeners to avoid warning reports
        this.emitter.setMaxListeners(100);
    }

    /**
     * Publish an event locally in-memory
     */
    publish<K extends keyof EventMap>(event: K, payload: EventMap[K]): void {
        this.emitter.emit(event, payload);
    }

    /**
     * Subscribe to local event topic
     */
    subscribe<K extends keyof EventMap>(event: K, handler: (payload: EventMap[K]) => void): void {
        this.emitter.on(event, handler);
    }

    /**
     * Unsubscribe from local event topic
     */
    unsubscribe<K extends keyof EventMap>(event: K, handler: (payload: EventMap[K]) => void): void {
        this.emitter.off(event, handler);
    }
}

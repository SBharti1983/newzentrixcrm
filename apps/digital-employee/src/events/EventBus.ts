import { logger } from '@zentrix/logger';

export interface AppEvent<T = any> {
    eventName: string;
    timestamp: string;
    payload: T;
}

export type EventCallback<T = any> = (event: AppEvent<T>) => void | Promise<void>;

export class EventBus {
    private static instance: EventBus;
    private listeners: Map<string, EventCallback[]> = new Map();

    private constructor() {}

    static getInstance(): EventBus {
        if (!EventBus.instance) {
            EventBus.instance = new EventBus();
        }
        return EventBus.instance;
    }

    subscribe<T>(eventName: string, callback: EventCallback<T>): void {
        const list = this.listeners.get(eventName) || [];
        list.push(callback);
        this.listeners.set(eventName, list);
        logger.info(`[EventBus] Subscribed callback to event "${eventName}"`);
    }

    async publish<T>(eventName: string, payload: T): Promise<void> {
        const list = this.listeners.get(eventName) || [];
        const event: AppEvent<T> = {
            eventName,
            timestamp: new Date().toISOString(),
            payload,
        };

        logger.info(`[EventBus] Publishing event "${eventName}" at ${event.timestamp}`);

        const promises = list.map(cb => {
            try {
                const res = cb(event);
                if (res instanceof Promise) {
                    return res.catch(err => {
                        logger.error(`[EventBus] Error in async listener for "${eventName}": ${err.message}`);
                    });
                }
            } catch (err: any) {
                logger.error(`[EventBus] Error in listener for "${eventName}": ${err.message}`);
            }
            return Promise.resolve();
        });

        await Promise.all(promises);
    }
}

export const eventBus = EventBus.getInstance();

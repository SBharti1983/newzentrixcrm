// Global Event Emitter for triggering Dialer from anywhere
export const dialerEvents = {
    callbacks: [],
    subscribe(cb) { this.callbacks.push(cb); },
    unsubscribe(cb) { this.callbacks = this.callbacks.filter(c => c !== cb); },
    call(id, number, name) { this.callbacks.forEach(cb => cb({ id, number, name })); },
    triggerInbound(id, number, name, details) { this.callbacks.forEach(cb => cb({ id, number, name, isInbound: true, ...details })); }
};

import { EventEmitter } from 'events';

class CRMEventBus extends EventEmitter {
  constructor() {
    super();
    // Allow unlimited listeners for modular event-driven architecture
    this.setMaxListeners(100);
  }

  /**
   * Publish a CRM domain event asynchronously
   * @param {string} eventName e.g., 'deal.stage_changed', 'contact.created'
   * @param {object} payload { orgId, recordType, recordId, record, actorId, ... }
   */
  emitEvent(eventName, payload) {
    console.log(`[EventBus] ⚡ Event emitted: "${eventName}" for ${payload.recordType || 'record'} #${payload.recordId || ''}`);
    // Use setImmediate to decouple caller request cycle from workflow execution
    setImmediate(() => {
      this.emit(eventName, payload);
      this.emit('*', { eventName, ...payload });
    });
  }

  /**
   * Subscribe to a specific CRM domain event
   */
  onEvent(eventName, handler) {
    this.on(eventName, async (...args) => {
      try {
        await handler(...args);
      } catch (err) {
        console.error(`[EventBus Error] Exception handling "${eventName}":`, err);
      }
    });
  }
}

export const eventBus = new CRMEventBus();

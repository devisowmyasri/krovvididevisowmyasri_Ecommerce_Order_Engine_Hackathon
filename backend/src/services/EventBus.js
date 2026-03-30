const EventEmitter = require('events');

class EventBus extends EventEmitter {
  constructor() {
    super();
    this.eventQueue = [];
    this.isProcessing = false;
  }

  // Simulate an ordered event queue (Task 14)
  async emitEvent(event, data) {
    this.eventQueue.push({ event, data });
    console.log(`[EventBus] Queued: ${event}`);
    await this.processQueue();
  }

  async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.eventQueue.length > 0) {
      const { event, data } = this.eventQueue.shift();
      try {
        console.log(`[EventBus] Processing: ${event}`);
        // Synchronous-like execution to ensure order
        await new Promise((resolve, reject) => {
          const listeners = this.listeners(event);
          if (listeners.length === 0) {
            resolve();
            return;
          }

          // In Task 14: failure stops next events
          Promise.all(listeners.map(l => l(data)))
            .then(resolve)
            .catch(reject);
        });
      } catch (error) {
        console.error(`[EventBus] Error in event ${event}: ${error.message}`);
        console.log(`[EventBus] Stopping queue execution for this chain.`);
        this.eventQueue = []; // Clear queue on failure as per Task 14
        break;
      }
    }

    this.isProcessing = false;
  }
}

module.exports = new EventBus();

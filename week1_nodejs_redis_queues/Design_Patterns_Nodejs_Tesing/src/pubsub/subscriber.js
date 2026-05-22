const eventBus = require('./eventBus');

class Subscriber {
    constructor() {
        // Subscribe to the event when the instance is created
        this.setupSubscriptions();
    }

    setupSubscriptions() {
        console.log('[Subscriber] Subscribing to "order_created" events...');
        eventBus.on('order_created', this.handleOrderCreated);
    }

    handleOrderCreated(eventData) {
        console.log(`[Subscriber] Received "order_created" event! Processing Order ID: ${eventData.id}`);
    }
}

module.exports = Subscriber;

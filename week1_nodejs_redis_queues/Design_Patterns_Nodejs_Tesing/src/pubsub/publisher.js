const eventBus = require('./eventBus');

class Publisher {
    publishOrderCreated(orderId) {
        console.log(`[Publisher] Publishing event: order_created for Order ID: ${orderId}`);
        // Emitting the event on the central bus
        eventBus.emit('order_created', { id: orderId, timestamp: Date.now() });
    }
}

module.exports = Publisher;

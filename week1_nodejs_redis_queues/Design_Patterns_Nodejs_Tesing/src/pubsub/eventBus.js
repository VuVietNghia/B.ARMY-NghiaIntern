const EventEmitter = require('events');

// Create a singleton instance of EventEmitter to act as our central Event Bus
class EventBus extends EventEmitter {}

const eventBus = new EventBus();

module.exports = eventBus;

const Logger = require('./di/logger');
const UserService = require('./di/userService');
const Publisher = require('./pubsub/publisher');
const Subscriber = require('./pubsub/subscriber');
const UnreliableService = require('./circuit-breaker/unreliableService');
const CircuitBreaker = require('./circuit-breaker/circuitBreaker');

async function runExamples() {
    console.log("==========================================");
    console.log("1. Dependency Injection Example");
    console.log("==========================================\n");
    
    // We instantiate the dependencies ourselves and inject them
    const logger = new Logger();
    // DI: Passing the logger into the user service constructor
    const userService = new UserService(logger);
    userService.createUser("nghia_intern");

    console.log("\n==========================================");
    console.log("2. Pub/Sub Example");
    console.log("==========================================\n");
    
    const subscriber = new Subscriber(); // Sets up listening
    const publisher = new Publisher();
    
    publisher.publishOrderCreated(1001);
    publisher.publishOrderCreated(1002);

    console.log("\n==========================================");
    console.log("3. Circuit Breaker Example");
    console.log("==========================================\n");
    
    const unreliableService = new UnreliableService();
    // Wrap the unreliable function with the circuit breaker
    // We bind it to ensure 'this' context is correct if needed inside fetchData
    const breaker = new CircuitBreaker(unreliableService.fetchData.bind(unreliableService), {
        failureThreshold: 2,
        successThreshold: 1,
        timeout: 2000 // circuit stays open for 2 seconds
    });

    // Let's fire requests in a loop to see the circuit breaker in action
    for (let i = 1; i <= 10; i++) {
        try {
            console.log(`\n--- Request ${i} ---`);
            const response = await breaker.fire();
            console.log("Success:", response.data);
        } catch (error) {
            console.log("Failed:", error.message);
        }
        
        // Wait 500ms between requests. 
        // With a 2s timeout and 2 failure threshold, it should open quickly, 
        // stay open, and eventually try again.
        await new Promise(resolve => setTimeout(resolve, 500));
    }
}

runExamples().catch(console.error);

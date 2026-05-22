class CircuitBreaker {
    constructor(action, options = {}) {
        this.action = action; // The async function to wrap
        this.failureThreshold = options.failureThreshold || 3;
        this.successThreshold = options.successThreshold || 2;
        this.timeout = options.timeout || 3000; // ms

        this.state = 'CLOSED'; // 'CLOSED', 'OPEN', 'HALF_OPEN'
        this.failureCount = 0;
        this.successCount = 0;
        this.nextAttempt = Date.now();
    }

    async fire(...args) {
        if (this.state === 'OPEN') {
            if (this.nextAttempt <= Date.now()) {
                this.state = 'HALF_OPEN';
                console.log(`[CircuitBreaker] State is now HALF_OPEN. Attempting request...`);
            } else {
                throw new Error('[CircuitBreaker] Circuit is OPEN. Fast-failing request.');
            }
        }

        try {
            const response = await this.action(...args);
            return this.onSuccess(response);
        } catch (error) {
            return this.onFailure(error);
        }
    }

    onSuccess(response) {
        this.failureCount = 0;
        if (this.state === 'HALF_OPEN') {
            this.successCount++;
            if (this.successCount >= this.successThreshold) {
                this.successCount = 0;
                this.state = 'CLOSED';
                console.log(`[CircuitBreaker] State is now CLOSED. Service recovered.`);
            }
        }
        return response;
    }

    onFailure(error) {
        this.failureCount++;
        console.error(`[CircuitBreaker] Action failed. Failure count: ${this.failureCount}`);
        if (this.failureCount >= this.failureThreshold) {
            this.state = 'OPEN';
            this.nextAttempt = Date.now() + this.timeout;
            console.log(`[CircuitBreaker] Failure threshold reached. State is now OPEN for ${this.timeout}ms.`);
        }
        throw error;
    }
}

module.exports = CircuitBreaker;

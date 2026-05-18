import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';

// ============================================================================
// 1. Setup Redis Connection
// ============================================================================
// BullMQ requires an IORedis connection to communicate with your Redis server.
const connection = new IORedis({
    host: '127.0.0.1', // Default Redis host
    port: 6379,        // Default Redis port
    maxRetriesPerRequest: null, // Required by BullMQ
});

// ============================================================================
// 2. Creating a Queue & Adding Jobs (Job Scheduling & Retries)
// ============================================================================
const emailQueueName = 'email-queue';
const emailQueue = new Queue(emailQueueName, { connection });

async function addJobs() {
    // Basic Job
    await emailQueue.add('send-welcome', { email: 'user1@example.com' });
    console.log('Added standard job.');

    // Job Scheduling (Delayed Job)
    await emailQueue.add('send-followup', { email: 'user2@example.com' }, {
        delay: 5000, // Delay job by 5 seconds (5000 milliseconds)
    });
    console.log('Added delayed job.');

    // Retries with Backoff
    // If this job fails, BullMQ will retry it automatically with a backoff strategy.
    await emailQueue.add('send-invoice', { email: 'user3@example.com' }, {
        attempts: 3, // Retry up to 3 times if it fails
        backoff: {
            type: 'exponential', // 'fixed' or 'exponential'
            delay: 2000, // Wait 2s, then 4s, etc., between retries
        },
    });
    console.log('Added job with retry policy.');

    // Scheduled Repeatable Job (Cron Job)
    await emailQueue.add('weekly-report', { email: 'admin@example.com' }, {
        repeat: {
            pattern: '0 8 * * 1', // Every Monday at 8 AM
        },
    });
    console.log('Added repeatable cron job.');
}

// ============================================================================
// 3. Worker: Processing Jobs with Idempotency
// ============================================================================
// Mock database to demonstrate idempotency
const mockDatabase = new Set<string>();

const emailWorker = new Worker(emailQueueName, async (job: Job) => {
    console.log(`[Worker] Processing job ${job.id} of type ${job.name}...`);

    // --- Idempotent Handler Example ---
    // Idempotency means executing the same job multiple times yields the same result
    // without causing unintended side effects (e.g., charging a customer twice).
    // A common pattern is generating a unique idempotency key.
    const idempotencyKey = `processed_${job.name}_${job.data.email}`;

    if (mockDatabase.has(idempotencyKey)) {
        console.log(`[Worker] Job ${job.id} already processed (Idempotent return). Skipping.`);
        return { status: 'already_processed' };
    }

    if (job.name === 'send-invoice') {
        // Simulate a failure to demonstrate retries and dead letters
        // On the 3rd fail, it goes to the 'failed' list (acts as Dead Letter Queue in BullMQ)
        if (job.attemptsMade < 2) {
            console.log(`[Worker] Simulating failure for ${job.id} (Attempt ${job.attemptsMade + 1})`);
            throw new Error('Temporary network error while sending invoice');
        }
    }

    // Simulate work (e.g., sending email)
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    // Mark as processed in our mock DB to maintain idempotency
    mockDatabase.add(idempotencyKey);
    console.log(`[Worker] Successfully processed job ${job.id} for ${job.data.email}`);
    
    return { status: 'success' };
}, { connection });

// ============================================================================
// 4. Handling Queue Events (Dead Letter Queue concept)
// ============================================================================
// BullMQ moves jobs that exceed their max retry limit to a 'failed' state.
// You can listen to these events to trigger your DLQ (Dead Letter Queue) logic,
// such as storing the failed job details in a database for manual review or alerts.

const queueEvents = new QueueEvents(emailQueueName, { connection });

queueEvents.on('completed', ({ jobId, returnvalue }) => {
    console.log(`[Event] Job ${jobId} successfully completed.`);
});

queueEvents.on('failed', ({ jobId, failedReason }) => {
    // This acts as a hook for Dead Letter Queue processing.
    // If a job reaches here after all retries are exhausted, you can handle it.
    console.error(`[Event] DEAD LETTER: Job ${jobId} ultimately failed. Reason: ${failedReason}`);
    // Example DLQ Action: Save jobId and failedReason to a persistent MongoDB/PostgreSQL table.
});

// ============================================================================
// Run the example
// ============================================================================
async function run() {
    console.log('Starting BullMQ examples...');
    await addJobs();
    
    // Allow script to run for 15 seconds to observe processing, delays, and retries
    setTimeout(async () => {
        console.log('Closing connections...');
        await emailWorker.close();
        await queueEvents.close();
        connection.disconnect();
        process.exit(0);
    }, 15000);
}

run().catch(console.error);

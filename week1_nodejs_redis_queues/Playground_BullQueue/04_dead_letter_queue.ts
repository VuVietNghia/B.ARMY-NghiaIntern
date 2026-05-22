/**
 * 04 — DEAD LETTER QUEUE (DLQ)
 * 
 * Khái niệm: DLQ chứa job đã thất bại hết số lần retry.
 * Luồng: Main Queue → Worker → Thất bại → Retry → DLQ → DLQ Worker (alert)
 * 
 * Chạy: npx ts-node Playground_BullQueue/04_dead_letter_queue.ts
 */

import { Queue, Worker, QueueEvents, Job } from 'bullmq';
import { connection, log, sleep } from './shared';

const MAIN_QUEUE = 'order-processing';
const DLQ_QUEUE = 'order-processing-dlq';

async function main() {
    const mainQueue = new Queue(MAIN_QUEUE, { connection });
    const dlqQueue = new Queue(DLQ_QUEUE, { connection });
    const mainEvents = new QueueEvents(MAIN_QUEUE, { connection });

    log('SETUP', `Main Queue: "${MAIN_QUEUE}", DLQ: "${DLQ_QUEUE}"`);

    // Main Worker: đơn hàng chẵn sẽ luôn lỗi
    const mainWorker = new Worker(MAIN_QUEUE, async (job: Job) => {
        log('MAIN', `📦 Đơn #${job.data.orderId} (lần #${job.attemptsMade + 1})`);
        if (job.data.orderId % 2 === 0) {
            throw new Error(`Kho không đủ cho đơn #${job.data.orderId}`);
        }
        await sleep(500);
        return { ok: true, orderId: job.data.orderId };
    }, { connection });

    // Khi job thất bại vĩnh viễn → chuyển sang DLQ
    mainEvents.on('failed', async ({ jobId, failedReason }) => {
        const failedJob = await Job.fromId(mainQueue, jobId!);
        if (!failedJob) return;
        const maxAttempts = failedJob.opts.attempts ?? 1;
        if (failedJob.attemptsMade >= maxAttempts) {
            log('DLQ', `💀 Job ${jobId} hết retry → DLQ`);
            await dlqQueue.add('dead-letter', {
                originalJobId: jobId,
                originalData: failedJob.data,
                failedReason,
                failedAt: new Date().toISOString(),
            });
        }
    });

    // DLQ Worker: xử lý job "chết" (alert, log, lưu DB)
    const dlqWorker = new Worker(DLQ_QUEUE, async (job: Job) => {
        log('DLQ-WORKER', '════════════════════════════════');
        log('DLQ-WORKER', `🚨 Job chết: ${job.data.originalJobId}`);
        log('DLQ-WORKER', `   Data: ${JSON.stringify(job.data.originalData)}`);
        log('DLQ-WORKER', `   Lý do: ${job.data.failedReason}`);
        log('DLQ-WORKER', '════════════════════════════════');
        return { alertSent: true };
    }, { connection });

    // Thêm đơn hàng
    const orders = [
        { orderId: 1, product: 'Laptop' },   // Lẻ → OK
        { orderId: 2, product: 'Mouse' },     // Chẵn → DLQ
        { orderId: 3, product: 'Keyboard' },  // Lẻ → OK
        { orderId: 4, product: 'Monitor' },   // Chẵn → DLQ
    ];

    for (const order of orders) {
        await mainQueue.add('process-order', order, {
            attempts: 3,
            backoff: { type: 'fixed', delay: 1000 },
        });
        log('PRODUCER', `📬 Đơn #${order.orderId} (${order.product})`);
    }

    log('MAIN', '⏳ Chờ 15 giây...');
    await sleep(15000);

    const dlqCompleted = await dlqQueue.getCompleted();
    log('SUMMARY', `📊 Job vào DLQ: ${dlqCompleted.length}`);

    await mainWorker.close();
    await dlqWorker.close();
    await mainEvents.close();
    await mainQueue.close();
    await dlqQueue.close();
    connection.disconnect();
    log('CLEANUP', 'Hoàn tất!');
}

main().catch(console.error);

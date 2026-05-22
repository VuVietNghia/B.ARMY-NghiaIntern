/**
 * 06 — CONCURRENCY & RATE LIMITING: Kiểm soát tốc độ xử lý
 * 
 * Khái niệm:
 *   Concurrency = Số job worker xử lý song song cùng lúc
 *   Rate Limit  = Giới hạn số job xử lý trong khoảng thời gian
 * 
 * Ứng dụng thực tế:
 *   - Gọi API bên thứ 3 có rate limit (VD: Stripe cho 100 req/s)
 *   - Gửi email hàng loạt mà không bị spam filter
 *   - Xử lý ảnh/video không quá tải CPU
 * 
 * Chạy: npx ts-node Playground_BullQueue/06_concurrency_ratelimit.ts
 */

import { Queue, Worker, QueueEvents, Job } from 'bullmq';
import { connection, log, sleep } from './shared';

const QUEUE_NAME = 'api-calls';

async function main() {
    // Queue với Rate Limiter: tối đa 2 job mỗi 3 giây
    const queue = new Queue(QUEUE_NAME, { connection });

    const events = new QueueEvents(QUEUE_NAME, { connection });
    events.on('completed', ({ jobId }) => {
        log('EVENT', `✅ Job ${jobId} hoàn thành`);
    });

    // Worker với concurrency = 2 (xử lý 2 job song song)
    const worker = new Worker(QUEUE_NAME, async (job: Job) => {
        const start = Date.now();
        log('WORKER', `🔧 Bắt đầu job ${job.id} — API call: ${job.data.endpoint}`);
        await sleep(1000); // Giả lập API call mất 1 giây
        log('WORKER', `✅ Xong job ${job.id} (${Date.now() - start}ms)`);
        return { endpoint: job.data.endpoint, status: 200 };
    }, {
        connection,
        concurrency: 2, // Xử lý tối đa 2 job cùng lúc
        limiter: {
            max: 2,        // Tối đa 2 job
            duration: 3000, // trong mỗi 3 giây
        },
    });

    // Thêm 8 job cùng lúc
    for (let i = 1; i <= 8; i++) {
        await queue.add('api-request', { endpoint: `/api/users/${i}` });
    }
    log('PRODUCER', `📬 Thêm 8 job cùng lúc`);
    log('MAIN', '⏳ Quan sát: Job sẽ được xử lý 2 cái/3 giây...');

    await sleep(20000);

    await worker.close();
    await events.close();
    await queue.close();
    connection.disconnect();
    log('CLEANUP', 'Hoàn tất!');
}

main().catch(console.error);

/**
 * 05 — IDEMPOTENT HANDLERS: Xử lý job an toàn, không gây side-effect trùng lặp
 * 
 * Khái niệm: Idempotent = Chạy cùng 1 job N lần cho kết quả giống nhau.
 * Tại sao cần: BullMQ có thể retry hoặc deliver trùng job trong một số edge case.
 * Pattern: Dùng idempotency key để check "đã xử lý chưa" trước khi thực thi.
 * 
 * Chạy: npx ts-node Playground_BullQueue/05_idempotent_handler.ts
 */

import { Queue, Worker, QueueEvents, Job } from 'bullmq';
import { connection, log, sleep } from './shared';

const QUEUE_NAME = 'payment-queue';

// Giả lập database lưu trạng thái đã xử lý
const processedPayments = new Map<string, { amount: number; processedAt: string }>();

async function main() {
    const queue = new Queue(QUEUE_NAME, { connection });
    const events = new QueueEvents(QUEUE_NAME, { connection });

    events.on('completed', ({ jobId, returnvalue }) => {
        log('EVENT', `✅ Job ${jobId}: ${returnvalue}`);
    });

    // ─── Worker với Idempotent Handler ─────────────────────────────────
    const worker = new Worker(QUEUE_NAME, async (job: Job) => {
        const { paymentId, userId, amount } = job.data;

        // BƯỚC 1: Tạo idempotency key từ dữ liệu business
        // Key nên dựa trên business logic, KHÔNG dùng job.id vì mỗi retry có cùng id
        // nhưng nếu job bị duplicate (add 2 lần), id sẽ khác nhau.
        const idempotencyKey = `payment_${paymentId}`;

        // BƯỚC 2: Kiểm tra đã xử lý chưa
        if (processedPayments.has(idempotencyKey)) {
            const existing = processedPayments.get(idempotencyKey)!;
            log('WORKER', `⏭️ SKIP: Payment ${paymentId} đã xử lý lúc ${existing.processedAt}`);
            return `SKIPPED - already processed`;
        }

        // BƯỚC 3: Thực hiện công việc (charge payment)
        log('WORKER', `💳 Đang charge $${amount} cho user ${userId} (payment: ${paymentId})`);
        await sleep(500); // Giả lập gọi API thanh toán

        // BƯỚC 4: Đánh dấu đã xử lý SAU KHI thành công
        processedPayments.set(idempotencyKey, {
            amount,
            processedAt: new Date().toISOString(),
        });

        log('WORKER', `✅ Payment ${paymentId} thành công!`);
        return `PROCESSED - charged $${amount}`;
    }, { connection });

    // ─── Giả lập: Cùng 1 payment bị add vào queue 3 lần ──────────────
    // Trong thực tế, điều này có thể xảy ra do:
    // - User click nút "Pay" nhiều lần
    // - API timeout và client retry
    // - Message broker deliver trùng
    log('PRODUCER', '── Mô phỏng duplicate payments ──');

    // Payment #1: Bị gửi 3 lần (duplicate!)
    await queue.add('charge', { paymentId: 'PAY-001', userId: 'U-100', amount: 99.99 });
    await queue.add('charge', { paymentId: 'PAY-001', userId: 'U-100', amount: 99.99 });
    await queue.add('charge', { paymentId: 'PAY-001', userId: 'U-100', amount: 99.99 });
    log('PRODUCER', '📬 Thêm payment PAY-001 × 3 lần (chỉ nên charge 1 lần!)');

    // Payment #2: Gửi 1 lần (bình thường)
    await queue.add('charge', { paymentId: 'PAY-002', userId: 'U-200', amount: 49.99 });
    log('PRODUCER', '📬 Thêm payment PAY-002 × 1 lần');

    // ─── Cách 2: Dùng jobId tùy chỉnh để ngăn duplicate ở cấp Queue ──
    // BullMQ cho phép set jobId tùy chỉnh. Nếu jobId đã tồn tại, job sẽ bị bỏ qua.
    log('PRODUCER', '── Mô phỏng built-in deduplication với jobId ──');

    await queue.add('charge', { paymentId: 'PAY-003', userId: 'U-300', amount: 29.99 }, {
        jobId: 'PAY-003', // Custom jobId = paymentId
    });
    await queue.add('charge', { paymentId: 'PAY-003', userId: 'U-300', amount: 29.99 }, {
        jobId: 'PAY-003', // Trùng jobId → BullMQ tự bỏ qua!
    });
    log('PRODUCER', '📬 Thêm PAY-003 × 2 lần với cùng jobId (BullMQ tự dedup)');

    // ─── Chờ quan sát ──────────────────────────────────────────────────
    await sleep(10000);

    log('SUMMARY', '── Trạng thái DB sau khi xử lý ──');
    for (const [key, val] of processedPayments) {
        log('SUMMARY', `  ${key}: $${val.amount} (processed at ${val.processedAt})`);
    }

    await worker.close();
    await events.close();
    await queue.close();
    connection.disconnect();
    log('CLEANUP', 'Hoàn tất!');
}

main().catch(console.error);

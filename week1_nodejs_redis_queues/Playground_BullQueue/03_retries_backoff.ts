/**
 * ============================================================================
 * 03 — RETRIES & BACKOFF: Tự động thử lại khi job thất bại
 * ============================================================================
 * 
 * 🎯 Khái niệm:
 *    Retries  = Khi job thất bại (throw Error), BullMQ tự động thử lại
 *    Backoff  = Chiến lược chờ giữa các lần thử lại
 *      - fixed:       Chờ cố định (VD: luôn chờ 2s)
 *      - exponential: Chờ gấp đôi mỗi lần (VD: 2s → 4s → 8s)
 * 
 * 📐 Minh hoạ exponential backoff:
 *    Lần 1 thất bại → chờ 2s
 *    Lần 2 thất bại → chờ 4s (2s × 2)
 *    Lần 3 thất bại → chờ 8s (4s × 2)
 *    Lần 4 thất bại → ĐÃ HẾT SỐ LẦN THỬ → job vào trạng thái "failed"
 * 
 * 🏃 Chạy: npx ts-node Playground_BullQueue/03_retries_backoff.ts
 * ============================================================================
 */

import { Queue, Worker, QueueEvents, Job } from 'bullmq';
import { connection, log, sleep } from './shared';

const QUEUE_NAME = 'retry-demo';

async function main() {
    const queue = new Queue(QUEUE_NAME, { connection });
    const events = new QueueEvents(QUEUE_NAME, { connection });

    // ─── Theo dõi sự kiện ──────────────────────────────────────────────
    events.on('completed', ({ jobId }) => {
        log('EVENT', `✅ Job ${jobId} hoàn thành sau nhiều lần thử!`);
    });

    events.on('failed', ({ jobId, failedReason }) => {
        log('EVENT', `💀 Job ${jobId} THẤT BẠI VĨNH VIỄN: ${failedReason}`);
    });

    // Sự kiện khi job bị retry (chưa hết số lần thử)
    events.on('retries-exhausted', ({ jobId }) => {
        log('EVENT', `⚠️ Job ${jobId} đã hết số lần retry`);
    });

    // ─── Worker: Giả lập thất bại có kiểm soát ────────────────────────
    const worker = new Worker(QUEUE_NAME, async (job: Job) => {
        const attempt = job.attemptsMade + 1; // attemptsMade là số lần ĐÃ thử trước đó
        log('WORKER', `🔧 Job "${job.name}" — Lần thử #${attempt}/${job.opts.attempts ?? 1}`);

        if (job.name === 'always-fail') {
            // Job này LUÔN thất bại → cuối cùng sẽ vào trạng thái "failed"
            throw new Error(`Lỗi mô phỏng! (lần thử #${attempt})`);
        }

        if (job.name === 'fail-then-succeed') {
            // Job này thất bại 2 lần đầu, thành công ở lần 3
            if (attempt <= 2) {
                throw new Error(`Dịch vụ tạm thời lỗi (lần thử #${attempt})`);
            }
            log('WORKER', `🎉 Lần thử #${attempt}: Cuối cùng cũng thành công!`);
            return 'success on retry!';
        }

        return 'ok';
    }, { connection });

    // ─── Job 1: Thất bại rồi thành công (exponential backoff) ─────────
    await queue.add('fail-then-succeed', { task: 'gọi API thanh toán' }, {
        attempts: 4,       // Tối đa 4 lần thử (1 lần chính + 3 lần retry)
        backoff: {
            type: 'exponential',
            delay: 1000,   // Lần retry 1: 1s, lần 2: 2s, lần 3: 4s
        },
    });
    log('PRODUCER', '📬 Thêm job "fail-then-succeed" (exponential backoff, max 4 attempts)');

    // ─── Job 2: Luôn thất bại (fixed backoff) ─────────────────────────
    await queue.add('always-fail', { task: 'gọi API không tồn tại' }, {
        attempts: 3,       // Tối đa 3 lần thử
        backoff: {
            type: 'fixed',
            delay: 1500,   // Luôn chờ 1.5s giữa mỗi lần retry
        },
    });
    log('PRODUCER', '📬 Thêm job "always-fail" (fixed backoff 1.5s, max 3 attempts)');

    // ─── Chờ quan sát ──────────────────────────────────────────────────
    log('MAIN', '⏳ Đang chờ 25 giây để quan sát retries...');
    await sleep(25000);

    // ─── Kiểm tra trạng thái cuối cùng của các job ────────────────────
    const failedJobs = await queue.getFailed();
    const completedJobs = await queue.getCompleted();

    log('SUMMARY', `📊 Kết quả: ${completedJobs.length} completed, ${failedJobs.length} failed`);
    for (const fj of failedJobs) {
        log('SUMMARY', `  ❌ Job "${fj.name}" (id: ${fj.id}) — Lý do: ${fj.failedReason}`);
    }

    await worker.close();
    await events.close();
    await queue.close();
    connection.disconnect();
    log('CLEANUP', 'Hoàn tất!');
}

main().catch(console.error);

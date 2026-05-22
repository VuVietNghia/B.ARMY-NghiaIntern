/**
 * ============================================================================
 * 02 — JOB SCHEDULING: Delayed Jobs + Repeatable (Cron) Jobs
 * ============================================================================
 * 
 * 🎯 Khái niệm:
 *    Delayed Job    = Job được trì hoãn, chỉ chạy sau X milliseconds
 *    Repeatable Job = Job chạy lặp lại theo lịch cron hoặc interval
 * 
 * 📐 Timeline minh hoạ:
 *    t=0s: Thêm job A (ngay lập tức)
 *    t=0s: Thêm job B (delay 3s)   → B sẽ chạy ở t=3s
 *    t=0s: Thêm job C (delay 6s)   → C sẽ chạy ở t=6s
 *    t=0s: Thêm job D (every 4s)   → D chạy ở t=0s, t=4s, t=8s, ...
 * 
 * 🏃 Chạy: npx ts-node Playground_BullQueue/02_job_scheduling.ts
 * ============================================================================
 */

import { Queue, Worker, QueueEvents, Job } from 'bullmq';
import { connection, log, sleep } from './shared';

const QUEUE_NAME = 'scheduling-demo';

async function main() {
    const queue = new Queue(QUEUE_NAME, { connection });
    const events = new QueueEvents(QUEUE_NAME, { connection });

    events.on('completed', ({ jobId }) => {
        log('EVENT', `✅ Job ${jobId} hoàn thành`);
    });

    // ─── Worker ────────────────────────────────────────────────────────
    const worker = new Worker(QUEUE_NAME, async (job: Job) => {
        log('WORKER', `🔧 Xử lý: "${job.name}" | Data: ${JSON.stringify(job.data)}`);
        await sleep(500); // Giả lập công việc nhanh
        return 'done';
    }, { connection });

    // ─── 1. Job chạy ngay lập tức ──────────────────────────────────────
    await queue.add('instant-task', { message: 'Tôi chạy ngay!' });
    log('PRODUCER', '⚡ Thêm job chạy ngay lập tức');

    // ─── 2. Delayed Job — trì hoãn 3 giây ─────────────────────────────
    // Job sẽ được đưa vào trạng thái "delayed" trong Redis,
    // BullMQ tự động chuyển sang "waiting" khi hết thời gian delay.
    await queue.add('delayed-task', { message: 'Tôi chạy sau 3 giây!' }, {
        delay: 3000, // Đơn vị: milliseconds
    });
    log('PRODUCER', '⏰ Thêm job với delay 3 giây');

    // ─── 3. Delayed Job — trì hoãn 6 giây ─────────────────────────────
    await queue.add('delayed-task-2', { message: 'Tôi chạy sau 6 giây!' }, {
        delay: 6000,
    });
    log('PRODUCER', '⏰ Thêm job với delay 6 giây');

    // ─── 4. Repeatable Job — chạy mỗi 4 giây ─────────────────────────
    // "every" sử dụng milliseconds interval (đơn giản hơn cron).
    // Cũng có thể dùng "pattern" với cron syntax: '*/5 * * * *' (mỗi 5 phút)
    await queue.add('heartbeat', { message: 'Ping mỗi 4 giây' }, {
        repeat: {
            every: 4000, // Lặp lại mỗi 4 giây
            limit: 3,    // Tối đa 3 lần (để demo không chạy mãi)
        },
    });
    log('PRODUCER', '🔄 Thêm repeatable job (mỗi 4s, tối đa 3 lần)');

    // ─── Chờ quan sát ──────────────────────────────────────────────────
    log('MAIN', '⏳ Đang chờ 20 giây để quan sát scheduling...');
    await sleep(20000);

    // ─── Dọn dẹp repeatable jobs trước khi thoát ──────────────────────
    // QUAN TRỌNG: Repeatable jobs phải được xóa tường minh,
    // nếu không chúng sẽ tiếp tục tạo job mới ngay cả sau khi restart!
    const repeatableJobs = await queue.getRepeatableJobs();
    for (const rJob of repeatableJobs) {
        await queue.removeRepeatableByKey(rJob.key);
        log('CLEANUP', `🗑️ Đã xóa repeatable job: ${rJob.key}`);
    }

    await worker.close();
    await events.close();
    await queue.close();
    connection.disconnect();
    log('CLEANUP', 'Hoàn tất!');
}

main().catch(console.error);

/**
 * ============================================================================
 * 01 — BASIC QUEUE: Queue + Worker + QueueEvents
 * ============================================================================
 * 
 * 🎯 Khái niệm:
 *    Queue     = Hàng đợi chứa các job cần xử lý
 *    Worker    = "Nhân viên" lấy job ra khỏi hàng đợi và thực thi
 *    QueueEvents = Lắng nghe sự kiện (completed, failed, ...) của queue
 * 
 * 📐 Luồng hoạt động:
 *    Producer (add job) → Redis Queue → Worker (process job)
 *                                        ↓
 *                                   QueueEvents (lắng nghe kết quả)
 * 
 * 🏃 Chạy: npx ts-node Playground_BullQueue/01_basic_queue.ts
 * ============================================================================
 */

import { Queue, Worker, QueueEvents, Job } from 'bullmq';
import { connection, log, sleep } from './shared';

const QUEUE_NAME = 'basic-demo';

async function main() {
    // ─── Bước 1: Tạo Queue ─────────────────────────────────────────────
    // Queue là "danh sách công việc" được lưu trong Redis.
    const queue = new Queue(QUEUE_NAME, { connection });
    log('SETUP', `Queue "${QUEUE_NAME}" đã được tạo`);

    // ─── Bước 2: Tạo QueueEvents để theo dõi ──────────────────────────
    // QueueEvents sử dụng Redis Streams để lắng nghe thay đổi trạng thái job.
    const events = new QueueEvents(QUEUE_NAME, { connection });

    events.on('completed', ({ jobId, returnvalue }) => {
        log('EVENT', `✅ Job ${jobId} hoàn thành! Kết quả: ${returnvalue}`);
    });

    events.on('failed', ({ jobId, failedReason }) => {
        log('EVENT', `❌ Job ${jobId} thất bại! Lý do: ${failedReason}`);
    });

    // ─── Bước 3: Tạo Worker để xử lý job ──────────────────────────────
    // Worker tự động poll Redis để lấy job mới và xử lý.
    const worker = new Worker(QUEUE_NAME, async (job: Job) => {
        log('WORKER', `Đang xử lý job "${job.name}" (id: ${job.id})`);
        log('WORKER', `  Data: ${JSON.stringify(job.data)}`);

        // Giả lập công việc mất 1 giây
        await sleep(1000);

        // Giá trị return sẽ được lưu lại và có thể truy xuất qua QueueEvents
        return `Đã gửi email cho ${job.data.to}`;
    }, { connection });

    log('SETUP', 'Worker đã sẵn sàng, đang chờ job...');

    // ─── Bước 4: Thêm Job vào Queue (Producer) ────────────────────────
    // Mỗi job có: tên (name), dữ liệu (data), và tùy chọn (opts)
    await queue.add('welcome-email', { to: 'alice@example.com', subject: 'Chào mừng!' });
    await queue.add('welcome-email', { to: 'bob@example.com', subject: 'Chào mừng!' });
    await queue.add('notification', { to: 'charlie@example.com', subject: 'Thông báo mới' });

    log('PRODUCER', '📬 Đã thêm 3 job vào queue');

    // ─── Chờ xử lý xong rồi dọn dẹp ──────────────────────────────────
    await sleep(8000);

    log('CLEANUP', 'Đang đóng kết nối...');
    await worker.close();
    await events.close();
    await queue.close();
    connection.disconnect();
    log('CLEANUP', 'Hoàn tất!');
}

main().catch(console.error);

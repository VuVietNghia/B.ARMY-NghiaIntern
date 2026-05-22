/**
 * shared.ts — Cấu hình kết nối Redis dùng chung cho tất cả các file playground.
 * 
 * Tách riêng để không phải lặp lại ở mỗi file demo.
 */
import IORedis from 'ioredis';

export const connection = new IORedis({
    host: '127.0.0.1',
    port: 6379,
    maxRetriesPerRequest: null, // BullMQ yêu cầu cài đặt này
});

/**
 * Helper: Chờ một khoảng thời gian (ms)
 */
export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Helper: In log có timestamp
 */
export function log(tag: string, message: string): void {
    const time = new Date().toISOString().slice(11, 23); // HH:mm:ss.SSS
    console.log(`[${time}] [${tag}] ${message}`);
}

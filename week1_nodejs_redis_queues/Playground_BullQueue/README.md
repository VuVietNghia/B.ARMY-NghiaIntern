# 🐂 BullMQ Playground

Bộ code demo thực hành các khái niệm BullMQ — chạy trực tiếp trên máy local.

## 📁 Cấu trúc file

| File | Khái niệm | Mô tả |
|------|-----------|-------|
| `shared.ts` | — | Cấu hình Redis dùng chung |
| `01_basic_queue.ts` | Queue, Worker, Events | Luồng cơ bản: Producer → Queue → Worker |
| `02_job_scheduling.ts` | Delayed, Repeatable | Job trì hoãn & lặp lại theo lịch |
| `03_retries_backoff.ts` | Retries, Backoff | Tự động thử lại với exponential/fixed backoff |
| `04_dead_letter_queue.ts` | DLQ | Job thất bại vĩnh viễn → chuyển sang queue riêng |
| `05_idempotent_handler.ts` | Idempotency | Xử lý job an toàn, không bị trùng lặp |
| `06_concurrency_ratelimit.ts` | Concurrency, Rate Limit | Kiểm soát tốc độ xử lý |

## 🚀 Cách chạy

### Bước 1: Khởi động Redis bằng Docker
```bash
cd Playground_BullQueue
docker compose up -d
```

### Bước 2: Chạy từng file demo
```bash
# Từ thư mục week1_nodejs_redis_queues
npx ts-node Playground_BullQueue/01_basic_queue.ts
npx ts-node Playground_BullQueue/02_job_scheduling.ts
npx ts-node Playground_BullQueue/03_retries_backoff.ts
npx ts-node Playground_BullQueue/04_dead_letter_queue.ts
npx ts-node Playground_BullQueue/05_idempotent_handler.ts
npx ts-node Playground_BullQueue/06_concurrency_ratelimit.ts
```

### Bước 3: Tắt Redis
```bash
cd Playground_BullQueue
docker compose down
```

## 📚 Thứ tự học khuyến nghị

1. **01_basic_queue** → Hiểu luồng cơ bản Queue/Worker
2. **02_job_scheduling** → Delayed job + Cron job
3. **03_retries_backoff** → Khi job lỗi thì retry thế nào
4. **06_concurrency_ratelimit** → Kiểm soát throughput
5. **04_dead_letter_queue** → Xử lý job chết
6. **05_idempotent_handler** → Pattern an toàn cho production

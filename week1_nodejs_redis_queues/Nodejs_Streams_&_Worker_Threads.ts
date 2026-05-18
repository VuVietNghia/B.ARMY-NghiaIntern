import {
  createReadStream,
  createWriteStream,
  promises as fsPromises,
} from 'fs';
import { Transform } from 'stream';
import { pipeline } from 'stream/promises';
import {
  Worker,
  isMainThread,
  parentPort,
  workerData,
} from 'worker_threads';
import { join } from 'path';

// ============================================================================
// PHẦN 1: NODE.JS STREAMS & PIPELINES
// Streams giúp xử lý dữ liệu lớn bằng cách chia nhỏ thành các "chunk" (phần nhỏ)
// thay vì tải toàn bộ vào RAM. Rất hữu ích khi đọc/ghi file, xử lý HTTP request,...
// ============================================================================

async function demonstrateStreams() {
  console.log('--- Bắt đầu Demo Streams ---');
  
  const inputFile = join(__dirname, 'input.txt');
  const outputFile = join(__dirname, 'output.txt');

  // 1. Tạo file input giả lập với dữ liệu
  console.log('Đang tạo file input.txt giả lập...');
  await fsPromises.writeFile(
    inputFile, 
    'Node.js Streams!\nI love Claude Code and Codex =))\n'.repeat(10000)
  );

  // 2. Readable Stream: Đọc dữ liệu từ file
  const readStream = createReadStream(inputFile, { encoding: 'utf8' });

  // 3. Transform Stream: Chuyển đổi dữ liệu (Ví dụ: Chuyển thành chữ in hoa)
  const uppercaseTransform = new Transform({
    transform(chunk: any, encoding: string, callback: (error?: Error | null, data?: any) => void) {
      // Chuyển chunk (dữ liệu đang đọc) sang string và in hoa
      const transformedChunk = chunk.toString().toUpperCase();
      // Đẩy dữ liệu đã chuyển đổi tiếp tục đi
      callback(null, transformedChunk);
    },
  });

  // 4. Writable Stream: Ghi dữ liệu ra file
  const writeStream = createWriteStream(outputFile);

  try {
    // 5. Pipeline: Nối luồng Đọc -> Biến đổi -> Ghi. 
    // Ưu điểm của pipeline là tự động xử lý lỗi và quản lý bộ nhớ (backpressure)
    await pipeline(
      readStream,
      uppercaseTransform,
      writeStream
    );
    console.log('✅ Pipeline xử lý stream thành công! Dữ liệu đã được ghi ra output.txt');
  } catch (error) {
    console.error('❌ Lỗi xử lý stream:', error);
  }
}


// ============================================================================
// PHẦN 2: WORKER THREADS
// Node.js chạy single-thread (đơn luồng). Khi gặp tác vụ tốn CPU (CPU-intensive)
// như tính toán toán học phức tạp, nó sẽ làm "nghẽn" toàn bộ app.
// Worker Threads giúp tạo luồng phụ để xử lý các tác vụ này song song.
// ============================================================================

// Hàm khởi tạo và chạy Worker
function runWorkerTask(workerData: number): Promise<number> {
  return new Promise((resolve, reject) => {
    // Tạo một worker mới, sử dụng chính file này (__filename)
    // Lưu ý: Nếu chạy bằng ts-node, có thể cần thiết lập để hỗ trợ ts
    const worker = new Worker(__filename, {
      workerData: workerData, // Truyền dữ liệu cho worker
      // Tuỳ chọn này giúp ts-node hoạt động tốt với worker threads
      execArgv: process.execArgv.includes('--loader') || process.execArgv.join(' ').includes('ts-node') 
        ? process.execArgv 
        : ['-r', 'ts-node/register']
    });

    // Lắng nghe kết quả trả về từ worker
    worker.on('message', (result: any) => {
      resolve(result);
    });

    // Lắng nghe lỗi nếu có
    worker.on('error', (err: Error) => {
      reject(err);
    });

    worker.on('exit', (code: number) => {
      if (code !== 0) {
        reject(new Error(`Worker stopped with exit code ${code}`));
      }
    });
  });
}

// ============================================================================
// CHƯƠNG TRÌNH CHÍNH (MAIN THREAD / WORKER THREAD LOGIC)
// ============================================================================

if (isMainThread) {
  // NẾU ĐÂY LÀ LUỒNG CHÍNH (Main Thread)
  // Thực thi ví dụ theo thứ tự
  demonstrateStreams().then(async () => {
    console.log('\n--- Bắt đầu Demo Worker Threads ---');
    console.log('Đang tính toán số Fibonacci tốn nhiều CPU trên Worker Thread...');
    
    // Yêu cầu worker tính toán. Trong khi worker chạy, 
    // event loop của main thread vẫn KHÔNG BỊ BLOCK.
    const targetNumber = 40; 
    
    console.time('Thời gian chạy Worker');
    try {
      const result = await runWorkerTask(targetNumber);
      console.log(`✅ Kết quả Fibonacci thứ ${targetNumber} là: ${result}`);
    } catch (err) {
      console.error('❌ Lỗi worker:', err);
    }
    console.timeEnd('Thời gian chạy Worker');
    
    console.log('\nMain thread đã hoàn tất toàn bộ tiến trình.');
  });

} else {
  // NẾU ĐÂY LÀ WORKER THREAD (luồng phụ do Main Thread tạo ra)
  // Thực hiện tác vụ tốn CPU ở đây
  
  // Hàm đệ quy này cực kì tốn CPU, dùng để mô phỏng tác vụ nặng
  function calculateFibonacci(n: number): number {
    if (n <= 1) return n;
    return calculateFibonacci(n - 1) + calculateFibonacci(n - 2);
  }

  // workerData chứa dữ liệu được truyền từ Main Thread (targetNumber = 40)
  const numberToCalculate = workerData;
  const result = calculateFibonacci(numberToCalculate);

  // Gửi kết quả lại cho Main Thread thông qua message port
  if (parentPort) {
    parentPort.postMessage(result);
  }
}

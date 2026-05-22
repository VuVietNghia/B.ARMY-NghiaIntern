// Định nghĩa "contract" — interface
class Database {
    query(sql) { throw new Error('must implement'); }
  }
  
  // Implementations
  class MySQLDatabase extends Database {
    query(sql) { /* kết nối MySQL thật */ }
  }
  class MockDatabase extends Database {
    query(sql) { return [{ id: 1, name: 'Test User' }]; }
  }
  
  // UserService NHẬN db — không tự tạo
  class UserService {
    constructor(db) {  // ← dependency được inject vào
      this.db = db;
    }
    getUser(id) {
      return this.db.query(`SELECT * FROM users WHERE id=${id}`);
    }
  }
  
  // Caller quyết định dùng DB nào
  const prodSvc  = new UserService(new MySQLDatabase());
  const testSvc  = new UserService(new MockDatabase()); // ← test dễ dàng!

class UserServiceWithDependencies {
  constructor(db, logger, cache) {
    this.db     = db;      // bắt buộc phải có
    this.logger = logger;  // rõ ràng: service này cần gì
    this.cache  = cache;
  }
}
// Khi đọc constructor → biết ngay hết dependencies
// Không thể tạo object mà thiếu deps → an toàn
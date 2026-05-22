class Container {
    constructor() {
      this.registry = new Map();
      this.cache    = new Map(); // singleton cache
    }
  
    register(name, factory, singleton = true) {
      this.registry.set(name, { factory, singleton });
    }
  
    resolve(name) {
      const entry = this.registry.get(name);
      if (!entry) throw new Error(`Unknown dep: ${name}`);
  
      if (entry.singleton && this.cache.has(name))
        return this.cache.get(name); // reuse instance
  
      const instance = entry.factory(this); // pass container để resolve nested
      if (entry.singleton) this.cache.set(name, instance);
      return instance;
    }
  }
  
  // Đăng ký một lần
  const c = new Container();
  c.register('db',     (c) => new MySQLDatabase(config.db));
  c.register('logger', (c) => new WinstonLogger());
  c.register('userSvc',(c) => new UserService(
    c.resolve('db'), c.resolve('logger')
  ));
  
  // Dùng ở bất kỳ đâu
  const userSvc = c.resolve('userSvc'); // ← tự động khởi tạo chain
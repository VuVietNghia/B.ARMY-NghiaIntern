import Redis from 'ioredis';

// ============================================================================
// REDIS LOCAL SETUP (WSL / Ubuntu)
// ============================================================================
// 1. Install Redis: `sudo apt update && sudo apt install redis-server`
// 2. Start Redis: `sudo service redis-server start`
// 3. Check Status: `sudo service redis-server status`
// 4. Test connection via CLI: `redis-cli ping` (should return PONG)
// ============================================================================

// Initialize Redis client. By default, it connects to localhost:6379
const redis = new Redis();

// Helper to pause execution (for demonstrating expirations, etc.)
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function demonstrateDataStructures() {
    console.log('\n--- 1. Strings ---');
    // Basic key-value
    await redis.set('user:1:name', 'Alice');
    const name = await redis.get('user:1:name');
    console.log('User Name:', name);

    // Incrementing a counter (Atomic)
    await redis.set('page_views', 0);
    await redis.incr('page_views');
    await redis.incr('page_views');
    const views = await redis.get('page_views');
    console.log('Page Views:', views);

    // Expiration (TTL)
    await redis.set('session:123', 'active', 'EX', 2); // expires in 2 seconds
    console.log('Session active?', await redis.get('session:123'));
    console.log('Waiting 3 seconds...');
    await sleep(3000);
    console.log('Session active?', await redis.get('session:123')); // Should be null

    console.log('\n--- 2. Hashes ---');
    // Hashes are good for representing objects
    await redis.hset('user:2', {
        name: 'Bob',
        email: 'bob@example.com',
        age: 30
    });
    
    // Get single field
    const bobAge = await redis.hget('user:2', 'age');
    console.log("Bob's Age:", bobAge);
    
    // Get all fields
    const bobDetails = await redis.hgetall('user:2');
    console.log("Bob's Details:", bobDetails);

    console.log('\n--- 3. Lists ---');
    // Lists are linked lists (good for queues, recent items)
    await redis.del('recent_tasks'); // Clear if exists
    
    // Push items to the left (head)
    await redis.lpush('recent_tasks', 'task_1');
    await redis.lpush('recent_tasks', 'task_2');
    await redis.lpush('recent_tasks', 'task_3'); // task_3 is now first
    
    // Get items from list (0 to -1 gets all items)
    const tasks = await redis.lrange('recent_tasks', 0, -1);
    console.log('Recent Tasks:', tasks);
    
    // Pop item from the right (tail) - like a queue
    const oldestTask = await redis.rpop('recent_tasks');
    console.log('Processed Task:', oldestTask);

    console.log('\n--- 4. Sets ---');
    // Sets are collections of unique elements
    await redis.del('user:1:tags');
    await redis.sadd('user:1:tags', 'typescript', 'redis', 'nodejs', 'redis'); // 'redis' is added twice, but only stored once
    
    const tags = await redis.smembers('user:1:tags');
    console.log('User Tags:', tags);
    
    const hasTypeScript = await redis.sismember('user:1:tags', 'typescript');
    console.log('Has TypeScript tag?', hasTypeScript === 1);

    console.log('\n--- 5. Sorted Sets ---');
    // Sorted Sets have a score associated with each element, used to sort them
    await redis.del('leaderboard');
    await redis.zadd('leaderboard', 100, 'Alice');
    await redis.zadd('leaderboard', 50, 'Bob');
    await redis.zadd('leaderboard', 200, 'Charlie');
    
    // Get top 2 players (highest score first)
    // 0 to 1 gets the first 2 elements. ZREVRANGE sorts descending.
    const topPlayers = await redis.zrevrange('leaderboard', 0, 1, 'WITHSCORES');
    console.log('Top Players:', topPlayers);
}

async function demonstratePubSub() {
    console.log('\n--- 6. Pub/Sub ---');
    // Pub/sub requires separate connections for publishing and subscribing
    const subscriber = new Redis();
    const publisher = new Redis();

    // Setup subscriber
    await subscriber.subscribe('notifications');
    
    subscriber.on('message', (channel, message) => {
        console.log(`[Pub/Sub] Received message on channel '${channel}': ${message}`);
    });

    // Publish some messages
    await publisher.publish('notifications', 'Hello, World!');
    await sleep(100); // Give time for subscriber to receive
    await publisher.publish('notifications', 'System update at midnight');
    await sleep(100);

    // Cleanup
    await subscriber.quit();
    await publisher.quit();
}

// 7. Caching Strategy (Cache Aside)
async function fetchUserFromDB(id: string) {
    // Simulate slow database query
    console.log(`[DB] Fetching user ${id} from database...`);
    await sleep(1000);
    return { id, name: `User_${id}`, role: 'admin' };
}

async function getCachedUser(id: string) {
    const cacheKey = `cache:user:${id}`;
    
    // 1. Check Cache
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
        console.log(`[Cache] HIT for user ${id}`);
        return JSON.parse(cachedData);
    }
    
    console.log(`[Cache] MISS for user ${id}`);
    
    // 2. If miss, fetch from DB
    const userData = await fetchUserFromDB(id);
    
    // 3. Store in cache for future requests (with a TTL of 10 seconds)
    await redis.set(cacheKey, JSON.stringify(userData), 'EX', 10);
    
    return userData;
}

async function demonstrateCaching() {
    console.log('\n--- 7. Caching Strategy ---');
    console.log('First call (should hit DB):');
    await getCachedUser('999');
    
    console.log('\nSecond call (should hit Cache):');
    await getCachedUser('999');
}

// 8. Rate Limiting (Fixed Window Counter)
async function isRateLimited(userId: string, limit: number, windowSeconds: number): Promise<boolean> {
    const key = `ratelimit:${userId}`;
    
    // INCR atomically increments the key. If it doesn't exist, it sets it to 1.
    const currentRequests = await redis.incr(key);
    
    // If it's the first request, set the expiration window
    if (currentRequests === 1) {
        await redis.expire(key, windowSeconds);
    }
    
    return currentRequests > limit;
}

async function demonstrateRateLimiting() {
    console.log('\n--- 8. Rate Limiting ---');
    const userId = 'user_abc';
    const limit = 3;
    const window = 5; // 5 seconds
    
    console.log(`Simulating requests for ${userId} (Limit: ${limit} per ${window}s)...`);
    
    for (let i = 1; i <= 5; i++) {
        const limited = await isRateLimited(userId, limit, window);
        if (limited) {
            console.log(`Request ${i}: ❌ Rate Limited! Try again later.`);
        } else {
            console.log(`Request ${i}: ✅ Success!`);
        }
    }
}

// Main execution function
async function main() {
    try {
        await demonstrateDataStructures();
        await demonstratePubSub();
        await demonstrateCaching();
        await demonstrateRateLimiting();
    } catch (error) {
        console.error('Error during execution:', error);
    } finally {
        // Close the main connection
        await redis.quit();
        console.log('\nDone!');
    }
}

main();

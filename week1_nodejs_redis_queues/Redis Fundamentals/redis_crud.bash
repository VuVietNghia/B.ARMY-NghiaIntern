#!/bin/bash
# ============================================================
#  Redis CRUD Cheatsheet
#  Covers: Strings, Hashes, Lists, Sets, Sorted Sets
# ============================================================
 
# Kết nối mặc định: redis-cli -h <host> -p <port> -a <password>
# Ví dụ dưới đây dùng redis-cli trực tiếp (localhost:6379)
 
REDIS="redis-cli"
 
 
# ============================================================
# 1. STRINGS
# ============================================================
echo "===== STRINGS ====="
 
# --- CREATE / UPDATE ---
$REDIS SET user:1:name "Nghia"            # SET key value
$REDIS SET user:1:age 22                  # Ghi đè nếu key đã tồn tại
$REDIS SET session:abc "token123" EX 3600 # SET với TTL (giây)
$REDIS SETNX user:1:email "a@b.com"       # Chỉ set nếu key CHƯA tồn tại
$REDIS MSET k1 "val1" k2 "val2" k3 "val3" # Set nhiều key cùng lúc
 
$REDIS INCR  user:1:age                   # Tăng 1
$REDIS INCRBY user:1:age 5                # Tăng N
$REDIS DECR  user:1:age                   # Giảm 1
$REDIS DECRBY user:1:age 3                # Giảm N
$REDIS APPEND user:1:name " Dev"          # Nối chuỗi vào cuối
 
# --- READ ---
$REDIS GET  user:1:name                   # Lấy 1 key
$REDIS MGET k1 k2 k3                      # Lấy nhiều key cùng lúc
$REDIS STRLEN user:1:name                 # Độ dài chuỗi
$REDIS TTL  session:abc                   # Xem thời gian sống còn lại
 
# --- DELETE ---
$REDIS DEL  user:1:name                   # Xóa 1 key
$REDIS DEL  k1 k2 k3                      # Xóa nhiều key
 
 
# ============================================================
# 2. HASHES  (dùng cho object/struct)
# ============================================================
echo "===== HASHES ====="
 
# --- CREATE / UPDATE ---
$REDIS HSET  product:1 name "Laptop" price 25000000 stock 10
# HSET tự tạo field nếu chưa có, ghi đè nếu đã có
 
$REDIS HSETNX product:1 brand "Lenovo"    # Chỉ set nếu field CHƯA tồn tại
$REDIS HINCRBY product:1 stock 5          # Tăng giá trị số của field
$REDIS HINCRBYFLOAT product:1 price 500000.50
 
# --- READ ---
$REDIS HGET    product:1 name             # Lấy 1 field
$REDIS HMGET   product:1 name price stock # Lấy nhiều field
$REDIS HGETALL product:1                  # Lấy tất cả field + value
$REDIS HKEYS   product:1                  # Chỉ lấy danh sách field
$REDIS HVALS   product:1                  # Chỉ lấy danh sách value
$REDIS HLEN    product:1                  # Số lượng field
$REDIS HEXISTS product:1 brand            # Kiểm tra field tồn tại (1/0)
 
# --- DELETE ---
$REDIS HDEL product:1 stock               # Xóa 1 field
$REDIS HDEL product:1 name price          # Xóa nhiều field
$REDIS DEL  product:1                     # Xóa cả hash
 
 
# ============================================================
# 3. LISTS  (ordered, có thể trùng, dùng queue/stack)
# ============================================================
echo "===== LISTS ====="
 
# --- CREATE / UPDATE ---
$REDIS RPUSH tasks "task1" "task2" "task3" # Thêm vào CUỐI list
$REDIS LPUSH tasks "task0"                 # Thêm vào ĐẦU list
$REDIS LINSERT tasks BEFORE "task2" "task1.5"  # Chèn trước phần tử
$REDIS LINSERT tasks AFTER  "task2" "task2.5"  # Chèn sau phần tử
$REDIS LSET tasks 0 "task_updated"         # Cập nhật theo index
 
# --- READ ---
$REDIS LRANGE tasks 0 -1                   # Lấy toàn bộ (0 đến hết)
$REDIS LRANGE tasks 0 2                    # Lấy index 0 đến 2
$REDIS LINDEX tasks 0                      # Lấy phần tử theo index
$REDIS LLEN   tasks                        # Độ dài list
 
# --- DELETE ---
$REDIS LPOP tasks                          # Lấy & xóa phần tử ĐẦU
$REDIS RPOP tasks                          # Lấy & xóa phần tử CUỐI
$REDIS LPOP tasks 2                        # Lấy & xóa 2 phần tử đầu
$REDIS LREM tasks 1 "task1"                # Xóa 1 lần xuất hiện "task1"
$REDIS LREM tasks 0 "task2"                # Xóa TẤT CẢ "task2"
$REDIS LTRIM tasks 1 3                     # Chỉ giữ lại index 1-3, xóa phần còn lại
$REDIS DEL   tasks                         # Xóa cả list
 
# Blocking pop (dùng cho worker queue)
# $REDIS BLPOP tasks 5                     # Chờ tối đa 5 giây nếu list rỗng
 
 
# ============================================================
# 4. SETS  (không thứ tự, không trùng)
# ============================================================
echo "===== SETS ====="
 
# --- CREATE / UPDATE ---
$REDIS SADD tags "redis" "nosql" "database"  # Thêm members
$REDIS SADD tags "redis"                     # Bị bỏ qua vì đã có
 
# --- READ ---
$REDIS SMEMBERS  tags                        # Lấy tất cả members
$REDIS SISMEMBER tags "redis"                # Kiểm tra tồn tại (1/0)
$REDIS SMISMEMBER tags "redis" "mysql"       # Kiểm tra nhiều members
$REDIS SCARD tags                            # Số lượng members
$REDIS SRANDMEMBER tags 2                    # Lấy ngẫu nhiên 2 members
 
# Set operations
$REDIS SADD setA "a" "b" "c"
$REDIS SADD setB "b" "c" "d"
$REDIS SUNION  setA setB                     # Hợp (union)
$REDIS SINTER  setA setB                     # Giao (intersection)
$REDIS SDIFF   setA setB                     # Hiệu setA - setB
 
$REDIS SUNIONSTORE dest setA setB            # Lưu kết quả union vào key mới
$REDIS SINTERSTORE dest setA setB
$REDIS SDIFFSTORE  dest setA setB
 
# --- DELETE ---
$REDIS SREM tags "nosql"                     # Xóa 1 member
$REDIS SREM tags "redis" "database"          # Xóa nhiều members
$REDIS SPOP tags                             # Xóa & trả về 1 member ngẫu nhiên
$REDIS SPOP tags 2                           # Xóa & trả về 2 members ngẫu nhiên
$REDIS DEL  tags                             # Xóa cả set
 
 
# ============================================================
# 5. SORTED SETS  (có score, tự sắp xếp theo score tăng dần)
# ============================================================
echo "===== SORTED SETS ====="
 
# --- CREATE / UPDATE ---
$REDIS ZADD leaderboard 1000 "player1"       # Thêm member với score
$REDIS ZADD leaderboard 2500 "player2" 1800 "player3"
$REDIS ZADD leaderboard NX 3000 "player4"    # Chỉ thêm nếu CHƯA tồn tại
$REDIS ZADD leaderboard XX 3200 "player2"    # Chỉ update nếu ĐÃ tồn tại
$REDIS ZADD leaderboard GT 9999 "player1"    # Chỉ update nếu score mới > cũ
$REDIS ZINCRBY leaderboard 500 "player1"     # Tăng score thêm 500
 
# --- READ ---
$REDIS ZSCORE leaderboard "player1"          # Lấy score của member
$REDIS ZRANK  leaderboard "player1"          # Rank (0-based, tăng dần)
$REDIS ZREVRANK leaderboard "player1"        # Rank (0-based, giảm dần)
 
$REDIS ZRANGE    leaderboard 0 -1            # Tất cả, tăng dần theo score
$REDIS ZRANGE    leaderboard 0 -1 REV        # Tất cả, giảm dần (Redis 6.2+)
$REDIS ZRANGE    leaderboard 0 -1 WITHSCORES # Kèm score
$REDIS ZREVRANGE leaderboard 0 2             # Top 3, giảm dần (deprecated nhưng vẫn dùng được)
$REDIS ZREVRANGE leaderboard 0 2 WITHSCORES
 
# Lấy theo khoảng score
$REDIS ZRANGEBYSCORE  leaderboard 1000 2000  # score từ 1000 đến 2000
$REDIS ZRANGEBYSCORE  leaderboard -inf +inf WITHSCORES
$REDIS ZRANGEBYSCORE  leaderboard 1000 2000 LIMIT 0 2  # Giới hạn 2 kết quả
 
$REDIS ZREVRANGEBYSCORE leaderboard 3000 1000  # Giảm dần theo score
 
$REDIS ZCOUNT leaderboard 1000 2500           # Đếm members trong khoảng score
$REDIS ZCARD  leaderboard                     # Tổng số members
 
# --- DELETE ---
$REDIS ZREM leaderboard "player3"             # Xóa member
$REDIS ZREM leaderboard "player1" "player2"   # Xóa nhiều members
$REDIS ZREMRANGEBYRANK  leaderboard 0 1       # Xóa theo rank (index)
$REDIS ZREMRANGEBYSCORE leaderboard 0 1500    # Xóa theo khoảng score
$REDIS DEL  leaderboard                       # Xóa cả sorted set
 
# Lấy & xóa
$REDIS ZPOPMIN leaderboard 1                  # Lấy & xóa member có score thấp nhất
$REDIS ZPOPMAX leaderboard 1                  # Lấy & xóa member có score cao nhất
 
 
# ============================================================
# UTILITY
# ============================================================
echo "===== UTILITY ====="
$REDIS EXISTS user:1:age                      # Kiểm tra key tồn tại (1/0)
$REDIS TYPE   product:1                       # Xem kiểu dữ liệu của key
$REDIS KEYS   "user:*"                        # Tìm keys theo pattern (tránh dùng trên prod)
$REDIS SCAN   0 MATCH "user:*" COUNT 100      # An toàn hơn KEYS trên prod
$REDIS EXPIRE user:1:age 600                  # Đặt TTL (giây)
$REDIS PERSIST user:1:age                     # Xóa TTL, key tồn tại vĩnh viễn
$REDIS RENAME old_key new_key                 # Đổi tên key
$REDIS OBJECT ENCODING product:1             # Xem encoding nội bộ
 
echo "Done!"
 
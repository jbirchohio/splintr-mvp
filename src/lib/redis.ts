import Redis from 'ioredis';

// Redis configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
};

// Create Redis client instance
export const redis = new Redis(redisConfig);

// Redis key patterns for feed caching
export const REDIS_KEYS = {
  FEED_MAIN: 'feed:main',
  FEED_TRENDING: 'feed:trending',
  FEED_CREATOR: (creatorId: string) => `feed:creator:${creatorId}`,
  FEED_PAGE: (type: string, page: number) => `feed:${type}:page:${page}`,
  FEED_CURSOR: (type: string, cursor: string) => `feed:${type}:cursor:${cursor}`,
  STORY_VIEWS: (storyId: string) => `story:views:${storyId}`,
  FEED_LAST_REFRESH: 'feed:last_refresh',
  userSession: (userId: string) => `session:${userId}`,
  publicFeed: (page: number, limit: number) => `feed:public:${page}:${limit}`,
  creatorFeed: (creatorId: string, page: number, limit: number) => `feed:creator:${creatorId}:${page}:${limit}`,
  story: (storyId: string) => `story:${storyId}`,
  storyMetadata: (storyId: string) => `story:metadata:${storyId}`,
  videoProcessingStatus: (videoId: string) => `video:processing:${videoId}`,
  rateLimit: (identifier: string, endpoint: string) => `rate:${endpoint}:${identifier}`,
  moderationResult: (contentId: string) => `moderation:${contentId}`,
} as const;

// Cache TTL values (in seconds)
export const CACHE_TTL = {
  FEED_MAIN: 300, // 5 minutes
  FEED_TRENDING: 600, // 10 minutes
  FEED_CREATOR: 300, // 5 minutes
  STORY_VIEWS: 3600, // 1 hour
  FEED_REFRESH_LOCK: 60, // 1 minute
  SHORT: 5 * 60, // 5 minutes
  MEDIUM: 30 * 60, // 30 minutes
  LONG: 2 * 60 * 60, // 2 hours
  DAY: 24 * 60 * 60, // 24 hours
  WEEK: 7 * 24 * 60 * 60, // 1 week
} as const;

// Redis connection event handlers
redis.on('connect', () => {
  console.log('Redis connected successfully');
});

redis.on('error', (error) => {
  console.error('Redis connection error:', error);
});

redis.on('ready', () => {
  console.log('Redis is ready to accept commands');
});

redis.on('close', () => {
  console.log('Redis connection closed');
});

// Utility functions for Redis operations
export class RedisCache {
  /**
   * Set a value in Redis with optional TTL
   */
  static async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const serializedValue = JSON.stringify(value);
      if (ttl) {
        await redis.setex(key, ttl, serializedValue);
      } else {
        await redis.set(key, serializedValue);
      }
    } catch (error) {
      console.error(`Redis SET error for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get a value from Redis
   */
  static async get<T>(key: string): Promise<T | null> {
    try {
      const value = await redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Redis GET error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Delete a key from Redis
   */
  static async del(key: string): Promise<void> {
    try {
      await redis.del(key);
    } catch (error) {
      console.error(`Redis DEL error for key ${key}:`, error);
    }
  }

  /**
   * Delete multiple keys matching a pattern
   */
  static async delPattern(pattern: string): Promise<void> {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      console.error(`Redis DEL pattern error for ${pattern}:`, error);
    }
  }

  /**
   * Check if a key exists
   */
  static async exists(key: string): Promise<boolean> {
    try {
      const result = await redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`Redis EXISTS error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Set a lock with expiration
   */
  static async setLock(key: string, ttl: number): Promise<boolean> {
    try {
      const result = await redis.set(key, '1', 'EX', ttl, 'NX');
      return result === 'OK';
    } catch (error) {
      console.error(`Redis LOCK error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Increment a counter
   */
  static async incr(key: string, ttl?: number): Promise<number> {
    try {
      const result = await redis.incr(key);
      if (ttl && result === 1) {
        await redis.expire(key, ttl);
      }
      return result;
    } catch (error) {
      console.error(`Redis INCR error for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Add item to a sorted set with score
   */
  static async zadd(key: string, score: number, member: string, ttl?: number): Promise<void> {
    try {
      await redis.zadd(key, score, member);
      if (ttl) {
        await redis.expire(key, ttl);
      }
    } catch (error) {
      console.error(`Redis ZADD error for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get range from sorted set
   */
  static async zrevrange(key: string, start: number, stop: number): Promise<string[]> {
    try {
      return await redis.zrevrange(key, start, stop);
    } catch (error) {
      console.error(`Redis ZREVRANGE error for key ${key}:`, error);
      return [];
    }
  }

  /**
   * Set expiration for a key
   */
  static async expire(key: string, ttl: number): Promise<boolean> {
    try {
      const result = await redis.expire(key, ttl);
      return result === 1;
    } catch (error) {
      console.error(`Redis EXPIRE error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete a key (alias for del)
   */
  static async delete(key: string): Promise<boolean> {
    try {
      const result = await redis.del(key);
      return result === 1;
    } catch (error) {
      console.error(`Redis DELETE error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Clear keys matching pattern (alias for delPattern)
   */
  static async clearPattern(pattern: string): Promise<void> {
    return this.delPattern(pattern);
  }

  /**
   * Increment a counter (alias for incr)
   */
  static async increment(key: string, ttl?: number): Promise<number> {
    return this.incr(key, ttl);
  }

  /**
   * Get Redis client for advanced operations
   */
  static getClient(): Redis {
    return redis;
  }
}

// Legacy exports for backward compatibility
export const getRedisClient = () => redis;
export const cacheService = RedisCache;
export const CacheKeys = REDIS_KEYS;
export const CacheTTL = CACHE_TTL;

export default redis;
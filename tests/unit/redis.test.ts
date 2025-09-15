import { cacheService, CacheKeys, CacheTTL } from '@/lib/redis'
import { sessionCache, feedCache, contentCache, rateLimitService } from '@/services/cache.service'
import { RedisHealthCheck } from '@/utils/redis-health'

// Mock ioredis (the client used by src/lib/redis)
const mockRedisStore = new Map<string, string>()
let mockTtls = new Map<string, number>()

jest.mock('ioredis', () => {
  return class MockIORedis {
    constructor() {}
    on() {}
    // Connection
    connect = jest.fn(async () => {})
    // Commands used in our code
    ping = jest.fn(async () => 'PONG')
    set = jest.fn(async (key: string, value: string, ...args: any[]) => {
      // Support optional EX ttl NX style: set key value 'EX' ttl 'NX'
      if (args.length >= 2 && args[0] === 'EX') {
        const ttl = Number(args[1])
        mockTtls.set(key, ttl)
      }
      mockRedisStore.set(key, value)
      return 'OK'
    })
    setex = jest.fn(async (key: string, ttl: number, value: string) => {
      mockRedisStore.set(key, value)
      mockTtls.set(key, ttl)
      return 'OK'
    })
    get = jest.fn(async (key: string) => mockRedisStore.get(key) ?? null)
    del = jest.fn(async (...keys: string[]) => {
      let count = 0
      keys.forEach(k => {
        if (mockRedisStore.delete(k)) count++
        mockTtls.delete(k)
      })
      return count
    })
    exists = jest.fn(async (key: string) => (mockRedisStore.has(key) ? 1 : 0))
    expire = jest.fn(async (key: string, ttl: number) => {
      // For testing, report success and set TTL regardless of prior existence
      mockTtls.set(key, ttl)
      return 1
    })
    incr = jest.fn(async (key: string) => {
      const val = Number(mockRedisStore.get(key) ?? '0') + 1
      mockRedisStore.set(key, String(val))
      return val
    })
    zadd = jest.fn(async (_key: string, _score: number, _member: string) => 1)
    zrevrange = jest.fn(async (_key: string, _start: number, _stop: number) => [])
    keys = jest.fn(async (pattern: string) => {
      const regex = new RegExp('^' + pattern.replace('*', '.*') + '$')
      return Array.from(mockRedisStore.keys()).filter(k => regex.test(k))
    })
    ttl = jest.fn(async (key: string) => mockTtls.get(key) ?? -1)
    info = jest.fn(async () => 'redis_version:6.2.0')
    quit = jest.fn(async () => 'OK')
    disconnect = jest.fn(async () => {})
  }
})

describe('Redis Configuration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRedisStore.clear()
  })

  describe('CacheService', () => {
    it('should set and get values', async () => {
      await cacheService.set('test-key', 'test-value')
      const value = await cacheService.get('test-key')
      expect(value).toBe('test-value')
    })

    it('should set values with expiration', async () => {
      await cacheService.set('test-key-ttl', 'test-value', 300)
      const value = await cacheService.get('test-key-ttl')
      expect(value).toBe('test-value')
    })

    it('should handle JSON objects', async () => {
      const testObject = { id: 1, name: 'test' }
      await cacheService.set('test-object', testObject)
      const value = await cacheService.get('test-object')
      expect(value).toEqual(testObject)
    })

    it('should delete keys', async () => {
      // First set a key
      await cacheService.set('delete-test-key', 'test-value')
      const deleted = await cacheService.delete('delete-test-key')
      expect(deleted).toBe(true)
    })

    it('should check if keys exist', async () => {
      // First set a key
      await cacheService.set('exists-test-key', 'test-value')
      const exists = await cacheService.exists('exists-test-key')
      expect(exists).toBe(true)
    })
  })

  describe('SessionCacheService', () => {
    it('should set and get user sessions', async () => {
      const sessionData = {
        userId: 'user-123',
        email: 'test@example.com',
        name: 'Test User'
      }

      await sessionCache.setUserSession('user-123', sessionData)
      const retrievedSession = await sessionCache.getUserSession('user-123')
      
      expect(retrievedSession).toEqual(sessionData)
    })

    it('should remove user sessions', async () => {
      // First set a session
      await sessionCache.setUserSession('user-456', { userId: 'user-456' })
      const removed = await sessionCache.removeUserSession('user-456')
      expect(removed).toBe(true)
    })

    it('should extend session expiration', async () => {
      const extended = await sessionCache.extendSession('user-123')
      expect(extended).toBe(true)
    })
  })

  describe('FeedCacheService', () => {
    it('should cache public feed data', async () => {
      const feedData = [
        { storyId: 'story-1', title: 'Test Story 1' },
        { storyId: 'story-2', title: 'Test Story 2' }
      ]

      await feedCache.setPublicFeed(1, 10, feedData)
      const cachedFeed = await feedCache.getPublicFeed(1, 10)
      
      expect(cachedFeed).toEqual(feedData)
    })

    it('should cache creator feed data', async () => {
      const feedData = [
        { storyId: 'story-3', title: 'Creator Story 1' }
      ]

      await feedCache.setCreatorFeed('creator-123', 1, 10, feedData)
      const cachedFeed = await feedCache.getCreatorFeed('creator-123', 1, 10)
      
      expect(cachedFeed).toEqual(feedData)
    })
  })

  describe('ContentCacheService', () => {
    it('should cache story data', async () => {
      const storyData = {
        id: 'story-123',
        title: 'Test Story',
        nodes: []
      }

      await contentCache.setStory('story-123', storyData)
      const cachedStory = await contentCache.getStory('story-123')
      
      expect(cachedStory).toEqual(storyData)
    })

    it('should cache video processing status', async () => {
      await contentCache.setVideoProcessingStatus('video-123', 'processing')
      const status = await contentCache.getVideoProcessingStatus('video-123')
      
      expect(status).toBe('processing')
    })
  })

  describe('RateLimitService', () => {
    it('should allow requests within limit', async () => {
      const result = await rateLimitService.checkRateLimit('user-123', '/api/test', 10, 60)
      
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(9)
    })

    it('should reset rate limits', async () => {
      // First create a rate limit entry
      await rateLimitService.checkRateLimit('user-456', '/api/test', 10, 60)
      const reset = await rateLimitService.resetRateLimit('user-456', '/api/test')
      expect(reset).toBe(true)
    })
  })

  describe('RedisHealthCheck', () => {
    it('should check Redis health', async () => {
      const health = await RedisHealthCheck.isHealthy()
      
      expect(health.healthy).toBe(true)
      expect(health.message).toContain('Redis is connected')
    })

    it('should test Redis operations', async () => {
      const operations = await RedisHealthCheck.testOperations()
      
      expect(operations.success).toBe(true)
      expect(operations.operations).toBeDefined()
    })

    it('should perform comprehensive health check', async () => {
      const comprehensive = await RedisHealthCheck.comprehensiveCheck()
      
      expect(comprehensive.overall).toBe(true)
      expect(comprehensive.checks.connectivity.healthy).toBe(true)
      expect(comprehensive.checks.operations.success).toBe(true)
    })
  })

  describe('Cache Keys', () => {
    it('should generate correct cache keys', () => {
      expect(CacheKeys.userSession('user-123')).toBe('session:user-123')
      expect(CacheKeys.publicFeed(1, 10)).toBe('feed:public:1:10')
      expect(CacheKeys.story('story-123')).toBe('story:story-123')
      expect(CacheKeys.rateLimit('user-123', '/api/test')).toBe('rate:/api/test:user-123')
    })
  })

  describe('Cache TTL', () => {
    it('should have correct TTL values', () => {
      expect(CacheTTL.SHORT).toBe(5 * 60)
      expect(CacheTTL.MEDIUM).toBe(30 * 60)
      expect(CacheTTL.LONG).toBe(2 * 60 * 60)
      expect(CacheTTL.DAY).toBe(24 * 60 * 60)
      expect(CacheTTL.WEEK).toBe(7 * 24 * 60 * 60)
    })
  })
})

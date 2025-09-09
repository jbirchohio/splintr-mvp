import { cacheService, CacheKeys, CacheTTL } from '@/lib/redis'

/**
 * Session management service using Redis
 */
export class SessionCacheService {
  /**
   * Store user session data
   */
  async setUserSession(userId: string, sessionData: unknown, ttl = CacheTTL.DAY): Promise<void> {
    const key = CacheKeys.userSession(userId)
    await cacheService.set(key, sessionData, ttl)
  }

  /**
   * Get user session data
   */
  async getUserSession<T = Record<string, unknown>>(userId: string): Promise<T | null> {
    const key = CacheKeys.userSession(userId)
    return await cacheService.get<T>(key)
  }

  /**
   * Remove user session
   */
  async removeUserSession(userId: string): Promise<boolean> {
    const key = CacheKeys.userSession(userId)
    return await cacheService.delete(key)
  }

  /**
   * Extend session expiration
   */
  async extendSession(userId: string, ttl = CacheTTL.DAY): Promise<boolean> {
    const key = CacheKeys.userSession(userId)
    return await cacheService.expire(key, ttl)
  }
}

/**
 * Feed caching service for performance optimization
 */
export class FeedCacheService {
  /**
   * Cache public feed data
   */
  async setPublicFeed(page: number, limit: number, feedData: unknown[], ttl = CacheTTL.MEDIUM): Promise<void> {
    const key = CacheKeys.publicFeed(page, limit)
    await cacheService.set(key, feedData, ttl)
  }

  /**
   * Get cached public feed data
   */
  async getPublicFeed<T = unknown[]>(page: number, limit: number): Promise<T | null> {
    const key = CacheKeys.publicFeed(page, limit)
    return await cacheService.get<T>(key)
  }

  /**
   * Cache creator-specific feed data
   */
  async setCreatorFeed(creatorId: string, page: number, limit: number, feedData: unknown[], ttl = CacheTTL.MEDIUM): Promise<void> {
    const key = CacheKeys.creatorFeed(creatorId, page, limit)
    await cacheService.set(key, feedData, ttl)
  }

  /**
   * Get cached creator feed data
   */
  async getCreatorFeed<T = unknown[]>(creatorId: string, page: number, limit: number): Promise<T | null> {
    const key = CacheKeys.creatorFeed(creatorId, page, limit)
    return await cacheService.get<T>(key)
  }

  /**
   * Invalidate all feed caches (when new content is published)
   */
  async invalidateAllFeeds(): Promise<void> {
    await Promise.all([
      cacheService.clearPattern('feed:public:*'),
      cacheService.clearPattern('feed:creator:*')
    ])
  }

  /**
   * Invalidate specific creator's feed cache
   */
  async invalidateCreatorFeed(creatorId: string): Promise<void> {
    await cacheService.clearPattern(`feed:creator:${creatorId}:*`)
  }
}

/**
 * Story and video content caching service
 */
export class ContentCacheService {
  /**
   * Cache story data
   */
  async setStory(storyId: string, storyData: unknown, ttl = CacheTTL.LONG): Promise<void> {
    const key = CacheKeys.story(storyId)
    await cacheService.set(key, storyData, ttl)
  }

  /**
   * Get cached story data
   */
  async getStory<T = unknown>(storyId: string): Promise<T | null> {
    const key = CacheKeys.story(storyId)
    return await cacheService.get<T>(key)
  }

  /**
   * Cache story metadata (for feed display)
   */
  async setStoryMetadata(storyId: string, metadata: unknown, ttl = CacheTTL.LONG): Promise<void> {
    const key = CacheKeys.storyMetadata(storyId)
    await cacheService.set(key, metadata, ttl)
  }

  /**
   * Get cached story metadata
   */
  async getStoryMetadata<T = unknown>(storyId: string): Promise<T | null> {
    const key = CacheKeys.storyMetadata(storyId)
    return await cacheService.get<T>(key)
  }

  /**
   * Cache video processing status
   */
  async setVideoProcessingStatus(videoId: string, status: string, ttl = CacheTTL.SHORT): Promise<void> {
    const key = CacheKeys.videoProcessingStatus(videoId)
    await cacheService.set(key, status, ttl)
  }

  /**
   * Get video processing status
   */
  async getVideoProcessingStatus(videoId: string): Promise<string | null> {
    const key = CacheKeys.videoProcessingStatus(videoId)
    return await cacheService.get(key)
  }

  /**
   * Remove story from cache (when updated)
   */
  async invalidateStory(storyId: string): Promise<void> {
    await Promise.all([
      cacheService.delete(CacheKeys.story(storyId)),
      cacheService.delete(CacheKeys.storyMetadata(storyId))
    ])
  }
}

/**
 * Rate limiting service using Redis
 */
export class RateLimitService {
  /**
   * Check and increment rate limit counter
   * Returns true if request is allowed, false if rate limited
   */
  async checkRateLimit(
    identifier: string, 
    endpoint: string, 
    maxRequests: number, 
    windowSeconds: number
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const key = CacheKeys.rateLimit(identifier, endpoint)
    const current = await cacheService.get<string>(key)
    
    if (!current) {
      // First request in window
      await cacheService.set(key, '1', windowSeconds)
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetTime: Date.now() + (windowSeconds * 1000)
      }
    }

    const count = parseInt(current, 10)
    if (count >= maxRequests) {
      // Rate limit exceeded
      const ttl = await cacheService.getClient().ttl(key)
      return {
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + (ttl * 1000)
      }
    }

    // Increment counter
    const newCount = await cacheService.increment(key)
    const ttl = await cacheService.getClient().ttl(key)
    
    return {
      allowed: true,
      remaining: maxRequests - newCount,
      resetTime: Date.now() + (ttl * 1000)
    }
  }

  /**
   * Reset rate limit for a specific identifier and endpoint
   */
  async resetRateLimit(identifier: string, endpoint: string): Promise<boolean> {
    const key = CacheKeys.rateLimit(identifier, endpoint)
    return await cacheService.delete(key)
  }
}

/**
 * Moderation result caching service
 */
export class ModerationCacheService {
  /**
   * Cache moderation result
   */
  async setModerationResult(contentId: string, result: unknown, ttl = CacheTTL.DAY): Promise<void> {
    const key = CacheKeys.moderationResult(contentId)
    await cacheService.set(key, result, ttl)
  }

  /**
   * Get cached moderation result
   */
  async getModerationResult<T = unknown>(contentId: string): Promise<T | null> {
    const key = CacheKeys.moderationResult(contentId)
    return await cacheService.get<T>(key)
  }

  /**
   * Remove moderation result from cache
   */
  async invalidateModerationResult(contentId: string): Promise<boolean> {
    const key = CacheKeys.moderationResult(contentId)
    return await cacheService.delete(key)
  }
}

// Export service instances
export const sessionCache = new SessionCacheService()
export const feedCache = new FeedCacheService()
export const contentCache = new ContentCacheService()
export const rateLimitService = new RateLimitService()
export const moderationCache = new ModerationCacheService()
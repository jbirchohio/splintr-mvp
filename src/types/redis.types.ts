/**
 * Redis configuration types
 */
export interface RedisConfig {
  url: string
  socket?: {
    connectTimeout?: number
    lazyConnect?: boolean
  }
  retry_strategy?: (options: {
    error?: Error
    total_retry_time?: number
    attempt?: number
  }) => Error | number
}

/**
 * Cache service operation result
 */
export interface CacheResult<T = any> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Rate limit check result
 */
export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: number
  limit?: number
}

/**
 * Redis health check result
 */
export interface RedisHealthResult {
  healthy: boolean
  message: string
  latency?: number
  timestamp: string
}

/**
 * Session data structure
 */
export interface SessionData {
  userId: string
  email: string
  name: string
  avatar?: string
  createdAt: string
  expiresAt: string
  [key: string]: any
}

/**
 * Feed cache data structure
 */
export interface FeedCacheData {
  items: FeedItem[]
  totalCount: number
  page: number
  limit: number
  hasMore: boolean
  cachedAt: string
}

export interface FeedItem {
  storyId: string
  creatorId: string
  creatorName: string
  creatorAvatar?: string
  title: string
  thumbnailUrl: string
  publishedAt: string
  viewCount: number
}

/**
 * Story cache data structure
 */
export interface StoryCacheData {
  id: string
  creatorId: string
  title: string
  description?: string
  nodes: StoryNode[]
  isPublished: boolean
  thumbnailUrl?: string
  viewCount: number
  createdAt: string
  updatedAt: string
}

export interface StoryNode {
  id: string
  videoId: string
  choices: Choice[]
  isStartNode: boolean
  isEndNode: boolean
}

export interface Choice {
  id: string
  text: string
  nextNodeId: string | null
}

/**
 * Video processing status
 */
export type VideoProcessingStatus = 
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'

/**
 * Moderation result cache data
 */
export interface ModerationCacheData {
  contentId: string
  contentType: 'video' | 'text' | 'story'
  status: 'approved' | 'flagged' | 'rejected'
  confidence: number
  categories: string[]
  reviewRequired: boolean
  moderatedAt: string
  moderatedBy: 'ai' | 'human'
  details?: {
    aiProvider?: string
    flaggedContent?: string[]
    reviewNotes?: string
  }
}

/**
 * Cache key patterns
 */
export interface CacheKeyPatterns {
  userSession: string
  publicFeed: string
  creatorFeed: string
  story: string
  storyMetadata: string
  video: string
  videoProcessingStatus: string
  moderationResult: string
  rateLimit: string
}

/**
 * Cache TTL (Time To Live) constants
 */
export interface CacheTTLConfig {
  SHORT: number    // 5 minutes
  MEDIUM: number   // 30 minutes
  LONG: number     // 2 hours
  DAY: number      // 24 hours
  WEEK: number     // 7 days
}

/**
 * Redis middleware options
 */
export interface RedisMiddlewareOptions {
  rateLimit?: {
    maxRequests: number
    windowSeconds: number
    keyGenerator?: (req: any) => string
  }
  cache?: {
    ttlSeconds: number
    keyGenerator?: (req: any) => string
    shouldCache?: (req: any, res: any) => boolean
  }
}

/**
 * Redis operation types
 */
export type RedisOperation = 
  | 'get'
  | 'set'
  | 'delete'
  | 'exists'
  | 'expire'
  | 'increment'
  | 'mget'
  | 'mset'
  | 'keys'
  | 'ping'

/**
 * Redis connection events
 */
export type RedisConnectionEvent = 
  | 'connect'
  | 'ready'
  | 'error'
  | 'close'
  | 'reconnecting'
  | 'end'
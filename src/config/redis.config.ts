import { RedisConfig, CacheTTLConfig } from '@/types/redis.types'

/**
 * Redis configuration based on environment
 */
export const redisConfig: RedisConfig = {
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT || '5000'),
    lazyConnect: true,
  },
  retry_strategy: (options) => {
    // Connection refused
    if (options.error && (options.error as any).code === 'ECONNREFUSED') {
      console.error('Redis connection refused')
      return new Error('Redis server connection refused')
    }
    
    // Retry time exhausted (1 hour)
    if (options.total_retry_time && options.total_retry_time > 1000 * 60 * 60) {
      console.error('Redis retry time exhausted')
      return new Error('Retry time exhausted')
    }
    
    // Max retry attempts (10)
    if (options.attempt && options.attempt > 10) {
      console.error('Redis max retry attempts reached')
      return new Error('Max retry attempts reached')
    }
    
    // Exponential backoff: retry after 2^attempt * 100ms, max 3 seconds
    return Math.min((options.attempt || 1) * 100, 3000)
  }
}

/**
 * Cache TTL configuration
 */
export const cacheTTL: CacheTTLConfig = {
  SHORT: parseInt(process.env.CACHE_TTL_SHORT || '300'),      // 5 minutes
  MEDIUM: parseInt(process.env.CACHE_TTL_MEDIUM || '1800'),   // 30 minutes
  LONG: parseInt(process.env.CACHE_TTL_LONG || '7200'),       // 2 hours
  DAY: parseInt(process.env.CACHE_TTL_DAY || '86400'),        // 24 hours
  WEEK: parseInt(process.env.CACHE_TTL_WEEK || '604800'),     // 7 days
}

/**
 * Rate limiting configuration
 */
export const rateLimitConfig = {
  // API endpoints rate limits
  api: {
    default: {
      maxRequests: parseInt(process.env.RATE_LIMIT_API_DEFAULT || '100'),
      windowSeconds: parseInt(process.env.RATE_LIMIT_API_WINDOW || '60')
    },
    auth: {
      maxRequests: parseInt(process.env.RATE_LIMIT_AUTH || '10'),
      windowSeconds: parseInt(process.env.RATE_LIMIT_AUTH_WINDOW || '60')
    },
    upload: {
      maxRequests: parseInt(process.env.RATE_LIMIT_UPLOAD || '5'),
      windowSeconds: parseInt(process.env.RATE_LIMIT_UPLOAD_WINDOW || '60')
    },
    feed: {
      maxRequests: parseInt(process.env.RATE_LIMIT_FEED || '50'),
      windowSeconds: parseInt(process.env.RATE_LIMIT_FEED_WINDOW || '60')
    }
  }
}

/**
 * Cache key prefixes for different environments
 */
export const cacheKeyPrefixes = {
  development: 'dev',
  test: 'test',
  staging: 'staging',
  production: 'prod'
}

/**
 * Get cache key prefix based on environment
 */
export function getCacheKeyPrefix(): string {
  const env = process.env.NODE_ENV || 'development'
  return cacheKeyPrefixes[env as keyof typeof cacheKeyPrefixes] || 'dev'
}

/**
 * Redis feature flags
 */
export const redisFeatures = {
  // Enable/disable Redis features based on environment
  caching: process.env.REDIS_CACHING_ENABLED !== 'false',
  rateLimiting: process.env.REDIS_RATE_LIMITING_ENABLED !== 'false',
  sessionStorage: process.env.REDIS_SESSION_STORAGE_ENABLED !== 'false',
  
  // Performance settings
  enableCompression: process.env.REDIS_COMPRESSION_ENABLED === 'true',
  enablePipelining: process.env.REDIS_PIPELINING_ENABLED === 'true',
  
  // Monitoring
  enableMetrics: process.env.REDIS_METRICS_ENABLED === 'true',
  enableHealthChecks: process.env.REDIS_HEALTH_CHECKS_ENABLED !== 'false'
}

/**
 * Redis connection pool settings
 */
export const connectionPoolConfig = {
  maxConnections: parseInt(process.env.REDIS_MAX_CONNECTIONS || '10'),
  minConnections: parseInt(process.env.REDIS_MIN_CONNECTIONS || '2'),
  acquireTimeoutMillis: parseInt(process.env.REDIS_ACQUIRE_TIMEOUT || '30000'),
  createTimeoutMillis: parseInt(process.env.REDIS_CREATE_TIMEOUT || '30000'),
  destroyTimeoutMillis: parseInt(process.env.REDIS_DESTROY_TIMEOUT || '5000'),
  idleTimeoutMillis: parseInt(process.env.REDIS_IDLE_TIMEOUT || '30000'),
  reapIntervalMillis: parseInt(process.env.REDIS_REAP_INTERVAL || '1000')
}

/**
 * Environment-specific Redis settings
 */
export function getRedisConfigForEnvironment() {
  const env = process.env.NODE_ENV || 'development'
  
  const baseConfig = { ...redisConfig }
  
  switch (env) {
    case 'production':
      return {
        ...baseConfig,
        socket: {
          ...baseConfig.socket,
          connectTimeout: 10000, // Longer timeout for production
        }
      }
    
    case 'test':
      return {
        ...baseConfig,
        url: process.env.REDIS_TEST_URL || 'redis://localhost:6380',
        socket: {
          ...baseConfig.socket,
          connectTimeout: 2000, // Shorter timeout for tests
        }
      }
    
    case 'development':
    default:
      return baseConfig
  }
}
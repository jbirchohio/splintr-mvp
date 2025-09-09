import { NextRequest } from 'next/server'
import { redis } from './redis'

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
  retryAfter?: number
}

/**
 * Get client identifier for rate limiting
 */
function getClientId(request: NextRequest): string {
  // Try to get user ID from headers (if authenticated)
  const userId = request.headers.get('x-user-id')
  if (userId) {
    return `user:${userId}`
  }

  // Fall back to IP address
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const ip = forwarded ? forwarded.split(',')[0].trim() : realIp || 'unknown'
  return `ip:${ip}`
}

/**
 * Sliding window rate limiter using Redis
 */
export async function rateLimit(
  request: NextRequest,
  windowMs: number = 60000, // 1 minute default
  maxRequests: number = 100,
  keyPrefix: string = 'rate_limit'
): Promise<RateLimitResult> {
  try {
    const clientId = getClientId(request)
    const key = `${keyPrefix}:${clientId}`
    const now = Date.now()
    const window = Math.floor(now / windowMs)
    const windowKey = `${key}:${window}`

    // Use Redis pipeline for atomic operations
    const pipeline = redis.pipeline()
    
    // Increment counter for current window
    pipeline.incr(windowKey)
    
    // Set expiration for the key (2 windows to handle edge cases)
    pipeline.expire(windowKey, Math.ceil(windowMs * 2 / 1000))
    
    // Get count for previous window (for sliding window calculation)
    const prevWindow = window - 1
    const prevWindowKey = `${key}:${prevWindow}`
    pipeline.get(prevWindowKey)

    const results = await pipeline.exec()
    
    if (!results) {
      throw new Error('Redis pipeline execution failed')
    }

    const currentCount = results[0][1] as number
    const prevCount = parseInt(results[2][1] as string || '0')

    // Calculate sliding window count
    const timeIntoWindow = now % windowMs
    const weightedPrevCount = prevCount * (1 - timeIntoWindow / windowMs)
    const totalCount = Math.floor(currentCount + weightedPrevCount)

    const remaining = Math.max(0, maxRequests - totalCount)
    const reset = (window + 1) * windowMs

    if (totalCount > maxRequests) {
      const retryAfter = Math.ceil((reset - now) / 1000)
      
      return {
        success: false,
        limit: maxRequests,
        remaining: 0,
        reset,
        retryAfter
      }
    }

    return {
      success: true,
      limit: maxRequests,
      remaining,
      reset
    }
  } catch (error) {
    console.error('Rate limiting error:', error)
    
    // Fail open - allow request if rate limiting fails
    return {
      success: true,
      limit: maxRequests,
      remaining: maxRequests - 1,
      reset: Date.now() + windowMs
    }
  }
}

/**
 * Rate limit configurations for different endpoints
 */
export const RATE_LIMITS = {
  // Authentication endpoints
  AUTH: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5 // 5 attempts per 15 minutes
  },
  
  // Video upload endpoints
  UPLOAD: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10 // 10 uploads per hour
  },
  
  // Story creation/update
  STORY_WRITE: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30 // 30 requests per minute
  },
  
  // Feed and read operations
  READ: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100 // 100 requests per minute
  },
  
  // Content moderation/flagging
  MODERATION: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 20 // 20 flags per hour
  },
  
  // General API
  GENERAL: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60 // 60 requests per minute
  }
} as const

/**
 * Apply rate limit headers to response
 */
export function addRateLimitHeaders(
  response: Response,
  result: RateLimitResult
): Response {
  const headers = new Headers(response.headers)
  
  headers.set('X-RateLimit-Limit', result.limit.toString())
  headers.set('X-RateLimit-Remaining', result.remaining.toString())
  headers.set('X-RateLimit-Reset', result.reset.toString())
  
  if (result.retryAfter) {
    headers.set('Retry-After', result.retryAfter.toString())
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  })
}

/**
 * Rate limiting middleware for specific endpoints
 */
export function withRateLimit(
  windowMs: number,
  maxRequests: number,
  keyPrefix?: string
) {
  return function <T extends unknown[]>(
    handler: (request: NextRequest, ...args: T) => Promise<Response>
  ) {
    return async (request: NextRequest, ...args: T): Promise<Response> => {
      const result = await rateLimit(request, windowMs, maxRequests, keyPrefix)
      
      if (!result.success) {
        const response = new Response(
          JSON.stringify({
            error: 'Rate limit exceeded',
            retryAfter: result.retryAfter
          }),
          {
            status: 429,
            headers: { 'Content-Type': 'application/json' }
          }
        )
        
        return addRateLimitHeaders(response, result)
      }

      const response = await handler(request, ...args)
      return addRateLimitHeaders(response, result)
    }
  }
}
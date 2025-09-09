import { NextApiRequest, NextApiResponse } from 'next'
import { rateLimitService } from '@/services/cache.service'

/**
 * Rate limiting middleware using Redis
 */
export function withRateLimit(
  maxRequests: number = 100,
  windowSeconds: number = 60,
  keyGenerator?: (req: NextApiRequest) => string
) {
  return function (handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void) {
    return async function (req: NextApiRequest, res: NextApiResponse) {
      try {
        // Generate identifier for rate limiting
        const identifier = keyGenerator 
          ? keyGenerator(req)
          : (req as any).ip || req.socket.remoteAddress || 'unknown'
        
        const endpoint = req.url || 'unknown'
        
        // Check rate limit
        const rateLimit = await rateLimitService.checkRateLimit(
          identifier,
          endpoint,
          maxRequests,
          windowSeconds
        )

        // Add rate limit headers
        res.setHeader('X-RateLimit-Limit', maxRequests)
        res.setHeader('X-RateLimit-Remaining', rateLimit.remaining)
        res.setHeader('X-RateLimit-Reset', Math.ceil(rateLimit.resetTime / 1000))

        if (!rateLimit.allowed) {
          return res.status(429).json({
            error: 'Too Many Requests',
            message: 'Rate limit exceeded',
            retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
          })
        }

        // Continue to the actual handler
        return await handler(req, res)
      } catch (error) {
        console.error('Rate limiting error:', error)
        // If Redis is down, allow the request to continue
        return await handler(req, res)
      }
    }
  }
}

/**
 * Caching middleware for API responses
 */
export function withCache(
  ttlSeconds: number = 300,
  keyGenerator?: (req: NextApiRequest) => string,
  shouldCache?: (req: NextApiRequest, res: NextApiResponse) => boolean
) {
  return function (handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void) {
    return async function (req: NextApiRequest, res: NextApiResponse) {
      try {
        // Only cache GET requests by default
        if (req.method !== 'GET') {
          return await handler(req, res)
        }

        // Generate cache key
        const cacheKey = keyGenerator 
          ? keyGenerator(req)
          : `api:${req.url}:${JSON.stringify(req.query)}`

        // Try to get cached response
        const { cacheService } = await import('@/lib/redis')
        const cachedResponse = await cacheService.get(cacheKey)

        if (cachedResponse) {
          const cached = cachedResponse as any
          // Add cache headers
          res.setHeader('X-Cache', 'HIT')
          res.setHeader('Cache-Control', `public, max-age=${ttlSeconds}`)
          
          return res.status(cached.status || 200).json(cached.data)
        }

        // Intercept the response to cache it
        const originalJson = res.json
        const originalStatus = res.status
        let responseStatus = 200
        let responseData: any

        res.status = function(code: number) {
          responseStatus = code
          return originalStatus.call(this, code)
        }

        res.json = function(data: any) {
          responseData = data
          
          // Cache successful responses
          if (responseStatus >= 200 && responseStatus < 300) {
            const shouldCacheResponse = shouldCache ? shouldCache(req, res) : true
            
            if (shouldCacheResponse) {
              cacheService.set(cacheKey, {
                status: responseStatus,
                data: responseData
              }, ttlSeconds).catch(error => {
                console.error('Failed to cache response:', error)
              })
            }
          }

          // Add cache headers
          res.setHeader('X-Cache', 'MISS')
          res.setHeader('Cache-Control', `public, max-age=${ttlSeconds}`)
          
          return originalJson.call(this, data)
        }

        // Continue to the actual handler
        return await handler(req, res)
      } catch (error) {
        console.error('Caching middleware error:', error)
        // If Redis is down, continue without caching
        return await handler(req, res)
      }
    }
  }
}

/**
 * Combined middleware for rate limiting and caching
 */
export function withRedisMiddleware(options: {
  rateLimit?: {
    maxRequests: number
    windowSeconds: number
    keyGenerator?: (req: NextApiRequest) => string
  }
  cache?: {
    ttlSeconds: number
    keyGenerator?: (req: NextApiRequest) => string
    shouldCache?: (req: NextApiRequest, res: NextApiResponse) => boolean
  }
}) {
  return function (handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void) {
    let wrappedHandler = handler

    // Apply caching middleware if configured
    if (options.cache) {
      wrappedHandler = withCache(
        options.cache.ttlSeconds,
        options.cache.keyGenerator,
        options.cache.shouldCache
      )(wrappedHandler)
    }

    // Apply rate limiting middleware if configured
    if (options.rateLimit) {
      wrappedHandler = withRateLimit(
        options.rateLimit.maxRequests,
        options.rateLimit.windowSeconds,
        options.rateLimit.keyGenerator
      )(wrappedHandler)
    }

    return wrappedHandler
  }
}

/**
 * Utility functions for common key generators
 */
export const KeyGenerators = {
  /**
   * Generate key based on IP address
   */
  byIP: (req: NextApiRequest) => (req as any).ip || req.socket.remoteAddress || 'unknown',
  
  /**
   * Generate key based on user ID (requires authentication)
   */
  byUserId: (req: NextApiRequest) => {
    // This assumes you have user info in req after authentication middleware
    const userId = (req as any).user?.id
    return userId || KeyGenerators.byIP(req)
  },
  
  /**
   * Generate key based on API key or token
   */
  byApiKey: (req: NextApiRequest) => {
    const apiKey = req.headers['x-api-key'] || req.headers.authorization
    return apiKey as string || KeyGenerators.byIP(req)
  },
  
  /**
   * Generate cache key for paginated endpoints
   */
  forPagination: (req: NextApiRequest) => {
    const { page = 1, limit = 10, ...otherParams } = req.query
    return `${req.url}:page:${page}:limit:${limit}:${JSON.stringify(otherParams)}`
  }
}
# Redis Configuration for Splintr

This document describes the Redis caching setup for the Splintr application.

## Overview

Redis is used in Splintr for:
- Session management and user authentication state
- Feed caching for improved performance
- Story and video metadata caching
- Rate limiting for API endpoints
- Content moderation result caching

## Installation

### Local Development

1. **Install Redis locally:**
   ```bash
   # Windows (using Chocolatey)
   choco install redis-64
   
   # macOS (using Homebrew)
   brew install redis
   
   # Ubuntu/Debian
   sudo apt-get install redis-server
   ```

2. **Start Redis server:**
   ```bash
   redis-server
   ```

3. **Verify Redis is running:**
   ```bash
   redis-cli ping
   # Should return: PONG
   ```

### Production

For production, consider using managed Redis services:
- **AWS ElastiCache**
- **Google Cloud Memorystore**
- **Azure Cache for Redis**
- **Redis Cloud**

## Configuration

### Environment Variables

Add these variables to your `.env.local` file:

```bash
# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_CONNECT_TIMEOUT=5000
REDIS_CACHING_ENABLED=true
REDIS_RATE_LIMITING_ENABLED=true
REDIS_SESSION_STORAGE_ENABLED=true

# Cache TTL Settings (in seconds)
CACHE_TTL_SHORT=300      # 5 minutes
CACHE_TTL_MEDIUM=1800    # 30 minutes
CACHE_TTL_LONG=7200      # 2 hours
CACHE_TTL_DAY=86400      # 24 hours
CACHE_TTL_WEEK=604800    # 7 days

# Rate Limiting Settings
RATE_LIMIT_API_DEFAULT=100
RATE_LIMIT_API_WINDOW=60
RATE_LIMIT_AUTH=10
RATE_LIMIT_AUTH_WINDOW=60
RATE_LIMIT_UPLOAD=5
RATE_LIMIT_UPLOAD_WINDOW=60
RATE_LIMIT_FEED=50
RATE_LIMIT_FEED_WINDOW=60
```

## Usage

### Basic Caching

```typescript
import { cacheService } from '@/lib/redis'

// Set a value with TTL
await cacheService.set('user:123', userData, 3600) // 1 hour

// Get a value
const userData = await cacheService.get('user:123', true) // parseJson = true

// Delete a value
await cacheService.delete('user:123')
```

### Session Management

```typescript
import { sessionCache } from '@/services/cache.service'

// Store user session
await sessionCache.setUserSession('user-123', {
  userId: 'user-123',
  email: 'user@example.com',
  name: 'John Doe'
})

// Retrieve session
const session = await sessionCache.getUserSession('user-123')

// Remove session
await sessionCache.removeUserSession('user-123')
```

### Feed Caching

```typescript
import { feedCache } from '@/services/cache.service'

// Cache public feed
await feedCache.setPublicFeed(1, 10, feedData)

// Get cached feed
const cachedFeed = await feedCache.getPublicFeed(1, 10)

// Invalidate all feeds (when new content is published)
await feedCache.invalidateAllFeeds()
```

### Rate Limiting

```typescript
import { rateLimitService } from '@/services/cache.service'

// Check rate limit
const rateLimit = await rateLimitService.checkRateLimit(
  'user-123',      // identifier
  '/api/upload',   // endpoint
  5,               // max requests
  60               // window in seconds
)

if (!rateLimit.allowed) {
  // Rate limit exceeded
  return res.status(429).json({ error: 'Too Many Requests' })
}
```

### API Middleware

```typescript
import { withRateLimit, withCache } from '@/lib/redis-middleware'

// Apply rate limiting to an API route
export default withRateLimit(10, 60)(async function handler(req, res) {
  // Your API logic here
})

// Apply caching to an API route
export default withCache(300)(async function handler(req, res) {
  // Your API logic here
})

// Apply both rate limiting and caching
export default withRedisMiddleware({
  rateLimit: { maxRequests: 10, windowSeconds: 60 },
  cache: { ttlSeconds: 300 }
})(async function handler(req, res) {
  // Your API logic here
})
```

## Health Monitoring

### Health Check Endpoint

The application includes a Redis health check endpoint:

```
GET /api/health/redis
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "checks": {
    "connectivity": {
      "healthy": true,
      "message": "Redis is connected and responsive",
      "latency": 5
    },
    "operations": {
      "success": true,
      "message": "All Redis operations completed successfully",
      "operations": {
        "set": true,
        "get": true,
        "delete": true
      }
    }
  },
  "redis": {
    "connected": true,
    "latency": 5,
    "operations": true
  }
}
```

### Manual Health Check

```typescript
import { RedisHealthCheck } from '@/utils/redis-health'

// Basic connectivity check
const health = await RedisHealthCheck.isHealthy()

// Test all operations
const operations = await RedisHealthCheck.testOperations()

// Comprehensive check
const comprehensive = await RedisHealthCheck.comprehensiveCheck()
```

## Cache Keys

The application uses structured cache keys with prefixes:

- `session:{userId}` - User session data
- `feed:public:{page}:{limit}` - Public feed data
- `feed:creator:{creatorId}:{page}:{limit}` - Creator-specific feed
- `story:{storyId}` - Story data
- `story:meta:{storyId}` - Story metadata
- `video:{videoId}` - Video data
- `video:processing:{videoId}` - Video processing status
- `moderation:{contentId}` - Moderation results
- `rate:{endpoint}:{identifier}` - Rate limiting counters

## Performance Considerations

### TTL Strategy

- **Short (5 min)**: Video processing status, temporary data
- **Medium (30 min)**: Feed data, search results
- **Long (2 hours)**: Story content, user profiles
- **Day (24 hours)**: Session data, moderation results
- **Week (7 days)**: Static content, configuration

### Memory Management

- Monitor Redis memory usage
- Set appropriate `maxmemory` policy
- Use `allkeys-lru` eviction policy for caching workloads
- Consider data compression for large objects

### Connection Pooling

The application uses connection pooling to manage Redis connections efficiently:

```typescript
// Configuration in src/config/redis.config.ts
export const connectionPoolConfig = {
  maxConnections: 10,
  minConnections: 2,
  acquireTimeoutMillis: 30000,
  // ... other settings
}
```

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Ensure Redis server is running
   - Check REDIS_URL environment variable
   - Verify firewall settings

2. **High Memory Usage**
   - Monitor cache hit rates
   - Adjust TTL values
   - Implement cache eviction policies

3. **Slow Performance**
   - Check Redis server resources
   - Monitor network latency
   - Consider Redis clustering for scale

### Debugging

Enable Redis logging:
```bash
# In redis.conf
loglevel debug
logfile /var/log/redis/redis-server.log
```

Monitor Redis operations:
```bash
redis-cli monitor
```

Check Redis info:
```bash
redis-cli info
redis-cli info memory
redis-cli info stats
```

## Testing

Run Redis tests:
```bash
npm test -- tests/unit/redis.test.ts
```

The test suite covers:
- Basic cache operations
- Session management
- Feed caching
- Rate limiting
- Health checks
- Error handling

## Security

### Production Security

1. **Authentication**: Enable Redis AUTH
2. **Network**: Use private networks/VPCs
3. **Encryption**: Enable TLS for data in transit
4. **Access Control**: Implement Redis ACLs
5. **Monitoring**: Set up alerts for unusual activity

### Configuration Example

```bash
# Production Redis configuration
REDIS_URL=rediss://username:password@redis-host:6380/0
REDIS_TLS_ENABLED=true
REDIS_AUTH_ENABLED=true
```

## Monitoring and Alerts

Set up monitoring for:
- Connection count
- Memory usage
- Cache hit/miss ratios
- Response times
- Error rates

Use tools like:
- Redis Insight
- Grafana + Prometheus
- DataDog
- New Relic
import { NextApiRequest, NextApiResponse } from 'next'
import { RedisHealthCheck } from '@/utils/redis-health'

/**
 * Redis health check API endpoint
 * GET /api/health/redis
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const healthCheck = await RedisHealthCheck.comprehensiveCheck()
    
    const statusCode = healthCheck.overall ? 200 : 503
    
    return res.status(statusCode).json({
      status: healthCheck.overall ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      checks: healthCheck.checks,
      redis: {
        connected: healthCheck.checks.connectivity.healthy,
        latency: healthCheck.checks.connectivity.latency,
        operations: healthCheck.checks.operations.success
      }
    })
  } catch (error) {
    console.error('Redis health check error:', error)
    
    return res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      redis: {
        connected: false,
        error: 'Health check failed'
      }
    })
  }
}
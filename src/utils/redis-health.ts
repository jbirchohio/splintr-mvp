import { getRedisClient } from '@/lib/redis'

/**
 * Redis health check utility
 */
export class RedisHealthCheck {
  /**
   * Check if Redis is connected and responsive
   */
  static async isHealthy(): Promise<{ healthy: boolean; message: string; latency?: number }> {
    try {
      const startTime = Date.now()
      const client = await getRedisClient()
      
      // Test basic connectivity with PING command
      const pong = await client.ping()
      const latency = Date.now() - startTime
      
      if (pong === 'PONG') {
        return {
          healthy: true,
          message: 'Redis is connected and responsive',
          latency
        }
      } else {
        return {
          healthy: false,
          message: 'Redis ping returned unexpected response'
        }
      }
    } catch (error) {
      return {
        healthy: false,
        message: `Redis health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Test Redis operations (set/get/delete)
   */
  static async testOperations(): Promise<{ success: boolean; message: string; operations?: any }> {
    try {
      const client = await getRedisClient()
      const testKey = `health-check:${Date.now()}`
      const testValue = 'test-value'
      
      const operations = {
        set: false,
        get: false,
        delete: false
      }

      // Test SET operation
      await client.set(testKey, testValue)
      operations.set = true

      // Test GET operation
      const retrievedValue = await client.get(testKey)
      if (retrievedValue === testValue) {
        operations.get = true
      }

      // Test DELETE operation
      const deleteResult = await client.del(testKey)
      if (deleteResult > 0) {
        operations.delete = true
      }

      const allOperationsSuccessful = operations.set && operations.get && operations.delete

      return {
        success: allOperationsSuccessful,
        message: allOperationsSuccessful 
          ? 'All Redis operations completed successfully'
          : 'Some Redis operations failed',
        operations
      }
    } catch (error) {
      return {
        success: false,
        message: `Redis operations test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Get Redis server information
   */
  static async getServerInfo(): Promise<{ success: boolean; info?: any; message: string }> {
    try {
      const client = await getRedisClient()
      
      // Get basic server info
      const info = await client.info()
      const memory = await client.info('memory')
      const stats = await client.info('stats')
      
      return {
        success: true,
        info: {
          server: info,
          memory,
          stats
        },
        message: 'Redis server information retrieved successfully'
      }
    } catch (error) {
      return {
        success: false,
        message: `Failed to get Redis server info: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Comprehensive health check including all tests
   */
  static async comprehensiveCheck(): Promise<{
    overall: boolean
    checks: {
      connectivity: any
      operations: any
      serverInfo: any
    }
  }> {
    const [connectivity, operations, serverInfo] = await Promise.all([
      this.isHealthy(),
      this.testOperations(),
      this.getServerInfo()
    ])

    const overall = connectivity.healthy && operations.success && serverInfo.success

    return {
      overall,
      checks: {
        connectivity,
        operations,
        serverInfo
      }
    }
  }
}

/**
 * Redis connection manager for graceful shutdown
 */
export class RedisConnectionManager {
  private static shutdownHandlers: (() => Promise<void>)[] = []

  /**
   * Register a shutdown handler
   */
  static addShutdownHandler(handler: () => Promise<void>): void {
    this.shutdownHandlers.push(handler)
  }

  /**
   * Gracefully shutdown all Redis connections
   */
  static async gracefulShutdown(): Promise<void> {
    console.log('Initiating graceful Redis shutdown...')
    
    try {
      await Promise.all(this.shutdownHandlers.map(handler => handler()))
      console.log('Redis connections closed successfully')
    } catch (error) {
      console.error('Error during Redis shutdown:', error)
    }
  }

  /**
   * Setup process event handlers for graceful shutdown
   */
  static setupGracefulShutdown(): void {
    const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2'] as const

    signals.forEach(signal => {
      process.on(signal, async () => {
        console.log(`Received ${signal}, shutting down gracefully...`)
        await this.gracefulShutdown()
        process.exit(0)
      })
    })

    // Handle uncaught exceptions
    process.on('uncaughtException', async (error) => {
      console.error('Uncaught Exception:', error)
      await this.gracefulShutdown()
      process.exit(1)
    })

    // Handle unhandled promise rejections
    process.on('unhandledRejection', async (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason)
      await this.gracefulShutdown()
      process.exit(1)
    })
  }
}
import { supabase } from '@/lib/supabase';
import { redis, RedisCache } from '@/lib/redis';
import { FeedService } from './feed.service';

export class FeedBackgroundService {
  private static isListening = false;

  /**
   * Start listening for database notifications
   */
  static async startListening(): Promise<void> {
    if (this.isListening) {
      console.log('Feed background service already listening');
      return;
    }

    try {
      // Listen for PostgreSQL notifications
      await this.setupDatabaseListener();
      
      // Start periodic cache refresh
      this.startPeriodicRefresh();
      
      this.isListening = true;
      console.log('Feed background service started');
    } catch (error) {
      console.error('Error starting feed background service:', error);
      throw error;
    }
  }

  /**
   * Stop listening for notifications
   */
  static async stopListening(): Promise<void> {
    this.isListening = false;
    console.log('Feed background service stopped');
  }

  /**
   * Setup database listener for real-time updates
   */
  private static async setupDatabaseListener(): Promise<void> {
    // Listen for story publication events
    supabase
      .channel('story_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'stories',
          filter: 'is_published=eq.true'
        },
        async (payload) => {
          await this.handleStoryUpdate(payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'stories',
          filter: 'is_published=eq.true'
        },
        async (payload) => {
          await this.handleNewStory(payload);
        }
      )
      .subscribe();

    // Listen for Redis pub/sub notifications from database triggers
    redis.subscribe('feed_refresh', (err, count) => {
      if (err) {
        console.error('Error subscribing to feed_refresh channel:', err);
      } else {
        console.log(`Subscribed to feed_refresh channel (${count} channels)`);
      }
    });

    redis.on('message', async (channel, message) => {
      if (channel === 'feed_refresh') {
        await this.handleFeedRefreshNotification(message);
      }
    });
  }

  /**
   * Handle story update events
   */
  private static async handleStoryUpdate(payload: any): Promise<void> {
    try {
      const { new: newStory, old: oldStory } = payload;
      
      // Check if story was just published
      if (newStory.is_published && !oldStory.is_published) {
        console.log(`Story published: ${newStory.id}`);
        await this.invalidateFeedCaches(newStory.id, newStory.creator_id);
      }
      
      // Check if view count changed significantly
      if (newStory.view_count !== oldStory.view_count) {
        const viewDifference = newStory.view_count - oldStory.view_count;
        if (viewDifference >= 10) {
          console.log(`Story views updated: ${newStory.id} (+${viewDifference})`);
          await this.invalidateTrendingCache();
        }
      }
    } catch (error) {
      console.error('Error handling story update:', error);
    }
  }

  /**
   * Handle new story events
   */
  private static async handleNewStory(payload: any): Promise<void> {
    try {
      const newStory = payload.new;
      
      if (newStory.is_published) {
        console.log(`New story published: ${newStory.id}`);
        await this.invalidateFeedCaches(newStory.id, newStory.creator_id);
      }
    } catch (error) {
      console.error('Error handling new story:', error);
    }
  }

  /**
   * Handle feed refresh notifications from database triggers
   */
  private static async handleFeedRefreshNotification(storyId: string): Promise<void> {
    try {
      console.log(`Received feed refresh notification for story: ${storyId}`);
      
      // Debounce refresh requests (only refresh once per minute)
      const debounceKey = 'feed:refresh:debounce';
      const canRefresh = await RedisCache.setLock(debounceKey, 60);
      
      if (canRefresh) {
        await FeedService.refreshFeedCache();
      }
    } catch (error) {
      console.error('Error handling feed refresh notification:', error);
    }
  }

  /**
   * Start periodic cache refresh (every 10 minutes)
   */
  private static startPeriodicRefresh(): void {
    setInterval(async () => {
      if (!this.isListening) return;
      
      try {
        console.log('Running periodic feed cache refresh');
        await FeedService.refreshFeedCache();
      } catch (error) {
        console.error('Error in periodic feed refresh:', error);
      }
    }, 10 * 60 * 1000); // 10 minutes
  }

  /**
   * Invalidate feed caches for a specific story
   */
  private static async invalidateFeedCaches(storyId: string, creatorId: string): Promise<void> {
    try {
      await FeedService.invalidateStoryCache(storyId, creatorId);
      console.log(`Invalidated caches for story: ${storyId}`);
    } catch (error) {
      console.error('Error invalidating feed caches:', error);
    }
  }

  /**
   * Invalidate trending feed cache specifically
   */
  private static async invalidateTrendingCache(): Promise<void> {
    try {
      await RedisCache.delPattern('feed:trending:*');
      console.log('Invalidated trending feed cache');
    } catch (error) {
      console.error('Error invalidating trending cache:', error);
    }
  }

  /**
   * Flush all cached view counts to database
   */
  static async flushViewCounts(): Promise<void> {
    try {
      const pattern = 'story:views:*';
      const keys = await redis.keys(pattern);
      
      for (const key of keys) {
        const storyId = key.replace('story:views:', '');
        const viewCount = await redis.get(key);
        
        if (viewCount) {
          await supabase
            .from('stories')
            .update({ view_count: parseInt(viewCount, 10) })
            .eq('id', storyId)
            .eq('is_published', true);
          
          await redis.del(key);
        }
      }
      
      console.log(`Flushed view counts for ${keys.length} stories`);
    } catch (error) {
      console.error('Error flushing view counts:', error);
    }
  }

  /**
   * Get service health status
   */
  static getHealthStatus(): {
    isListening: boolean;
    uptime: number;
    lastRefresh: string | null;
  } {
    return {
      isListening: this.isListening,
      uptime: process.uptime(),
      lastRefresh: null // This would be populated from Redis in a real implementation
    };
  }
}

// Auto-start the service in production
if (process.env.NODE_ENV === 'production') {
  FeedBackgroundService.startListening().catch(console.error);
}

export default FeedBackgroundService;
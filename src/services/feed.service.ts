import { supabase } from '@/lib/supabase';
import { RedisCache, REDIS_KEYS, CACHE_TTL } from '@/lib/redis';
import { FeedItem, FeedResponse, PaginationParams, FeedType } from '@/types/feed.types';

export class FeedService {
  /**
   * Get paginated feed with caching
   */
  static async getFeed(
    type: FeedType = 'chronological',
    pagination: PaginationParams = {}
  ): Promise<FeedResponse> {
    const { limit = 20, cursor } = pagination;
    
    // Generate cache key
    const cacheKey = cursor 
      ? REDIS_KEYS.FEED_CURSOR(type, cursor)
      : `feed:${type}:cursor:first`;

    try {
      // Try to get from cache first
      const cachedFeed = await RedisCache.get<FeedResponse>(cacheKey);
      if (cachedFeed) {
        return cachedFeed;
      }

      // If not in cache, fetch from database
      const feedResponse = await this.fetchFeedFromDatabase(type, limit, cursor);
      
      // Cache the result
      const ttl = type === 'trending' ? CACHE_TTL.FEED_TRENDING : CACHE_TTL.FEED_MAIN;
      await RedisCache.set(cacheKey, feedResponse, ttl);

      return feedResponse;
    } catch (error) {
      console.error('Error fetching feed:', error);
      throw new Error('Failed to fetch feed');
    }
  }

  /**
   * Get creator-specific feed
   */
  static async getCreatorFeed(
    creatorId: string,
    pagination: PaginationParams = {}
  ): Promise<FeedResponse> {
    const { limit = 20, cursor } = pagination;
    const cacheKey = `${REDIS_KEYS.FEED_CREATOR(creatorId)}:${cursor || 'first'}:${limit}`;

    try {
      // Try cache first
      const cachedFeed = await RedisCache.get<FeedResponse>(cacheKey);
      if (cachedFeed) {
        return cachedFeed;
      }

      // Fetch from database using stored procedure
      const { data, error } = await supabase.rpc('get_creator_feed', {
        target_creator_id: creatorId,
        page_size: limit,
        cursor_timestamp: cursor ? new Date(cursor).toISOString() : null
      });

      if (error) {
        throw error;
      }

      const items: FeedItem[] = data.map(this.mapDatabaseRowToFeedItem);
      const hasMore = items.length === limit;
      const nextCursor = hasMore ? items[items.length - 1].publishedAt : null;

      const response: FeedResponse = {
        items,
        hasMore,
        nextCursor,
        totalCount: null // Not calculated for creator feeds to improve performance
      };

      // Cache the result
      await RedisCache.set(cacheKey, response, CACHE_TTL.FEED_CREATOR);

      return response;
    } catch (error) {
      console.error('Error fetching creator feed:', error);
      throw new Error('Failed to fetch creator feed');
    }
  }

  /**
   * Refresh feed cache
   */
  static async refreshFeedCache(): Promise<void> {
    const lockKey = 'feed:refresh:lock';
    
    try {
      // Acquire lock to prevent concurrent refreshes
      const lockAcquired = await RedisCache.setLock(lockKey, CACHE_TTL.FEED_REFRESH_LOCK);
      if (!lockAcquired) {
        console.log('Feed refresh already in progress, skipping');
        return;
      }

      console.log('Starting feed cache refresh');

      // Refresh materialized view in database
      const { error } = await supabase.rpc('refresh_feed_cache');
      if (error) {
        throw error;
      }

      // Clear all feed-related cache keys
      await Promise.all([
        RedisCache.delPattern('feed:main:*'),
        RedisCache.delPattern('feed:trending:*'),
        RedisCache.delPattern('feed:creator:*'),
        RedisCache.delPattern('feed:chronological:*')
      ]);

      // Update last refresh timestamp
      await RedisCache.set(REDIS_KEYS.FEED_LAST_REFRESH, new Date().toISOString());

      console.log('Feed cache refresh completed');
    } catch (error) {
      console.error('Error refreshing feed cache:', error);
      throw error;
    } finally {
      // Always release the lock
      await RedisCache.del(lockKey);
    }
  }

  /**
   * Increment story view count with caching
   */
  static async incrementStoryViews(storyId: string): Promise<void> {
    const viewKey = REDIS_KEYS.STORY_VIEWS(storyId);
    
    try {
      // Increment in Redis cache
      const currentViews = await RedisCache.incr(viewKey, CACHE_TTL.STORY_VIEWS);
      
      // Batch update to database every 10 views or after cache expiry
      if (currentViews % 10 === 0) {
        await this.flushViewCountToDatabase(storyId, currentViews);
      }
    } catch (error) {
      console.error('Error incrementing story views:', error);
      // Fallback to direct database update
      await this.incrementViewCountInDatabase(storyId);
    }
  }

  /**
   * Get feed statistics
   */
  static async getFeedStats(): Promise<{
    totalStories: number;
    totalViews: number;
    lastRefresh: string | null;
  }> {
    try {
      const { data: statsData, error } = await supabase
        .from('stories')
        .select('view_count')
        .eq('is_published', true);

      if (error) throw error;

      const totalStories = statsData.length;
      const totalViews = statsData.reduce((sum, story) => sum + (story.view_count || 0), 0);
      const lastRefresh = await RedisCache.get<string>(REDIS_KEYS.FEED_LAST_REFRESH);

      return {
        totalStories,
        totalViews,
        lastRefresh
      };
    } catch (error) {
      console.error('Error fetching feed stats:', error);
      throw new Error('Failed to fetch feed statistics');
    }
  }

  /**
   * Invalidate cache for specific story
   */
  static async invalidateStoryCache(storyId: string, creatorId?: string): Promise<void> {
    try {
      await Promise.all([
        // Clear main feed caches
        RedisCache.delPattern('feed:main:*'),
        RedisCache.delPattern('feed:trending:*'),
        RedisCache.delPattern('feed:chronological:*'),
        
        // Clear creator-specific cache if provided
        creatorId ? RedisCache.delPattern(`feed:creator:${creatorId}:*`) : Promise.resolve(),
        
        // Clear story view cache
        RedisCache.del(REDIS_KEYS.STORY_VIEWS(storyId))
      ]);
    } catch (error) {
      console.error('Error invalidating story cache:', error);
    }
  }

  // Private helper methods

  /**
   * Fetch feed from database using stored procedures
   */
  private static async fetchFeedFromDatabase(
    type: FeedType,
    limit: number,
    cursor?: string
  ): Promise<FeedResponse> {
    const { data, error } = await supabase.rpc('get_feed_page', {
      page_size: limit,
      cursor_timestamp: cursor ? new Date(cursor).toISOString() : null,
      feed_type: type
    });

    if (error) {
      throw error;
    }

    const items: FeedItem[] = data.map(this.mapDatabaseRowToFeedItem);
    const hasMore = items.length === limit;
    const nextCursor = hasMore ? items[items.length - 1].publishedAt : null;

    return {
      items,
      hasMore,
      nextCursor,
      totalCount: null // Not calculated for performance reasons
    };
  }

  /**
   * Map database row to FeedItem
   */
  private static mapDatabaseRowToFeedItem(row: any): FeedItem {
    return {
      storyId: row.story_id,
      creatorId: row.creator_id,
      creatorName: row.creator_name,
      creatorAvatar: row.creator_avatar,
      title: row.title,
      description: row.description,
      thumbnailUrl: row.thumbnail_url,
      viewCount: row.view_count,
      publishedAt: row.published_at,
      engagementScore: row.engagement_score
    };
  }

  /**
   * Flush cached view count to database
   */
  private static async flushViewCountToDatabase(storyId: string, viewCount: number): Promise<void> {
    try {
      const { error } = await supabase
        .from('stories')
        .update({ view_count: viewCount })
        .eq('id', storyId)
        .eq('is_published', true);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error flushing view count to database:', error);
    }
  }

  /**
   * Increment view count directly in database
   */
  private static async incrementViewCountInDatabase(storyId: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('increment_story_view_count', {
        story_uuid: storyId
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error incrementing view count in database:', error);
    }
  }
}

export default FeedService;
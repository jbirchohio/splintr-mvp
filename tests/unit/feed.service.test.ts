import { FeedService } from '@/services/feed.service';
import { RedisCache, REDIS_KEYS, CACHE_TTL } from '@/lib/redis';

// Mock dependencies
jest.mock('@/lib/redis');
jest.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: jest.fn(),
    from: jest.fn()
  }
}));

const mockRedisCache = RedisCache as jest.Mocked<typeof RedisCache>;
// Use the actual mocked module export so behavior affects FeedService
const { supabase: mockSupabase } = require('@/lib/supabase');

describe('FeedService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getFeed', () => {
    it('should return cached feed if available', async () => {
      const mockFeedResponse = {
        items: [
          {
            storyId: '123',
            creatorId: '456',
            creatorName: 'Test Creator',
            title: 'Test Story',
            viewCount: 100,
            publishedAt: '2024-01-01T00:00:00Z'
          }
        ],
        hasMore: false,
        nextCursor: null,
        totalCount: 1
      };

      mockRedisCache.get.mockResolvedValue(mockFeedResponse);

      const result = await FeedService.getFeed('chronological', { limit: 20 });

      expect(result).toEqual(mockFeedResponse);
      expect(mockRedisCache.get).toHaveBeenCalledWith('feed:chronological:cursor:first');
    });

    it('should fetch from database if not cached', async () => {
      const mockDatabaseResponse = [
        {
          story_id: '123',
          creator_id: '456',
          creator_name: 'Test Creator',
          creator_avatar: null,
          title: 'Test Story',
          description: null,
          thumbnail_url: null,
          view_count: 100,
          published_at: '2024-01-01T00:00:00Z',
          engagement_score: 50
        }
      ];

      mockRedisCache.get.mockResolvedValue(null);
      mockSupabase.rpc.mockResolvedValue({ data: mockDatabaseResponse, error: null });

      const result = await FeedService.getFeed('chronological', { limit: 20 });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].storyId).toBe('123');
      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_feed_page', {
        page_size: 20,
        cursor_timestamp: null,
        feed_type: 'chronological'
      });
      expect(mockRedisCache.set).toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      mockRedisCache.get.mockResolvedValue(null);
      mockSupabase.rpc.mockResolvedValue({ 
        data: null, 
        error: new Error('Database error') 
      });

      await expect(FeedService.getFeed('chronological')).rejects.toThrow('Failed to fetch feed');
    });
  });

  describe('getCreatorFeed', () => {
    it('should fetch creator-specific feed', async () => {
      const creatorId = '456';
      const mockDatabaseResponse = [
        {
          story_id: '123',
          creator_id: creatorId,
          creator_name: 'Test Creator',
          creator_avatar: null,
          title: 'Test Story',
          description: null,
          thumbnail_url: null,
          view_count: 100,
          published_at: '2024-01-01T00:00:00Z'
        }
      ];

      mockRedisCache.get.mockResolvedValue(null);
      mockSupabase.rpc.mockResolvedValue({ data: mockDatabaseResponse, error: null });

      const result = await FeedService.getCreatorFeed(creatorId, { limit: 20 });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].creatorId).toBe(creatorId);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_creator_feed', {
        target_creator_id: creatorId,
        page_size: 20,
        cursor_timestamp: null
      });
    });
  });

  describe('incrementStoryViews', () => {
    it('should increment views in Redis cache', async () => {
      const storyId = '123';
      mockRedisCache.incr.mockResolvedValue(5);

      await FeedService.incrementStoryViews(storyId);

      expect(mockRedisCache.incr).toHaveBeenCalledWith(
        REDIS_KEYS.STORY_VIEWS(storyId),
        CACHE_TTL.STORY_VIEWS
      );
    });

    it('should flush to database every 10 views', async () => {
      const storyId = '123';
      mockRedisCache.incr.mockResolvedValue(10);
      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null })
          })
        })
      } as any);

      await FeedService.incrementStoryViews(storyId);

      expect(mockSupabase.from).toHaveBeenCalledWith('stories');
    });
  });

  describe('refreshFeedCache', () => {
    it('should refresh materialized view and clear cache', async () => {
      mockRedisCache.setLock.mockResolvedValue(true);
      mockSupabase.rpc.mockResolvedValue({ error: null });
      mockRedisCache.delPattern.mockResolvedValue();
      mockRedisCache.set.mockResolvedValue();
      mockRedisCache.del.mockResolvedValue();

      await FeedService.refreshFeedCache();

      expect(mockSupabase.rpc).toHaveBeenCalledWith('refresh_feed_cache');
      expect(mockRedisCache.delPattern).toHaveBeenCalledTimes(4);
      expect(mockRedisCache.set).toHaveBeenCalledWith(
        'feed:last_refresh',
        expect.any(String)
      );
    });

    it('should skip refresh if lock cannot be acquired', async () => {
      mockRedisCache.setLock.mockResolvedValue(false);

      await FeedService.refreshFeedCache();

      expect(mockSupabase.rpc).not.toHaveBeenCalled();
    });
  });

  describe('getFeedStats', () => {
    it('should return feed statistics', async () => {
      const mockStatsData = [
        { view_count: 100 },
        { view_count: 200 },
        { view_count: 50 }
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: mockStatsData, error: null })
        })
      } as any);

      mockRedisCache.get.mockResolvedValue('2024-01-01T00:00:00Z');

      const result = await FeedService.getFeedStats();

      expect(result.totalStories).toBe(3);
      expect(result.totalViews).toBe(350);
      expect(result.lastRefresh).toBe('2024-01-01T00:00:00Z');
    });
  });
});

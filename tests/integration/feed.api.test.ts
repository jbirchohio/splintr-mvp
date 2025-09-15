import { createMocks } from 'node-mocks-http';
import feedHandler from '../shims/pages/api/feed/index';
import creatorFeedHandler from '../shims/pages/api/feed/creator/[creatorId]';
import refreshHandler from '@/pages/api/feed/refresh';
import statsHandler from '@/pages/api/feed/stats';
import viewHandler from '../shims/pages/api/stories/[storyId]/view';
import { FeedService } from '@/services/feed.service';

// Mock the services
jest.mock('@/services/feed.service', () => ({
  FeedService: {
    getFeed: jest.fn(),
    getCreatorFeed: jest.fn(),
    refreshFeedCache: jest.fn(),
    getFeedStats: jest.fn(),
    incrementStoryViews: jest.fn(),
  }
}));

const mockFeedService = FeedService as jest.Mocked<typeof FeedService>;

describe('/api/feed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/feed', () => {
    it('should return feed with default parameters', async () => {
      const mockResponse = {
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

      mockFeedService.getFeed.mockResolvedValue(mockResponse);

      const { req, res } = createMocks({
        method: 'GET',
        query: {}
      });

      await feedHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data).toHaveProperty('items');
      expect(data).toHaveProperty('hasMore');
      expect(data).toHaveProperty('nextCursor');
    });

    it('should validate limit parameter', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { limit: '100' } // exceeds max limit of 50
      });

      await feedHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toContain('Invalid limit parameter');
    });

    it('should validate feed type parameter', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { type: 'invalid' }
      });

      await feedHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toContain('Invalid feed type');
    });

    it('should validate cursor format', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { cursor: 'invalid-date' }
      });

      await feedHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toContain('Invalid cursor format');
    });

    it('should reject non-GET methods', async () => {
      const { req, res } = createMocks({
        method: 'POST'
      });

      await feedHandler(req, res);

      expect(res._getStatusCode()).toBe(405);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Method not allowed');
    });
  });

  describe('GET /api/feed/creator/[creatorId]', () => {
    it('should return creator feed', async () => {
      const mockResponse = {
        items: [
          {
            storyId: '123',
            creatorId: '123e4567-e89b-12d3-a456-426614174000',
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

      mockFeedService.getCreatorFeed.mockResolvedValue(mockResponse);

      const { req, res } = createMocks({
        method: 'GET',
        query: { creatorId: '123e4567-e89b-12d3-a456-426614174000' }
      });

      await creatorFeedHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data).toHaveProperty('items');
      expect(data).toHaveProperty('hasMore');
    });

    it('should validate creator ID format', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { creatorId: 'invalid-uuid' }
      });

      await creatorFeedHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toContain('Invalid creator ID format');
    });

    it('should require creator ID', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: {}
      });

      await creatorFeedHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toContain('Creator ID is required');
    });
  });

  describe('POST /api/feed/refresh', () => {
    it('should refresh feed cache', async () => {
      mockFeedService.getFeedStats.mockResolvedValue({
        totalStories: 10,
        totalViews: 1000,
        lastRefresh: '2024-01-01T00:00:00Z'
      });
      mockFeedService.refreshFeedCache.mockResolvedValue();

      const { req, res } = createMocks({
        method: 'POST',
        body: {}
      });

      await refreshHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.message).toContain('refreshed');
    });

    it('should handle forced refresh', async () => {
      mockFeedService.refreshFeedCache.mockResolvedValue();

      const { req, res } = createMocks({
        method: 'POST',
        body: { force: true }
      });

      await refreshHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
    });

    it('should reject non-POST methods', async () => {
      const { req, res } = createMocks({
        method: 'GET'
      });

      await refreshHandler(req, res);

      expect(res._getStatusCode()).toBe(405);
    });
  });

  describe('GET /api/feed/stats', () => {
    it('should return feed statistics', async () => {
      const mockStats = {
        totalStories: 10,
        totalViews: 1000,
        lastRefresh: '2024-01-01T00:00:00Z'
      };

      mockFeedService.getFeedStats.mockResolvedValue(mockStats);

      const { req, res } = createMocks({
        method: 'GET'
      });

      await statsHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data).toHaveProperty('totalStories');
      expect(data).toHaveProperty('totalViews');
      expect(data).toHaveProperty('lastRefresh');
    });

    it('should reject non-GET methods', async () => {
      const { req, res } = createMocks({
        method: 'POST'
      });

      await statsHandler(req, res);

      expect(res._getStatusCode()).toBe(405);
    });
  });

  describe('POST /api/stories/[storyId]/view', () => {
    it('should increment story view count', async () => {
      mockFeedService.incrementStoryViews.mockResolvedValue();

      const { req, res } = createMocks({
        method: 'POST',
        query: { storyId: '123e4567-e89b-12d3-a456-426614174000' }
      });

      await viewHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
    });

    it('should validate story ID format', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        query: { storyId: 'invalid-uuid' }
      });

      await viewHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toContain('Invalid story ID format');
    });

    it('should require story ID', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        query: {}
      });

      await viewHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toContain('Story ID is required');
    });

    it('should reject non-POST methods', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { storyId: '123e4567-e89b-12d3-a456-426614174000' }
      });

      await viewHandler(req, res);

      expect(res._getStatusCode()).toBe(405);
    });
  });
});

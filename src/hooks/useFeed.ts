import { useState, useEffect, useCallback } from 'react';
import { FeedItem, FeedType, FeedResponse } from '@/types/feed.types';

interface UseFeedOptions {
  type?: FeedType;
  limit?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseFeedReturn {
  items: FeedItem[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  incrementViews: (storyId: string) => Promise<void>;
}

export function useFeed(options: UseFeedOptions = {}): UseFeedReturn {
  const {
    type = 'chronological',
    limit = 20,
    autoRefresh = false,
    refreshInterval = 5 * 60 * 1000 // 5 minutes
  } = options;

  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  /**
   * Fetch initial feed data
   */
  const fetchFeed = useCallback(async (cursor?: string, append = false) => {
    try {
      if (!append) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);

      const params = new URLSearchParams({
        type,
        limit: limit.toString(),
        ...(cursor && { cursor })
      });

      const response = await fetch(`/api/feed?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: FeedResponse = await response.json();

      if (append) {
        setItems(prev => [...prev, ...data.items]);
      } else {
        setItems(data.items);
      }

      setHasMore(data.hasMore);
      setNextCursor(data.nextCursor);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch feed';
      setError(errorMessage);
      console.error('Feed fetch error:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [type, limit]);

  /**
   * Load more items (pagination)
   */
  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || !nextCursor) return;
    
    await fetchFeed(nextCursor, true);
  }, [hasMore, loadingMore, nextCursor, fetchFeed]);

  /**
   * Refresh feed data
   */
  const refresh = useCallback(async () => {
    setNextCursor(null);
    await fetchFeed();
  }, [fetchFeed]);

  /**
   * Increment story view count
   */
  const incrementViews = useCallback(async (storyId: string) => {
    try {
      const response = await fetch(`/api/stories/${storyId}/view`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to increment views');
      }

      // Optimistically update local state
      setItems(prev => prev.map(item => 
        item.storyId === storyId 
          ? { ...item, viewCount: item.viewCount + 1 }
          : item
      ));
    } catch (err) {
      console.error('Error incrementing views:', err);
      // Don't throw error to avoid disrupting user experience
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  // Auto-refresh setup
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      refresh();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refresh]);

  return {
    items,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
    incrementViews
  };
}

/**
 * Hook for creator-specific feed
 */
export function useCreatorFeed(creatorId: string, limit = 20): UseFeedReturn {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchCreatorFeed = useCallback(async (cursor?: string, append = false) => {
    try {
      if (!append) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);

      const params = new URLSearchParams({
        limit: limit.toString(),
        ...(cursor && { cursor })
      });

      const response = await fetch(`/api/feed/creator/${creatorId}?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: FeedResponse = await response.json();

      if (append) {
        setItems(prev => [...prev, ...data.items]);
      } else {
        setItems(data.items);
      }

      setHasMore(data.hasMore);
      setNextCursor(data.nextCursor);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch creator feed';
      setError(errorMessage);
      console.error('Creator feed fetch error:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [creatorId, limit]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || !nextCursor) return;
    
    await fetchCreatorFeed(nextCursor, true);
  }, [hasMore, loadingMore, nextCursor, fetchCreatorFeed]);

  const refresh = useCallback(async () => {
    setNextCursor(null);
    await fetchCreatorFeed();
  }, [fetchCreatorFeed]);

  const incrementViews = useCallback(async (storyId: string) => {
    try {
      const response = await fetch(`/api/stories/${storyId}/view`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to increment views');
      }

      setItems(prev => prev.map(item => 
        item.storyId === storyId 
          ? { ...item, viewCount: item.viewCount + 1 }
          : item
      ));
    } catch (err) {
      console.error('Error incrementing views:', err);
    }
  }, []);

  useEffect(() => {
    if (creatorId) {
      fetchCreatorFeed();
    }
  }, [fetchCreatorFeed, creatorId]);

  return {
    items,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
    incrementViews
  };
}
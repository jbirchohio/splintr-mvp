export interface FeedItem {
  storyId: string;
  creatorId: string;
  creatorName: string;
  creatorAvatar?: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  viewCount: number;
  publishedAt: string;
  engagementScore?: number;
}

export interface FeedResponse {
  items: FeedItem[];
  hasMore: boolean;
  nextCursor: string | null;
  totalCount: number | null;
}

export interface PaginationParams {
  limit?: number;
  cursor?: string;
}

export type FeedType = 'chronological' | 'trending';

export interface FeedStats {
  totalStories: number;
  totalViews: number;
  lastRefresh: string | null;
}

export interface FeedCacheConfig {
  ttl: number;
  refreshInterval: number;
  maxPageSize: number;
}

// API request/response types
export interface GetFeedRequest {
  type?: FeedType;
  limit?: number;
  cursor?: string;
}

export interface GetCreatorFeedRequest {
  creatorId: string;
  limit?: number;
  cursor?: string;
}

export interface FeedRefreshRequest {
  force?: boolean;
}

// Database row types (from stored procedures)
export interface FeedDatabaseRow {
  story_id: string;
  creator_id: string;
  creator_name: string;
  creator_avatar: string | null;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  view_count: number;
  published_at: string;
  engagement_score?: number;
}

// Feed filter and sorting options
export interface FeedFilters {
  creatorId?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  minViews?: number;
  maxViews?: number;
}

export interface FeedSortOptions {
  field: 'publishedAt' | 'viewCount' | 'engagementScore';
  direction: 'asc' | 'desc';
}

// Real-time feed update types
export interface FeedUpdateEvent {
  type: 'story_published' | 'story_unpublished' | 'view_count_updated';
  storyId: string;
  creatorId: string;
  timestamp: string;
  data?: any;
}

export interface FeedSubscription {
  id: string;
  userId?: string;
  filters?: FeedFilters;
  lastSeen?: string;
}

// Error types
export interface FeedError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

// Cache-related types
export interface CacheMetadata {
  key: string;
  ttl: number;
  createdAt: string;
  hitCount?: number;
}

export interface FeedCacheStats {
  hitRate: number;
  totalRequests: number;
  cacheSize: number;
  lastRefresh: string | null;
}
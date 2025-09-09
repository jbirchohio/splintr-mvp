'use client'

import { useState, useCallback } from 'react';
import { FeedHeader } from './FeedHeader';
import { FeedGrid } from './FeedGrid';
import { FeaturedCreators } from './FeaturedCreators';
import { useFeed } from '@/hooks/useFeed';
import { FeedType } from '@/types/feed.types';

interface FeedProps {
  initialType?: FeedType;
  className?: string;
}

export function Feed({ initialType = 'chronological', className = '' }: FeedProps) {
  const [feedType, setFeedType] = useState<FeedType>(initialType);
  
  const {
    items,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
    incrementViews
  } = useFeed({
    type: feedType,
    limit: 20,
    autoRefresh: false
  });

  const handleTypeChange = useCallback((newType: FeedType) => {
    setFeedType(newType);
  }, []);

  const handleRefresh = useCallback(async () => {
    await refresh();
  }, [refresh]);

  const handleItemView = useCallback(async (storyId: string) => {
    await incrementViews(storyId);
  }, [incrementViews]);

  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      <FeedHeader
        currentType={feedType}
        onTypeChange={handleTypeChange}
        onRefresh={handleRefresh}
        isRefreshing={loading}
        totalItems={items.length}
      />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Featured Creators Section */}
          <FeaturedCreators />
          
          {/* Main Feed */}
          {loading && items.length === 0 ? (
            <FeedSkeleton />
          ) : (
            <FeedGrid
              items={items}
              loading={loading}
              hasMore={hasMore}
              onLoadMore={loadMore}
              onItemView={handleItemView}
              error={error}
            />
          )}
        </div>
      </main>
    </div>
  );
}

// Loading skeleton component
function FeedSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden animate-pulse">
          {/* Thumbnail skeleton */}
          <div className="aspect-video bg-gray-200" />
          
          {/* Content skeleton */}
          <div className="p-4">
            {/* Creator info skeleton */}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-gray-200 rounded-full" />
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-24 mb-1" />
                <div className="h-3 bg-gray-200 rounded w-16" />
              </div>
            </div>
            
            {/* Title and description skeleton */}
            <div className="mb-3">
              <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-4 bg-gray-200 rounded w-full mb-1" />
              <div className="h-4 bg-gray-200 rounded w-2/3" />
            </div>
            
            {/* Button skeleton */}
            <div className="h-10 bg-gray-200 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}
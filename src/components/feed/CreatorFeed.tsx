'use client'

import { useState, useCallback } from 'react';
import { FeedGrid } from './FeedGrid';
import { useCreatorFeed } from '@/hooks/useFeed';

interface CreatorFeedProps {
  creatorId: string;
  creatorName?: string;
  className?: string;
}

export function CreatorFeed({ creatorId, creatorName, className = '' }: CreatorFeedProps) {
  const {
    items,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
    incrementViews
  } = useCreatorFeed(creatorId, 20);

  const handleItemView = useCallback(async (storyId: string) => {
    await incrementViews(storyId);
  }, [incrementViews]);

  const handleRefresh = useCallback(async () => {
    await refresh();
  }, [refresh]);

  return (
    <div className={`${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {creatorName ? `Stories by ${creatorName}` : 'Creator Stories'}
          </h2>
          <p className="text-gray-600 mt-1">
            {items.length} {items.length === 1 ? 'story' : 'stories'}
          </p>
        </div>
        
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Refresh stories"
        >
          <svg 
            className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
            />
          </svg>
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Feed Grid */}
      {loading && items.length === 0 ? (
        <CreatorFeedSkeleton />
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
  );
}

// Loading skeleton for creator feed
function CreatorFeedSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 3 }).map((_, index) => (
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
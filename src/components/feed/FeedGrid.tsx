'use client'

import { useEffect, useRef, useCallback } from 'react';
import { FeedItem } from './FeedItem';
import { FeedItem as FeedItemType } from '@/types/feed.types';
import { useRouter } from 'next/navigation';

interface FeedGridProps {
  items: FeedItemType[];
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onItemView: (storyId: string) => void;
  error?: string | null;
}

export function FeedGrid({ 
  items, 
  loading, 
  hasMore, 
  onLoadMore, 
  onItemView,
  error 
}: FeedGridProps) {
  const router = useRouter();
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const handleStoryLaunch = useCallback((storyId: string) => {
    router.push(`/story/${storyId}`);
  }, [router]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting && hasMore && !loading) {
          onLoadMore();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '100px'
      }
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [hasMore, loading, onLoadMore]);

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
          <svg className="w-12 h-12 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-medium text-red-800 mb-2">Failed to load feed</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (items.length === 0 && !loading) {
    return (
      <div className="text-center py-12">
        <div className="max-w-md mx-auto">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No stories yet</h3>
          <p className="text-gray-600 mb-6">
            Be the first to create an interactive story and share it with the community!
          </p>
          <button
            onClick={() => router.push('/create')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Create Your First Story
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Feed Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((item) => (
          <FeedItem
            key={item.storyId}
            item={item}
            onView={() => onItemView(item.storyId)}
            onLaunch={handleStoryLaunch}
          />
        ))}
      </div>

      {/* Loading More Indicator */}
      {hasMore && (
        <div ref={loadMoreRef} className="flex justify-center py-8">
          {loading ? (
            <div className="flex items-center gap-3 text-gray-600">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span>Loading more stories...</span>
            </div>
          ) : (
            <button
              onClick={onLoadMore}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Load More Stories
            </button>
          )}
        </div>
      )}

      {/* End of Feed Message */}
      {!hasMore && items.length > 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">You've reached the end of the feed</p>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="mt-2 text-blue-600 hover:text-blue-700 font-medium"
          >
            Back to top
          </button>
        </div>
      )}
    </div>
  );
}
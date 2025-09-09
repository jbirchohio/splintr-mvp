'use client'

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { FeedItem as FeedItemType } from '@/types/feed.types';
import { formatDistanceToNow } from 'date-fns';

interface FeedItemProps {
  item: FeedItemType;
  onView?: () => void;
  onLaunch?: (storyId: string) => void;
}

export function FeedItem({ item, onView, onLaunch }: FeedItemProps) {
  const [imageError, setImageError] = useState(false);

  const handleLaunch = () => {
    onView?.();
    onLaunch?.(item.storyId);
  };

  const formatViewCount = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200">
      {/* Story Thumbnail */}
      <div className="relative aspect-video bg-gray-100">
        {item.thumbnailUrl && !imageError ? (
          <Image
            src={item.thumbnailUrl}
            alt={item.title}
            fill
            className="object-cover"
            onError={() => setImageError(true)}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
            <svg 
              className="w-12 h-12 text-gray-400" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={1.5} 
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" 
              />
            </svg>
          </div>
        )}
        
        {/* Play Button Overlay */}
        <button
          onClick={handleLaunch}
          className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 hover:bg-opacity-20 transition-all duration-200 group"
          aria-label={`Play ${item.title}`}
        >
          <div className="w-16 h-16 bg-white bg-opacity-90 rounded-full flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform duration-200">
            <svg 
              className="w-6 h-6 text-gray-800 ml-1" 
              fill="currentColor" 
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
        </button>

        {/* View Count Badge */}
        <div className="absolute top-3 right-3 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
          </svg>
          {formatViewCount(item.viewCount)}
        </div>
      </div>

      {/* Story Metadata */}
      <div className="p-4">
        {/* Creator Info */}
        <div className="flex items-center justify-between mb-3">
          <Link 
            href={`/profile/${item.creatorId}`}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity group"
          >
            {item.creatorAvatar ? (
              <Image
                src={item.creatorAvatar}
                alt={item.creatorName}
                width={32}
                height={32}
                className="rounded-full object-cover ring-2 ring-transparent group-hover:ring-blue-200 transition-all"
              />
            ) : (
              <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center ring-2 ring-transparent group-hover:ring-blue-200 transition-all">
                <span className="text-white text-sm font-medium">
                  {item.creatorName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <p className="font-medium text-gray-900 text-sm group-hover:text-blue-600 transition-colors">
                {item.creatorName}
              </p>
              <p className="text-xs text-gray-500">
                {formatDistanceToNow(new Date(item.publishedAt), { addSuffix: true })}
              </p>
            </div>
          </Link>
          
          {/* Creator Profile Link Button */}
          <Link
            href={`/profile/${item.creatorId}`}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium px-2 py-1 rounded-md hover:bg-blue-50 transition-colors"
          >
            View Profile
          </Link>
        </div>

        {/* Story Title and Description */}
        <div className="mb-3">
          <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">
            {item.title}
          </h3>
          {item.description && (
            <p className="text-sm text-gray-600 line-clamp-2">
              {item.description}
            </p>
          )}
        </div>

        {/* Action Button */}
        <button
          onClick={handleLaunch}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z"/>
          </svg>
          Play Interactive Story
        </button>
      </div>
    </div>
  );
}
'use client'

import { useState } from 'react';
import { FeedType } from '@/types/feed.types';

interface FeedHeaderProps {
  currentType: FeedType;
  onTypeChange: (type: FeedType) => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
  totalItems?: number;
}

export function FeedHeader({ 
  currentType, 
  onTypeChange, 
  onRefresh, 
  isRefreshing = false,
  totalItems 
}: FeedHeaderProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const feedTypes: { value: FeedType; label: string; description: string }[] = [
    {
      value: 'chronological',
      label: 'Latest',
      description: 'Most recent stories'
    },
    {
      value: 'trending',
      label: 'Trending',
      description: 'Popular stories'
    }
  ];

  const currentFeedType = feedTypes.find(type => type.value === currentType);

  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Feed Title and Type Selector */}
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900">Discover</h1>
            
            {/* Feed Type Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <span>{currentFeedType?.label}</span>
                <svg 
                  className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                  {feedTypes.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => {
                        onTypeChange(type.value);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg transition-colors ${
                        currentType === type.value ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                      }`}
                    >
                      <div className="font-medium">{type.label}</div>
                      <div className="text-xs text-gray-500">{type.description}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Item Count */}
            {totalItems !== undefined && (
              <span className="text-sm text-gray-500">
                {totalItems} {totalItems === 1 ? 'story' : 'stories'}
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* Refresh Button */}
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Refresh feed"
            >
              <svg 
                className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
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
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>

            {/* Create Story Button */}
            <a
              href="/create"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Story
            </a>
          </div>
        </div>
      </div>

      {/* Close dropdown when clicking outside */}
      {isDropdownOpen && (
        <div 
          className="fixed inset-0 z-10" 
          onClick={() => setIsDropdownOpen(false)}
        />
      )}
    </div>
  );
}
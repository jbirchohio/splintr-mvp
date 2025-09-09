'use client'

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { User } from '@/types/auth.types';
import { supabase } from '@/lib/supabase';

interface CreatorWithStats extends User {
  storyCount: number;
  totalViews: number;
}

export default function CreatorsPage() {
  const [creators, setCreators] = useState<CreatorWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAllCreators();
  }, []);

  const fetchAllCreators = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all creators with their story stats
      const { data, error: queryError } = await (supabase as any).rpc('get_featured_creators', {
        limit_count: 50 // Get more creators for the full page
      }) as { data: Array<{
        creator_id: string;
        creator_name: string;
        email: string;
        avatar_url: string | null;
        created_at: string;
        updated_at: string;
        story_count: number;
        total_views: number;
      }> | null; error: unknown };

      if (queryError) {
        console.error('Error fetching creators:', queryError);
        setError('Failed to load creators');
        return;
      }

      if (!data) {
        setCreators([]);
        return;
      }

      // Map the results to our interface
      const allCreators: CreatorWithStats[] = data.map((row: any) => ({
        id: row.creator_id,
        email: row.email,
        name: row.creator_name,
        avatar: row.avatar_url || undefined,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        storyCount: row.story_count || 0,
        totalViews: row.total_views || 0
      }));

      setCreators(allCreators);
    } catch (err) {
      console.error('Error fetching creators:', err);
      setError('Failed to load creators');
    } finally {
      setLoading(false);
    }
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

  if (loading) {
    return <CreatorsPageSkeleton />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
            <svg className="w-12 h-12 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-medium text-red-800 mb-2">Failed to Load Creators</h3>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Discover Creators</h1>
              <p className="text-gray-600 mt-2">
                Explore talented storytellers and their interactive stories
              </p>
            </div>
            <Link
              href="/feed"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Feed
            </Link>
          </div>
        </div>
      </div>

      {/* Creators Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {creators.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Creators Yet</h3>
            <p className="text-gray-600 mb-6">
              Be the first to create an interactive story and join our community of creators!
            </p>
            <Link
              href="/create"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Create Your First Story
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {creators.map((creator) => (
              <Link
                key={creator.id}
                href={`/profile/${creator.id}`}
                className="group bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-all duration-200"
              >
                <div className="text-center">
                  {/* Creator Avatar */}
                  <div className="mb-4">
                    {creator.avatar ? (
                      <Image
                        src={creator.avatar}
                        alt={creator.name}
                        width={64}
                        height={64}
                        className="w-16 h-16 rounded-full object-cover mx-auto ring-4 ring-transparent group-hover:ring-blue-200 transition-all"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center mx-auto ring-4 ring-transparent group-hover:ring-blue-200 transition-all">
                        <span className="text-white text-xl font-bold">
                          {creator.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Creator Name */}
                  <h3 className="font-semibold text-gray-900 text-lg mb-2 group-hover:text-blue-600 transition-colors">
                    {creator.name}
                  </h3>

                  {/* Creator Stats */}
                  <div className="text-sm text-gray-600 space-y-1">
                    <div className="flex items-center justify-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span>{creator.storyCount} {creator.storyCount === 1 ? 'story' : 'stories'}</span>
                    </div>
                    <div className="flex items-center justify-center gap-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                      </svg>
                      <span>{formatViewCount(creator.totalViews)} views</span>
                    </div>
                  </div>

                  {/* Join Date */}
                  <p className="text-xs text-gray-500 mt-3">
                    Joined {creator.createdAt.toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'short' 
                    })}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Loading skeleton
function CreatorsPageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Skeleton */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between animate-pulse">
            <div>
              <div className="h-8 bg-gray-200 rounded w-64 mb-2" />
              <div className="h-5 bg-gray-200 rounded w-96" />
            </div>
            <div className="h-6 bg-gray-200 rounded w-24" />
          </div>
        </div>
      </div>

      {/* Grid Skeleton */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 12 }).map((_, index) => (
            <div key={index} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4" />
                <div className="h-6 bg-gray-200 rounded w-24 mx-auto mb-2" />
                <div className="h-4 bg-gray-200 rounded w-20 mx-auto mb-1" />
                <div className="h-4 bg-gray-200 rounded w-16 mx-auto mb-3" />
                <div className="h-3 bg-gray-200 rounded w-18 mx-auto" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
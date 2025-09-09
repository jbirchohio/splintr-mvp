'use client'

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { User } from '@/types/auth.types';
import { supabase } from '@/lib/supabase';

interface FeaturedCreatorsProps {
  className?: string;
}

interface CreatorWithStats extends User {
  storyCount: number;
  totalViews: number;
}

export function FeaturedCreators({ className = '' }: FeaturedCreatorsProps) {
  const [creators, setCreators] = useState<CreatorWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFeaturedCreators();
  }, []);

  const fetchFeaturedCreators = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch top creators with their story stats
      const { data, error: queryError } = await (supabase as any).rpc('get_featured_creators', {
        limit_count: 6
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
        console.error('Error fetching featured creators:', queryError);
        setError('Failed to load featured creators');
        return;
      }

      if (!data) {
        setCreators([]);
        return;
      }

      // Map the results to our interface
      const featuredCreators: CreatorWithStats[] = data.map((row: any) => ({
        id: row.creator_id,
        email: row.email,
        name: row.creator_name,
        avatar: row.avatar_url || undefined,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        storyCount: row.story_count || 0,
        totalViews: row.total_views || 0
      }));

      setCreators(featuredCreators);
    } catch (err) {
      console.error('Error fetching featured creators:', err);
      setError('Failed to load featured creators');
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
    return <FeaturedCreatorsSkeleton className={className} />;
  }

  if (error || creators.length === 0) {
    return null; // Don't show anything if there's an error or no creators
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Featured Creators</h3>
        <Link 
          href="/creators" 
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          View All
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {creators.map((creator) => (
          <Link
            key={creator.id}
            href={`/profile/${creator.id}`}
            className="group p-3 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="text-center">
              {/* Creator Avatar */}
              <div className="mb-3">
                {creator.avatar ? (
                  <Image
                    src={creator.avatar}
                    alt={creator.name}
                    width={48}
                    height={48}
                    className="w-12 h-12 rounded-full object-cover mx-auto ring-2 ring-transparent group-hover:ring-blue-200 transition-all"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center mx-auto ring-2 ring-transparent group-hover:ring-blue-200 transition-all">
                    <span className="text-white text-lg font-bold">
                      {creator.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>

              {/* Creator Name */}
              <h4 className="font-medium text-gray-900 text-sm mb-1 group-hover:text-blue-600 transition-colors truncate">
                {creator.name}
              </h4>

              {/* Creator Stats */}
              <div className="text-xs text-gray-500 space-y-1">
                <div>{creator.storyCount} {creator.storyCount === 1 ? 'story' : 'stories'}</div>
                <div>{formatViewCount(creator.totalViews)} views</div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// Loading skeleton
function FeaturedCreatorsSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 animate-pulse ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="h-6 bg-gray-200 rounded w-32" />
        <div className="h-4 bg-gray-200 rounded w-16" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="p-3 text-center">
            <div className="w-12 h-12 bg-gray-200 rounded-full mx-auto mb-3" />
            <div className="h-4 bg-gray-200 rounded w-16 mx-auto mb-1" />
            <div className="h-3 bg-gray-200 rounded w-12 mx-auto mb-1" />
            <div className="h-3 bg-gray-200 rounded w-14 mx-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
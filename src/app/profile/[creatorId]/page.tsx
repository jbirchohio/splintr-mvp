'use client'

import { useParams, useRouter } from 'next/navigation';
import { CreatorFeed } from '@/components/feed/CreatorFeed';
import { useCreatorProfile } from '@/hooks/useCreatorProfile';

export default function CreatorProfilePage() {
  const params = useParams();
  const router = useRouter();
  const creatorId = params?.creatorId as string;
  
  const { creator, loading, error } = useCreatorProfile(creatorId);

  if (loading) {
    return <CreatorProfileSkeleton />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
            <svg className="w-12 h-12 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-medium text-red-800 mb-2">Profile Not Found</h3>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => router.push('/feed')}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Back to Feed
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!creator) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-6">
            {/* Back Button */}
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>

            {/* Creator Avatar */}
            <div className="flex-shrink-0">
              {creator.avatar ? (
                <img
                  src={creator.avatar}
                  alt={creator.name}
                  className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg"
                />
              ) : (
                <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center border-4 border-white shadow-lg">
                  <span className="text-white text-2xl font-bold">
                    {creator.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Creator Info */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{creator.name}</h1>
              <p className="text-gray-600">
                Creator since {creator.createdAt.toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long' 
                })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Creator Feed */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <CreatorFeed 
          creatorId={creatorId} 
          creatorName={creator.name}
        />
      </div>
    </div>
  );
}

// Loading skeleton component
function CreatorProfileSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Skeleton */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-6 animate-pulse">
            {/* Back Button Skeleton */}
            <div className="w-16 h-6 bg-gray-200 rounded" />

            {/* Avatar Skeleton */}
            <div className="w-20 h-20 bg-gray-200 rounded-full" />

            {/* Info Skeleton */}
            <div className="flex-1">
              <div className="h-8 bg-gray-200 rounded w-48 mb-2" />
              <div className="h-5 bg-gray-200 rounded w-32" />
            </div>
          </div>
        </div>
      </div>

      {/* Feed Skeleton */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          {/* Feed Header Skeleton */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="h-8 bg-gray-200 rounded w-48 mb-2" />
              <div className="h-5 bg-gray-200 rounded w-24" />
            </div>
            <div className="h-10 bg-gray-200 rounded w-24" />
          </div>

          {/* Feed Grid Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="aspect-video bg-gray-200" />
                <div className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-gray-200 rounded-full" />
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-24 mb-1" />
                      <div className="h-3 bg-gray-200 rounded w-16" />
                    </div>
                  </div>
                  <div className="mb-3">
                    <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
                    <div className="h-4 bg-gray-200 rounded w-full mb-1" />
                    <div className="h-4 bg-gray-200 rounded w-2/3" />
                  </div>
                  <div className="h-10 bg-gray-200 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
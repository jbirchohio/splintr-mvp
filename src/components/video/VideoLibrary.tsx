import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { VideoProcessingStatus } from '@/types/video.types';
import { formatFileSize, formatDuration, formatRelativeTime } from '@/utils/helpers';
import { cn } from '@/utils/helpers';
import { VideoErrorHandler, useVideoErrorHandler } from './VideoErrorHandler';
import { VideoProcessingStatus as ProcessingStatusComponent } from './VideoProcessingStatus';

interface VideoRecord {
  id: string;
  creatorId: string;
  originalFilename: string;
  duration: number;
  fileSize: number;
  cloudinaryPublicId: string;
  streamingUrl: string;
  thumbnailUrl: string;
  processingStatus: VideoProcessingStatus;
  moderationStatus: 'pending' | 'approved' | 'flagged' | 'rejected';
  moderationResult?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface VideoLibraryStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  approved: number;
  flagged: number;
  rejected: number;
}

interface VideoLibraryProps {
  onVideoSelect?: (video: VideoRecord) => void;
  onVideoDelete?: (videoId: string) => void;
  className?: string;
}

export function VideoLibrary({ 
  onVideoSelect, 
  onVideoDelete,
  className 
}: VideoLibraryProps) {
  const [selectedStatus, setSelectedStatus] = useState<VideoProcessingStatus | 'all'>('all');
  const [selectedModeration, setSelectedModeration] = useState<'all' | 'pending' | 'approved' | 'flagged' | 'rejected'>('all');
  const [page, setPage] = useState(0);
  const [limit] = useState(12);
  const { error: operationError, handleError, clearError, retryWithErrorHandling } = useVideoErrorHandler();

  // Fetch videos
  const { 
    data: videosData, 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ['videos', 'library', selectedStatus, selectedModeration, page, limit],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: (page * limit).toString()
      });

      if (selectedStatus !== 'all') {
        params.append('processingStatus', selectedStatus);
      }

      if (selectedModeration !== 'all') {
        params.append('moderationStatus', selectedModeration);
      }

      const response = await fetch(`/api/videos/library?${params}`, {
        headers: {
          'user-id': 'current-user' // TODO: Get from auth context
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch videos');
      }

      return response.json();
    }
  });

  const videos: VideoRecord[] = videosData?.data?.videos || [];
  const stats: VideoLibraryStats = videosData?.data?.stats || {
    total: 0, pending: 0, processing: 0, completed: 0, failed: 0,
    approved: 0, flagged: 0, rejected: 0
  };

  // Handle video deletion
  const handleDelete = async (videoId: string) => {
    if (!confirm('Are you sure you want to delete this video? This action cannot be undone.')) {
      return;
    }

    await retryWithErrorHandling(async () => {
      const response = await fetch(`/api/videos/${videoId}`, {
        method: 'DELETE',
        headers: {
          'user-id': 'current-user' // TODO: Get from auth context
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || 'Failed to delete video');
      }

      onVideoDelete?.(videoId);
      refetch();
    }, 'DELETE_FAILED');
  };

  // Handle video retry processing
  const handleRetryProcessing = async (videoId: string) => {
    await retryWithErrorHandling(async () => {
      const response = await fetch(`/api/videos/${videoId}/retry`, {
        method: 'POST',
        headers: {
          'user-id': 'current-user' // TODO: Get from auth context
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || 'Failed to retry processing');
      }

      refetch();
    }, 'RETRY_FAILED');
  };

  // Check if video can be used in stories
  const canUseVideo = (video: VideoRecord) => {
    return video.processingStatus === 'completed' && video.moderationStatus === 'approved';
  };

  // Check if video needs attention
  const needsAttention = (video: VideoRecord) => {
    return video.processingStatus === 'failed' || video.moderationStatus === 'rejected';
  };

  if (error) {
    return (
      <Alert variant="error">
        <p className="font-medium">Failed to load video library</p>
        <p className="text-sm">{error instanceof Error ? error.message : 'Unknown error'}</p>
        <Button onClick={() => refetch()} variant="outline" size="sm" className="mt-2">
          Try Again
        </Button>
      </Alert>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Video Library</h2>
          <p className="text-gray-600">Manage your uploaded videos</p>
        </div>
        <Button onClick={() => window.location.href = '/upload'}>
          Upload New Video
        </Button>
      </div>

      {/* Operation Error */}
      <VideoErrorHandler 
        error={operationError}
        onDismiss={clearError}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-600">Total Videos</div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          <div className="text-sm text-gray-600">Processed</div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-2xl font-bold text-blue-600">{stats.processing}</div>
          <div className="text-sm text-gray-600">Processing</div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
          <div className="text-sm text-gray-600">Approved</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border space-y-4">
        <h3 className="font-medium text-gray-900">Filters</h3>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Processing Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as VideoProcessingStatus | 'all')}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Moderation Status
            </label>
            <select
              value={selectedModeration}
              onChange={(e) => setSelectedModeration(e.target.value as 'all' | 'pending' | 'approved' | 'flagged' | 'rejected')}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="all">All Moderation</option>
              <option value="pending">Pending Review</option>
              <option value="approved">Approved</option>
              <option value="flagged">Flagged</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Videos Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg border animate-pulse">
              <div className="aspect-video bg-gray-200 rounded-t-lg"></div>
              <div className="p-4 space-y-3">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                <div className="flex gap-2">
                  <div className="h-6 bg-gray-200 rounded w-16"></div>
                  <div className="h-6 bg-gray-200 rounded w-16"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : videos.length === 0 ? (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No videos found</h3>
          <p className="text-gray-600 mb-4">
            {selectedStatus !== 'all' || selectedModeration !== 'all' 
              ? 'No videos match your current filters.' 
              : 'Upload your first video to get started.'}
          </p>
          <Button onClick={() => window.location.href = '/upload'}>
            Upload Video
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((video) => (
            <div key={video.id} className="bg-white rounded-lg border overflow-hidden hover:shadow-md transition-shadow">
              {/* Thumbnail */}
              <div className="aspect-video bg-gray-100 relative">
                {video.thumbnailUrl ? (
                  <img
                    src={video.thumbnailUrl}
                    alt={video.originalFilename}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
                
                {/* Duration overlay */}
                <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                  {formatDuration(video.duration)}
                </div>
              </div>

              {/* Content */}
              <div className="p-4 space-y-3">
                <div>
                  <h3 className="font-medium text-gray-900 truncate" title={video.originalFilename}>
                    {video.originalFilename}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {formatFileSize(video.fileSize)} • {formatRelativeTime(new Date(video.createdAt))}
                  </p>
                </div>

                {/* Status badges */}
                <ProcessingStatusComponent 
                  status={video.processingStatus}
                  moderationStatus={video.moderationStatus}
                />

                {/* Error message for failed videos */}
                {needsAttention(video) && (
                  <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                    {video.processingStatus === 'failed' && 'Processing failed - video may be corrupted or invalid'}
                    {video.moderationStatus === 'rejected' && 'Content rejected - does not meet community guidelines'}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  {canUseVideo(video) ? (
                    <Button
                      onClick={() => onVideoSelect?.(video)}
                      size="sm"
                      className="flex-1"
                    >
                      Use in Story
                    </Button>
                  ) : video.processingStatus === 'failed' ? (
                    <Button
                      onClick={() => handleRetryProcessing(video.id)}
                      size="sm"
                      variant="outline"
                      className="flex-1"
                    >
                      Retry Processing
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="flex-1"
                      disabled
                    >
                      {video.processingStatus === 'pending' && 'Queued'}
                      {video.processingStatus === 'processing' && 'Processing...'}
                      {video.moderationStatus === 'pending' && 'Under Review'}
                      {video.moderationStatus === 'flagged' && 'Flagged'}
                      {video.moderationStatus === 'rejected' && 'Rejected'}
                    </Button>
                  )}
                  
                  <Button
                    onClick={() => handleDelete(video.id)}
                    variant="outline"
                    size="sm"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {videos.length === limit && (
        <div className="flex justify-center">
          <Button
            onClick={() => setPage(page + 1)}
            variant="outline"
          >
            Load More
          </Button>
        </div>
      )}
    </div>
  );
}
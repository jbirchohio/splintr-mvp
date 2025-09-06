import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { VideoProcessingStatus } from '@/types/video.types';
import { VideoProcessingProgress } from './VideoProcessingStatus';
import { VideoErrorHandler, useVideoErrorHandler } from './VideoErrorHandler';
import { formatFileSize, formatDuration, formatRelativeTime } from '@/utils/helpers';
import { cn } from '@/utils/helpers';

interface VideoProcessingDetails {
  videoId: string;
  originalFilename: string;
  processingStatus: VideoProcessingStatus;
  moderationStatus: 'pending' | 'approved' | 'flagged' | 'rejected';
  processingProgress?: number;
  errorDetails?: string;
  canRetry: boolean;
  estimatedCompletion?: string;
  duration: number;
  fileSize: number;
  createdAt: string;
}

interface VideoManagementDashboardProps {
  className?: string;
}

export function VideoManagementDashboard({ className }: VideoManagementDashboardProps) {
  const [refreshInterval, setRefreshInterval] = useState(5000); // 5 seconds
  const { error, handleError, clearError, retryWithErrorHandling } = useVideoErrorHandler();

  // Fetch processing videos with auto-refresh
  const { 
    data: processingVideos, 
    isLoading, 
    error: fetchError,
    refetch 
  } = useQuery({
    queryKey: ['videos', 'processing'],
    queryFn: async () => {
      const response = await fetch('/api/videos/processing', {
        headers: {
          'user-id': 'current-user' // TODO: Get from auth context
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch processing videos');
      }

      return response.json();
    },
    refetchInterval: refreshInterval,
    refetchIntervalInBackground: true
  });

  const videos: VideoProcessingDetails[] = processingVideos?.data?.videos || [];

  // Handle batch retry
  const handleBatchRetry = async (videoIds: string[]) => {
    await retryWithErrorHandling(async () => {
      const promises = videoIds.map(videoId =>
        fetch(`/api/videos/${videoId}/retry`, {
          method: 'POST',
          headers: {
            'user-id': 'current-user' // TODO: Get from auth context
          }
        })
      );

      const responses = await Promise.all(promises);
      const failedRetries = responses.filter(r => !r.ok);

      if (failedRetries.length > 0) {
        throw new Error(`Failed to retry ${failedRetries.length} videos`);
      }

      refetch();
    }, 'BATCH_RETRY_FAILED');
  };

  // Handle individual retry
  const handleRetry = async (videoId: string) => {
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

  // Filter videos by status
  const pendingVideos = videos.filter(v => v.processingStatus === 'pending');
  const processingVideosActive = videos.filter(v => v.processingStatus === 'processing');
  const failedVideos = videos.filter(v => v.processingStatus === 'failed');
  const moderationPending = videos.filter(v => v.moderationStatus === 'pending');

  if (fetchError) {
    return (
      <Alert variant="error">
        <p className="font-medium">Failed to load video processing status</p>
        <p className="text-sm">{fetchError instanceof Error ? fetchError.message : 'Unknown error'}</p>
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
          <h2 className="text-2xl font-bold text-gray-900">Video Processing Dashboard</h2>
          <p className="text-gray-600">Monitor and manage video processing status</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Auto-refresh:</label>
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              className="text-sm border border-gray-300 rounded px-2 py-1"
            >
              <option value={0}>Off</option>
              <option value={5000}>5s</option>
              <option value={10000}>10s</option>
              <option value={30000}>30s</option>
            </select>
          </div>
          
          <Button onClick={() => refetch()} variant="outline" size="sm">
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Display */}
      <VideoErrorHandler error={error} onDismiss={clearError} />

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-2xl font-bold text-yellow-600">{pendingVideos.length}</div>
          <div className="text-sm text-gray-600">Pending</div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-2xl font-bold text-blue-600">{processingVideosActive.length}</div>
          <div className="text-sm text-gray-600">Processing</div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-2xl font-bold text-red-600">{failedVideos.length}</div>
          <div className="text-sm text-gray-600">Failed</div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-2xl font-bold text-orange-600">{moderationPending.length}</div>
          <div className="text-sm text-gray-600">Under Review</div>
        </div>
      </div>

      {/* Batch Actions */}
      {failedVideos.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-medium text-red-800">Failed Videos</h3>
              <p className="text-sm text-red-600">
                {failedVideos.length} video{failedVideos.length !== 1 ? 's' : ''} failed processing
              </p>
            </div>
            <Button
              onClick={() => handleBatchRetry(failedVideos.map(v => v.videoId))}
              variant="outline"
              size="sm"
            >
              Retry All Failed
            </Button>
          </div>
        </div>
      )}

      {/* Processing Videos List */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg border p-4 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gray-200 rounded"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-2 bg-gray-200 rounded w-full"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : videos.length === 0 ? (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">All videos processed</h3>
          <p className="text-gray-600">No videos are currently being processed.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {videos.map((video) => (
            <div key={video.videoId} className="bg-white rounded-lg border p-4">
              <div className="flex items-start gap-4">
                {/* Video Info */}
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-medium text-gray-900 truncate" title={video.originalFilename}>
                        {video.originalFilename}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {formatFileSize(video.fileSize)} • {formatDuration(video.duration)} • {formatRelativeTime(new Date(video.createdAt))}
                      </p>
                    </div>
                    
                    {video.canRetry && (
                      <Button
                        onClick={() => handleRetry(video.videoId)}
                        variant="outline"
                        size="sm"
                      >
                        Retry
                      </Button>
                    )}
                  </div>

                  {/* Processing Progress */}
                  <VideoProcessingProgress 
                    status={video.processingStatus}
                    progress={video.processingProgress}
                  />

                  {/* Error Details */}
                  {video.errorDetails && (
                    <div className="mt-3 text-sm text-red-600 bg-red-50 p-2 rounded">
                      {video.errorDetails}
                    </div>
                  )}

                  {/* Estimated Completion */}
                  {video.estimatedCompletion && video.processingStatus !== 'failed' && (
                    <div className="mt-2 text-xs text-gray-500">
                      Estimated completion: {formatRelativeTime(new Date(video.estimatedCompletion))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
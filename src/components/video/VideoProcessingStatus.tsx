import React from 'react';
import { VideoProcessingStatus as ProcessingStatus } from '@/types/video.types';
import { cn } from '@/utils/helpers';

interface VideoProcessingStatusProps {
  status: ProcessingStatus;
  moderationStatus?: 'pending' | 'approved' | 'flagged' | 'rejected';
  error?: string;
  className?: string;
  showDetails?: boolean;
}

export function VideoProcessingStatus({ 
  status, 
  moderationStatus,
  error,
  className,
  showDetails = false
}: VideoProcessingStatusProps) {
  const getStatusConfig = (status: ProcessingStatus) => {
    switch (status) {
      case 'pending':
        return {
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          label: 'Pending',
          description: 'Video is queued for processing'
        };
      case 'processing':
        return {
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          ),
          label: 'Processing',
          description: 'Video is being processed and optimized'
        };
      case 'completed':
        return {
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ),
          label: 'Completed',
          description: 'Video processing completed successfully'
        };
      case 'failed':
        return {
          color: 'bg-red-100 text-red-800 border-red-200',
          icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ),
          label: 'Failed',
          description: error || 'Video processing failed'
        };
    }
  };

  const getModerationConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          label: 'Under Review',
          description: 'Content is being reviewed for compliance'
        };
      case 'approved':
        return {
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          ),
          label: 'Approved',
          description: 'Content approved and ready to use'
        };
      case 'flagged':
        return {
          color: 'bg-orange-100 text-orange-800 border-orange-200',
          icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 2H21l-3 6 3 6h-8.5l-1-2H5a2 2 0 00-2 2zm9-13.5V9" />
            </svg>
          ),
          label: 'Flagged',
          description: 'Content flagged for manual review'
        };
      case 'rejected':
        return {
          color: 'bg-red-100 text-red-800 border-red-200',
          icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
            </svg>
          ),
          label: 'Rejected',
          description: 'Content does not meet community guidelines'
        };
      default:
        return null;
    }
  };

  const processingConfig = getStatusConfig(status);
  const moderationConfig = moderationStatus ? getModerationConfig(moderationStatus) : null;

  if (showDetails) {
    return (
      <div className={cn('space-y-2', className)}>
        {/* Processing Status */}
        <div className={cn(
          'inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium',
          processingConfig.color
        )}>
          {processingConfig.icon}
          <div>
            <div className="font-medium">{processingConfig.label}</div>
            <div className="text-xs opacity-75">{processingConfig.description}</div>
          </div>
        </div>

        {/* Moderation Status */}
        {moderationConfig && (
          <div className={cn(
            'inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium',
            moderationConfig.color
          )}>
            {moderationConfig.icon}
            <div>
              <div className="font-medium">{moderationConfig.label}</div>
              <div className="text-xs opacity-75">{moderationConfig.description}</div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn('flex gap-2', className)}>
      {/* Processing Badge */}
      <span className={cn(
        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium',
        processingConfig.color
      )}>
        {processingConfig.icon}
        {processingConfig.label}
      </span>

      {/* Moderation Badge */}
      {moderationConfig && (
        <span className={cn(
          'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium',
          moderationConfig.color
        )}>
          {moderationConfig.icon}
          {moderationConfig.label}
        </span>
      )}
    </div>
  );
}

// Progress indicator for processing videos
interface VideoProcessingProgressProps {
  status: ProcessingStatus;
  progress?: number; // 0-100
  className?: string;
}

export function VideoProcessingProgress({ 
  status, 
  progress,
  className 
}: VideoProcessingProgressProps) {
  const getProgressValue = () => {
    if (progress !== undefined) return progress;
    
    switch (status) {
      case 'pending': return 0;
      case 'processing': return 50;
      case 'completed': return 100;
      case 'failed': return 0;
      default: return 0;
    }
  };

  const getProgressColor = () => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'processing': return 'bg-blue-500';
      default: return 'bg-gray-300';
    }
  };

  const progressValue = getProgressValue();
  const progressColor = getProgressColor();

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex justify-between items-center text-sm">
        <span className="font-medium">Processing Status</span>
        <span className="text-gray-600">{progressValue}%</span>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className={cn('h-2 rounded-full transition-all duration-300', progressColor)}
          style={{ width: `${progressValue}%` }}
        />
      </div>
      
      <VideoProcessingStatus 
        status={status} 
        showDetails={false}
        className="justify-center"
      />
    </div>
  );
}
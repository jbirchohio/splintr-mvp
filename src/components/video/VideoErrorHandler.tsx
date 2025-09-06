import React from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';

export interface VideoError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp?: string;
  videoId?: string;
}

interface VideoErrorHandlerProps {
  error: VideoError | Error | null;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export function VideoErrorHandler({ 
  error, 
  onRetry, 
  onDismiss,
  className 
}: VideoErrorHandlerProps) {
  if (!error) return null;

  const videoError = error instanceof Error 
    ? { code: 'UNKNOWN_ERROR', message: error.message }
    : error;

  const getErrorTitle = (code: string): string => {
    switch (code) {
      case 'UPLOAD_FAILED':
        return 'Upload Failed';
      case 'PROCESSING_FAILED':
        return 'Processing Failed';
      case 'MODERATION_FAILED':
        return 'Moderation Check Failed';
      case 'FILE_TOO_LARGE':
        return 'File Too Large';
      case 'INVALID_FILE_TYPE':
        return 'Invalid File Type';
      case 'DURATION_TOO_SHORT':
      case 'DURATION_TOO_LONG':
        return 'Invalid Duration';
      case 'NETWORK_ERROR':
        return 'Network Error';
      case 'STORAGE_ERROR':
        return 'Storage Error';
      case 'VALIDATION_ERROR':
        return 'Validation Error';
      default:
        return 'Error';
    }
  };

  const getErrorDescription = (code: string, message: string): string => {
    switch (code) {
      case 'UPLOAD_FAILED':
        return 'Your video could not be uploaded. Please check your internet connection and try again.';
      case 'PROCESSING_FAILED':
        return 'Your video upload was successful, but processing failed. Our team has been notified.';
      case 'MODERATION_FAILED':
        return 'Your video could not be checked for content compliance. Please try uploading again.';
      case 'FILE_TOO_LARGE':
        return 'Your video file is too large. Please ensure it\'s under 100MB and try again.';
      case 'INVALID_FILE_TYPE':
        return 'This file type is not supported. Please use MP4, MOV, AVI, or WebM format.';
      case 'DURATION_TOO_SHORT':
        return 'Your video is too short. Videos must be at least 15 seconds long.';
      case 'DURATION_TOO_LONG':
        return 'Your video is too long. Videos must be no longer than 30 seconds.';
      case 'NETWORK_ERROR':
        return 'There was a problem connecting to our servers. Please check your internet connection.';
      case 'STORAGE_ERROR':
        return 'There was a problem saving your video. Please try again.';
      case 'VALIDATION_ERROR':
        return 'Your video doesn\'t meet our requirements. Please check the file and try again.';
      default:
        return message || 'An unexpected error occurred. Please try again.';
    }
  };

  const shouldShowRetry = (code: string): boolean => {
    return ![
      'FILE_TOO_LARGE',
      'INVALID_FILE_TYPE', 
      'DURATION_TOO_SHORT',
      'DURATION_TOO_LONG',
      'VALIDATION_ERROR'
    ].includes(code);
  };

  const title = getErrorTitle(videoError.code);
  const description = getErrorDescription(videoError.code, videoError.message);
  const canRetry = shouldShowRetry(videoError.code);

  return (
    <Alert variant="error" className={className}>
      <div className="space-y-3">
        <div>
          <p className="font-medium">{title}</p>
          <p className="text-sm mt-1">{description}</p>
          
          {videoError.details && (
            <details className="mt-2">
              <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-800">
                Technical Details
              </summary>
              <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-auto">
                {JSON.stringify(videoError.details, null, 2)}
              </pre>
            </details>
          )}
        </div>

        <div className="flex gap-2">
          {canRetry && onRetry && (
            <Button onClick={onRetry} size="sm" variant="outline">
              Try Again
            </Button>
          )}
          {onDismiss && (
            <Button onClick={onDismiss} size="sm" variant="outline">
              Dismiss
            </Button>
          )}
        </div>
      </div>
    </Alert>
  );
}

// Hook for managing video errors
export function useVideoErrorHandler() {
  const [error, setError] = React.useState<VideoError | null>(null);

  const handleError = React.useCallback((error: VideoError | Error) => {
    if (error instanceof Error) {
      setError({
        code: 'UNKNOWN_ERROR',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    } else {
      setError({
        ...error,
        timestamp: error.timestamp || new Date().toISOString()
      });
    }
  }, []);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  const retryWithErrorHandling = React.useCallback(async (
    operation: () => Promise<void>,
    errorCode: string = 'OPERATION_FAILED'
  ) => {
    try {
      clearError();
      await operation();
    } catch (err) {
      handleError(err instanceof Error ? {
        code: errorCode,
        message: err.message
      } : err as VideoError);
    }
  }, [handleError, clearError]);

  return {
    error,
    handleError,
    clearError,
    retryWithErrorHandling
  };
}
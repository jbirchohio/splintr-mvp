import React, { useState, useRef, useEffect, useCallback } from 'react';
import { VideoMetadata } from '@/types/video.types';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils/helpers';

interface VideoPreviewProps {
  file: File;
  metadata: VideoMetadata | null;
  onMetadataUpdate?: (metadata: VideoMetadata) => void;
  className?: string;
}

export function VideoPreview({ 
  file, 
  metadata, 
  onMetadataUpdate,
  className 
}: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [showTrimControls, setShowTrimControls] = useState(false);

  // Create video URL when file changes
  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
      
      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [file]);

  // Handle video metadata loaded
  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      const videoDuration = videoRef.current.duration;
      setDuration(videoDuration);
      setTrimEnd(videoDuration);
      
      // Update metadata with actual duration
      if (onMetadataUpdate && metadata) {
        onMetadataUpdate({
          ...metadata,
          duration: videoDuration
        });
      }
    }
  }, [metadata, onMetadataUpdate]);

  // Handle time update
  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  }, []);

  // Play/pause toggle
  const togglePlayPause = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying]);

  // Seek to specific time
  const seekTo = useCallback((time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  // Handle trim start change
  const handleTrimStartChange = useCallback((value: number) => {
    const newStart = Math.max(0, Math.min(value, trimEnd - 1));
    setTrimStart(newStart);
    seekTo(newStart);
    
    // Update metadata with trimmed duration
    if (onMetadataUpdate && metadata) {
      onMetadataUpdate({
        ...metadata,
        duration: trimEnd - newStart
      });
    }
  }, [trimEnd, seekTo, onMetadataUpdate, metadata]);

  // Handle trim end change
  const handleTrimEndChange = useCallback((value: number) => {
    const newEnd = Math.min(duration, Math.max(value, trimStart + 1));
    setTrimEnd(newEnd);
    
    // Update metadata with trimmed duration
    if (onMetadataUpdate && metadata) {
      onMetadataUpdate({
        ...metadata,
        duration: newEnd - trimStart
      });
    }
  }, [duration, trimStart, onMetadataUpdate, metadata]);

  // Reset trim to full video
  const resetTrim = useCallback(() => {
    setTrimStart(0);
    setTrimEnd(duration);
    
    if (onMetadataUpdate && metadata) {
      onMetadataUpdate({
        ...metadata,
        duration: duration
      });
    }
  }, [duration, onMetadataUpdate, metadata]);

  // Format time for display
  const formatTime = useCallback((time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  // Check if video meets duration requirements
  const trimmedDuration = trimEnd - trimStart;
  const isDurationValid = trimmedDuration >= 15 && trimmedDuration <= 30;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Video Player */}
      <div className="relative bg-black rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full h-auto max-h-96"
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
        />
        
        {/* Play/Pause Overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <button
            onClick={togglePlayPause}
            className="bg-black bg-opacity-50 text-white rounded-full p-4 hover:bg-opacity-70 transition-opacity"
          >
            {isPlaying ? (
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Video Controls */}
      <div className="space-y-3">
        {/* Progress Bar */}
        <div className="relative">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-100"
              style={{ width: `${(currentTime / duration) * 100}%` }}
            />
          </div>
          
          {/* Trim indicators */}
          {showTrimControls && (
            <>
              <div
                className="absolute top-0 h-2 bg-yellow-400 opacity-50"
                style={{
                  left: `${(trimStart / duration) * 100}%`,
                  width: `${((trimEnd - trimStart) / duration) * 100}%`
                }}
              />
              <div
                className="absolute -top-1 w-3 h-4 bg-yellow-500 rounded cursor-pointer"
                style={{ left: `${(trimStart / duration) * 100}%` }}
              />
              <div
                className="absolute -top-1 w-3 h-4 bg-yellow-500 rounded cursor-pointer"
                style={{ left: `${(trimEnd / duration) * 100}%` }}
              />
            </>
          )}
        </div>

        {/* Time Display */}
        <div className="flex justify-between text-sm text-gray-600">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>

        {/* Control Buttons */}
        <div className="flex justify-center gap-2">
          <Button
            onClick={togglePlayPause}
            variant="outline"
            size="sm"
          >
            {isPlaying ? 'Pause' : 'Play'}
          </Button>
          
          <Button
            onClick={() => setShowTrimControls(!showTrimControls)}
            variant="outline"
            size="sm"
          >
            {showTrimControls ? 'Hide Trim' : 'Trim Video'}
          </Button>
        </div>
      </div>

      {/* Trim Controls */}
      {showTrimControls && (
        <div className="bg-gray-50 p-4 rounded-lg space-y-4">
          <h4 className="font-medium text-gray-900">Trim Video</h4>
          
          <div className="space-y-3">
            {/* Start Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Time: {formatTime(trimStart)}
              </label>
              <input
                type="range"
                min={0}
                max={duration}
                step={0.1}
                value={trimStart}
                onChange={(e) => handleTrimStartChange(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            {/* End Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Time: {formatTime(trimEnd)}
              </label>
              <input
                type="range"
                min={0}
                max={duration}
                step={0.1}
                value={trimEnd}
                onChange={(e) => handleTrimEndChange(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Duration Info */}
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">
                Trimmed Duration: {formatTime(trimmedDuration)}
              </span>
              <span className={cn(
                'font-medium',
                isDurationValid ? 'text-green-600' : 'text-red-600'
              )}>
                {isDurationValid ? '✓ Valid' : '✗ Must be 15-30s'}
              </span>
            </div>

            {/* Reset Button */}
            <div className="flex justify-end">
              <Button
                onClick={resetTrim}
                variant="outline"
                size="sm"
              >
                Reset to Full Video
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Video Info */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2">Video Information</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Original Duration:</span>
            <span className="ml-2 font-medium">{formatTime(duration)}</span>
          </div>
          <div>
            <span className="text-gray-600">File Size:</span>
            <span className="ml-2 font-medium">{(file.size / (1024 * 1024)).toFixed(1)}MB</span>
          </div>
          {showTrimControls && (
            <>
              <div>
                <span className="text-gray-600">Trimmed Duration:</span>
                <span className="ml-2 font-medium">{formatTime(trimmedDuration)}</span>
              </div>
              <div>
                <span className="text-gray-600">Status:</span>
                <span className={cn(
                  'ml-2 font-medium',
                  isDurationValid ? 'text-green-600' : 'text-red-600'
                )}>
                  {isDurationValid ? 'Ready' : 'Needs trimming'}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
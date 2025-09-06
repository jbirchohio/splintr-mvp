import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils/helpers';

interface ThumbnailGeneratorProps {
  videoFile: File;
  onThumbnailGenerated?: (thumbnail: Blob, timestamp: number) => void;
  className?: string;
}

export function ThumbnailGenerator({ 
  videoFile, 
  onThumbnailGenerated,
  className 
}: ThumbnailGeneratorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [thumbnails, setThumbnails] = useState<Array<{ blob: Blob; url: string; timestamp: number }>>([]);
  const [selectedThumbnail, setSelectedThumbnail] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Create video URL when file changes
  useEffect(() => {
    if (videoFile) {
      const url = URL.createObjectURL(videoFile);
      setVideoUrl(url);
      
      return () => {
        URL.revokeObjectURL(url);
        // Clean up thumbnail URLs
        thumbnails.forEach(thumb => URL.revokeObjectURL(thumb.url));
      };
    }
  }, [videoFile, thumbnails]);

  // Generate thumbnail at specific time
  const generateThumbnail = useCallback(async (timestamp: number): Promise<Blob | null> => {
    if (!videoRef.current || !canvasRef.current) return null;

    return new Promise((resolve) => {
      const video = videoRef.current!;
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext('2d')!;

      const handleSeeked = () => {
        // Set canvas dimensions to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert canvas to blob
        canvas.toBlob((blob) => {
          video.removeEventListener('seeked', handleSeeked);
          resolve(blob);
        }, 'image/jpeg', 0.8);
      };

      video.addEventListener('seeked', handleSeeked);
      video.currentTime = timestamp;
    });
  }, []);

  // Generate thumbnails at key moments
  const generateAutoThumbnails = useCallback(async (videoDuration: number) => {
    setIsGenerating(true);
    const newThumbnails: Array<{ blob: Blob; url: string; timestamp: number }> = [];

    // Generate thumbnails at 25%, 50%, and 75% of video duration
    const timestamps = [
      videoDuration * 0.25,
      videoDuration * 0.5,
      videoDuration * 0.75
    ];

    for (const timestamp of timestamps) {
      const blob = await generateThumbnail(timestamp);
      if (blob) {
        const url = URL.createObjectURL(blob);
        newThumbnails.push({ blob, url, timestamp });
      }
    }

    setThumbnails(newThumbnails);
    setIsGenerating(false);
  }, [generateThumbnail]);

  // Handle video metadata loaded
  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      const videoDuration = videoRef.current.duration;
      setDuration(videoDuration);
      setCurrentTime(videoDuration / 2); // Start at middle
      
      // Auto-generate thumbnails at key moments
      generateAutoThumbnails(videoDuration);
    }
  }, [generateAutoThumbnails]);

  // Generate thumbnail at current time
  const generateCurrentThumbnail = useCallback(async () => {
    setIsGenerating(true);
    const blob = await generateThumbnail(currentTime);
    
    if (blob) {
      const url = URL.createObjectURL(blob);
      const newThumbnail = { blob, url, timestamp: currentTime };
      
      setThumbnails(prev => [...prev, newThumbnail]);
      setSelectedThumbnail(thumbnails.length);
      
      if (onThumbnailGenerated) {
        onThumbnailGenerated(blob, currentTime);
      }
    }
    
    setIsGenerating(false);
  }, [currentTime, generateThumbnail, onThumbnailGenerated, thumbnails.length]);

  // Handle thumbnail selection
  const handleThumbnailSelect = useCallback((index: number) => {
    setSelectedThumbnail(index);
    const thumbnail = thumbnails[index];
    
    if (thumbnail && onThumbnailGenerated) {
      onThumbnailGenerated(thumbnail.blob, thumbnail.timestamp);
    }
  }, [thumbnails, onThumbnailGenerated]);

  // Seek video to specific time
  const seekTo = useCallback((time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  // Format time for display
  const formatTime = useCallback((time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Hidden video element for thumbnail generation */}
      <video
        ref={videoRef}
        src={videoUrl}
        className="hidden"
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={() => videoRef.current && setCurrentTime(videoRef.current.currentTime)}
        muted
      />
      
      {/* Hidden canvas for thumbnail generation */}
      <canvas ref={canvasRef} className="hidden" />

      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-4">Thumbnail Selection</h4>

        {/* Auto-generated thumbnails */}
        {thumbnails.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">Choose a thumbnail for your video:</p>
            
            <div className="grid grid-cols-3 gap-3">
              {thumbnails.map((thumbnail, index) => (
                <div
                  key={index}
                  className={cn(
                    'relative cursor-pointer rounded-lg overflow-hidden border-2 transition-colors',
                    selectedThumbnail === index 
                      ? 'border-blue-500 ring-2 ring-blue-200' 
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                  onClick={() => handleThumbnailSelect(index)}
                >
                  <img
                    src={thumbnail.url}
                    alt={`Thumbnail at ${formatTime(thumbnail.timestamp)}`}
                    className="w-full h-20 object-cover"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs px-2 py-1">
                    {formatTime(thumbnail.timestamp)}
                  </div>
                  {selectedThumbnail === index && (
                    <div className="absolute top-1 right-1">
                      <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Custom thumbnail generation */}
        <div className="space-y-3 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600">Or generate a custom thumbnail:</p>
          
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <input
                type="range"
                min={0}
                max={duration}
                step={0.1}
                value={currentTime}
                onChange={(e) => seekTo(parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0:00</span>
                <span className="font-medium">{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
            
            <Button
              onClick={generateCurrentThumbnail}
              disabled={isGenerating}
              size="sm"
            >
              {isGenerating ? 'Generating...' : 'Generate'}
            </Button>
          </div>
        </div>

        {isGenerating && (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-sm text-gray-600">Generating thumbnail...</span>
          </div>
        )}
      </div>
    </div>
  );
}
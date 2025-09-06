import React, { useState, useRef, useCallback } from 'react';
import { useVideoUpload } from '@/hooks/useVideoUpload';
import { VideoMetadata, VideoUploadResult } from '@/types/video.types';
import { Button } from '@/components/ui/Button';
import { Progress } from '@/components/ui/Progress';
import { Alert } from '@/components/ui/Alert';
import { VideoPreview } from './VideoPreview';

interface VideoUploadProps {
  onUploadSuccess?: (result: VideoUploadResult) => void;
  onUploadError?: (error: Error) => void;
  className?: string;
}

export function VideoUpload({ 
  onUploadSuccess, 
  onUploadError, 
  className = '' 
}: VideoUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoMetadata, setVideoMetadata] = useState<VideoMetadata | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    uploadVideo,
    isUploading,
    uploadProgress,
    validationErrors,
    error,
    result,
    reset
  } = useVideoUpload({
    onSuccess: onUploadSuccess,
    onError: onUploadError
  });

  // Extract video metadata from file
  const extractVideoMetadata = useCallback((file: File): Promise<VideoMetadata> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      video.onloadedmetadata = () => {
        resolve({
          duration: video.duration,
          size: file.size,
          originalFilename: file.name
        });
        URL.revokeObjectURL(video.src);
      };
      
      video.onerror = () => {
        reject(new Error('Failed to load video metadata'));
        URL.revokeObjectURL(video.src);
      };
      
      video.src = URL.createObjectURL(file);
    });
  }, []);

  // Handle file selection
  const handleFileSelect = useCallback(async (file: File) => {
    try {
      const metadata = await extractVideoMetadata(file);
      setSelectedFile(file);
      setVideoMetadata(metadata);
      reset(); // Clear any previous errors
    } catch (error) {
      console.error('Failed to extract video metadata:', error);
      setSelectedFile(null);
      setVideoMetadata(null);
    }
  }, [extractVideoMetadata, reset]);

  // Handle file input change
  const handleFileInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  // Handle drag and drop
  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    
    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith('video/')) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  // Handle upload
  const handleUpload = useCallback(() => {
    if (selectedFile && videoMetadata) {
      uploadVideo(selectedFile, videoMetadata);
    }
  }, [selectedFile, videoMetadata, uploadVideo]);

  // Handle clear selection
  const handleClear = useCallback(() => {
    setSelectedFile(null);
    setVideoMetadata(null);
    reset();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [reset]);

  // Render upload area
  const renderUploadArea = () => (
    <div
      className={`
        border-2 border-dashed rounded-lg p-8 text-center transition-colors
        ${isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
        ${selectedFile ? 'border-green-500 bg-green-50' : ''}
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        onChange={handleFileInputChange}
        className="hidden"
      />
      
      {!selectedFile ? (
        <div className="space-y-4">
          <div className="text-gray-500">
            <svg className="mx-auto h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-lg font-medium">Drop your video here</p>
            <p className="text-sm">or click to browse</p>
          </div>
          
          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            className="mx-auto"
          >
            Choose Video File
          </Button>
          
          <div className="text-xs text-gray-400 space-y-1">
            <p>Supported formats: MP4, MOV, AVI, WebM</p>
            <p>Duration: 15-30 seconds • Max size: 100MB</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-green-600">
            <svg className="mx-auto h-8 w-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p className="font-medium">Video selected</p>
          </div>
          
          <div className="text-sm text-gray-600 space-y-1">
            <p><strong>File:</strong> {selectedFile.name}</p>
            <p><strong>Duration:</strong> {videoMetadata?.duration?.toFixed(1)}s</p>
            <p><strong>Size:</strong> {(selectedFile.size / (1024 * 1024)).toFixed(1)}MB</p>
          </div>
          
          <div className="flex gap-2 justify-center">
            <Button onClick={handleClear} variant="outline" size="sm">
              Choose Different File
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Upload Area */}
      {renderUploadArea()}

      {/* Video Preview */}
      {selectedFile && (
        <VideoPreview 
          file={selectedFile} 
          metadata={videoMetadata}
          onMetadataUpdate={setVideoMetadata}
        />
      )}

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Alert variant="error">
          <div className="space-y-1">
            <p className="font-medium">Please fix the following issues:</p>
            <ul className="list-disc list-inside text-sm space-y-1">
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        </Alert>
      )}

      {/* Upload Error */}
      {error && (
        <Alert variant="error">
          <p className="font-medium">Upload failed</p>
          <p className="text-sm">{error.message}</p>
        </Alert>
      )}

      {/* Upload Progress */}
      {isUploading && uploadProgress && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Uploading video...</span>
            <span>{uploadProgress.percentage}%</span>
          </div>
          <Progress value={uploadProgress.percentage} className="w-full" />
          <p className="text-xs text-gray-500">
            {(uploadProgress.loaded / (1024 * 1024)).toFixed(1)}MB of {(uploadProgress.total / (1024 * 1024)).toFixed(1)}MB
          </p>
        </div>
      )}

      {/* Upload Success */}
      {result && (
        <Alert variant="success">
          <p className="font-medium">Video uploaded successfully!</p>
          <p className="text-sm">Your video is being processed and will be available shortly.</p>
        </Alert>
      )}

      {/* Upload Button */}
      {selectedFile && videoMetadata && !isUploading && !result && validationErrors.length === 0 && (
        <div className="flex justify-center">
          <Button 
            onClick={handleUpload}
            size="lg"
            className="px-8"
          >
            Upload Video
          </Button>
        </div>
      )}
    </div>
  );
}
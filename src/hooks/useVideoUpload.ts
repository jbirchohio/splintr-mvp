import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { VideoMetadata, VideoUploadResult } from '@/types/video.types';
import { validateVideoComplete } from '@/utils/video-validation';

interface UseVideoUploadOptions {
  onSuccess?: (result: VideoUploadResult) => void;
  onError?: (error: Error) => void;
}

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export function useVideoUpload(options: UseVideoUploadOptions = {}) {
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Get upload signature from API
  const getUploadSignature = async (metadata: VideoMetadata) => {
    const response = await fetch('/api/videos/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ metadata }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to get upload signature');
    }

    return response.json();
  };

  // Upload file directly to Cloudinary
  const uploadToCloudinary = async (
    file: File,
    signature: any
  ): Promise<VideoUploadResult> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('signature', signature.signature);
    formData.append('timestamp', signature.timestamp.toString());
    formData.append('api_key', signature.apiKey);
    formData.append('folder', signature.folder);
    formData.append('resource_type', 'video');

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = {
            loaded: event.loaded,
            total: event.total,
            percentage: Math.round((event.loaded / event.total) * 100)
          };
          setUploadProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          try {
            const result = JSON.parse(xhr.responseText);
            resolve({
              videoId: result.public_id,
              publicId: result.public_id,
              uploadUrl: result.secure_url,
              streamingUrl: result.playback_url,
              thumbnailUrl: result.eager?.[1]?.secure_url || result.secure_url,
              processingStatus: 'completed',
              duration: result.duration,
              format: result.format,
              bytes: result.bytes
            });
          } catch (error) {
            reject(new Error('Failed to parse upload response'));
          }
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });

      xhr.open('POST', `https://api.cloudinary.com/v1_1/${signature.cloudName}/video/upload`);
      xhr.send(formData);
    });
  };

  // Main upload mutation
  const uploadMutation = useMutation({
    mutationFn: async ({ file, metadata }: { file: File; metadata: VideoMetadata }) => {
      // Reset previous errors
      setValidationErrors([]);
      setUploadProgress(null);

      // Validate video file
      const validation = await validateVideoComplete(file);
      if (!validation.isValid) {
        const errorMessages = validation.errors.map(error => error.message);
        setValidationErrors(errorMessages);
        throw new Error(`Validation failed: ${errorMessages.join(', ')}`);
      }

      // Get upload signature
      const signatureResponse = await getUploadSignature(metadata);
      const signature = signatureResponse.data;

      // Upload to Cloudinary
      const result = await uploadToCloudinary(file, signature);
      
      return result;
    },
    onSuccess: (result) => {
      setUploadProgress(null);
      options.onSuccess?.(result);
    },
    onError: (error) => {
      setUploadProgress(null);
      options.onError?.(error as Error);
    }
  });

  // Upload function
  const uploadVideo = useCallback(
    (file: File, metadata: VideoMetadata) => {
      return uploadMutation.mutate({ file, metadata });
    },
    [uploadMutation]
  );

  // Reset function
  const reset = useCallback(() => {
    setUploadProgress(null);
    setValidationErrors([]);
    uploadMutation.reset();
  }, [uploadMutation]);

  return {
    uploadVideo,
    isUploading: uploadMutation.isPending,
    uploadProgress,
    validationErrors,
    error: uploadMutation.error,
    result: uploadMutation.data,
    reset
  };
}
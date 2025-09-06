import { VIDEO_CONSTRAINTS, VideoValidationError, VideoValidationResult } from '@/types/video.types';

/**
 * Client-side video file validation
 */
export function validateVideoFile(file: File): VideoValidationResult {
  const errors: VideoValidationError[] = [];

  // Check file size
  if (file.size > VIDEO_CONSTRAINTS.MAX_FILE_SIZE) {
    errors.push({
      field: 'size',
      message: `File size must be less than ${VIDEO_CONSTRAINTS.MAX_FILE_SIZE / (1024 * 1024)}MB`,
      code: 'FILE_TOO_LARGE'
    });
  }

  // Check file type
  if (!VIDEO_CONSTRAINTS.ALLOWED_MIME_TYPES.includes(file.type as any)) {
    errors.push({
      field: 'type',
      message: `File type ${file.type} is not supported. Allowed types: ${VIDEO_CONSTRAINTS.ALLOWED_FORMATS.join(', ')}`,
      code: 'INVALID_FILE_TYPE'
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Get video duration from file (client-side)
 */
export function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      resolve(video.duration);
    };
    
    video.onerror = () => {
      window.URL.revokeObjectURL(video.src);
      reject(new Error('Failed to load video metadata'));
    };
    
    video.src = URL.createObjectURL(file);
  });
}

/**
 * Validate video duration
 */
export function validateVideoDuration(duration: number): VideoValidationResult {
  const errors: VideoValidationError[] = [];

  if (duration < VIDEO_CONSTRAINTS.MIN_DURATION) {
    errors.push({
      field: 'duration',
      message: `Video must be at least ${VIDEO_CONSTRAINTS.MIN_DURATION} seconds long`,
      code: 'DURATION_TOO_SHORT'
    });
  }

  if (duration > VIDEO_CONSTRAINTS.MAX_DURATION) {
    errors.push({
      field: 'duration',
      message: `Video must be no longer than ${VIDEO_CONSTRAINTS.MAX_DURATION} seconds`,
      code: 'DURATION_TOO_LONG'
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Complete client-side video validation including duration
 */
export async function validateVideoComplete(file: File): Promise<VideoValidationResult> {
  // First validate file properties
  const fileValidation = validateVideoFile(file);
  if (!fileValidation.isValid) {
    return fileValidation;
  }

  try {
    // Then validate duration
    const duration = await getVideoDuration(file);
    const durationValidation = validateVideoDuration(duration);
    
    return durationValidation;
  } catch (error) {
    return {
      isValid: false,
      errors: [{
        field: 'duration',
        message: 'Could not determine video duration',
        code: 'DURATION_CHECK_FAILED'
      }]
    };
  }
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format duration for display
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  
  if (mins > 0) {
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  
  return `${secs}s`;
}
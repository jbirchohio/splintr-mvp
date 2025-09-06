// Video upload and processing types
export interface VideoMetadata {
  title?: string;
  description?: string;
  duration: number; // in seconds
  size: number; // in bytes
  originalFilename?: string;
}

export interface VideoUploadResult {
  videoId: string;
  publicId: string;
  uploadUrl: string;
  streamingUrl?: string;
  thumbnailUrl?: string;
  processingStatus: VideoProcessingStatus;
  duration?: number;
  format?: string;
  bytes?: number;
}

export interface VideoProcessingResult {
  videoId: string;
  publicId: string;
  streamingUrl: string;
  thumbnailUrl: string;
  processingStatus: VideoProcessingStatus;
  duration: number;
  format: string;
  bytes: number;
  width?: number;
  height?: number;
}

export type VideoProcessingStatus = 
  | 'pending' 
  | 'processing' 
  | 'completed' 
  | 'failed';

export interface CloudinaryUploadResponse {
  public_id: string;
  version: number;
  signature: string;
  width: number;
  height: number;
  format: string;
  resource_type: string;
  created_at: string;
  tags: string[];
  bytes: number;
  type: string;
  etag: string;
  placeholder: boolean;
  url: string;
  secure_url: string;
  folder?: string;
  original_filename?: string;
  duration?: number;
  bit_rate?: number;
  frame_rate?: number;
  playback_url?: string;
}

export interface CloudinaryVideoTransformation {
  streaming_profile?: string;
  format?: string;
  quality?: string;
  width?: number;
  height?: number;
  crop?: string;
  gravity?: string;
  start_offset?: string;
}

export interface VideoValidationError {
  field: string;
  message: string;
  code: string;
}

export interface VideoValidationResult {
  isValid: boolean;
  errors: VideoValidationError[];
}

// Video constraints based on requirements
export const VIDEO_CONSTRAINTS = {
  MIN_DURATION: 15, // seconds
  MAX_DURATION: 30, // seconds
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB in bytes
  ALLOWED_FORMATS: ['mp4', 'mov', 'avi', 'webm'],
  ALLOWED_MIME_TYPES: [
    'video/mp4',
    'video/quicktime',
    'video/x-msvideo',
    'video/webm'
  ] as const
} as const;

export type AllowedMimeType = typeof VIDEO_CONSTRAINTS.ALLOWED_MIME_TYPES[number];

// Video record from database
export interface VideoRecord {
  id: string;
  creatorId: string;
  originalFilename: string;
  duration: number;
  fileSize: number;
  cloudinaryPublicId?: string;
  streamingUrl: string;
  thumbnailUrl: string;
  processingStatus: VideoProcessingStatus;
  moderationStatus: 'pending' | 'approved' | 'flagged' | 'rejected';
  moderationResult?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}
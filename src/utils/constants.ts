// Video constraints
export const VIDEO_CONSTRAINTS = {
  MIN_DURATION: 15, // seconds
  MAX_DURATION: 30, // seconds
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB in bytes
  SUPPORTED_FORMATS: ['video/mp4', 'video/webm', 'video/quicktime'],
} as const

// Story constraints
export const STORY_CONSTRAINTS = {
  MAX_TITLE_LENGTH: 200,
  MAX_DESCRIPTION_LENGTH: 1000,
  MAX_CHOICE_TEXT_LENGTH: 100,
  CHOICES_PER_NODE: 2,
} as const

// API endpoints
export const API_ENDPOINTS = {
  AUTH: {
    SIGN_IN: '/api/auth/signin',
    SIGN_OUT: '/api/auth/signout',
    ME: '/api/auth/me',
  },
  VIDEOS: {
    UPLOAD: '/api/videos/upload',
    PROCESS: '/api/videos/process',
    GET: '/api/videos',
  },
  STORIES: {
    CREATE: '/api/stories',
    UPDATE: '/api/stories',
    PUBLISH: '/api/stories/publish',
    GET: '/api/stories',
  },
  FEED: {
    PUBLIC: '/api/feed',
    CREATOR: '/api/feed/creator',
  },
  MODERATION: {
    SCAN: '/api/moderation/scan',
    FLAG: '/api/moderation/flag',
    REVIEW: '/api/moderation/review',
  },
} as const

// Error codes
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  PROCESSING_FAILED: 'PROCESSING_FAILED',
  MODERATION_REJECTED: 'MODERATION_REJECTED',
} as const
// Video processing configuration
export const videoConfig = {
  // Upload constraints
  constraints: {
    minDuration: 15, // seconds
    maxDuration: 30, // seconds
    maxFileSize: 100 * 1024 * 1024, // 100MB
    allowedFormats: ['mp4', 'mov', 'avi', 'webm'],
    allowedMimeTypes: [
      'video/mp4',
      'video/quicktime',
      'video/x-msvideo',
      'video/webm'
    ]
  },

  // Cloudinary transformations
  transformations: {
    // Streaming profiles for different qualities
    streaming: {
      hd: {
        streaming_profile: 'hd',
        format: 'auto',
        quality: 'auto:good'
      },
      sd: {
        streaming_profile: 'sd', 
        format: 'auto',
        quality: 'auto:eco'
      },
      mobile: {
        width: 640,
        height: 360,
        crop: 'limit',
        quality: 'auto:low',
        format: 'auto'
      }
    },

    // Thumbnail generation
    thumbnail: {
      format: 'jpg',
      quality: 'auto:good',
      width: 320,
      height: 180,
      crop: 'fill',
      gravity: 'center',
      start_offset: '50%' // Take from middle of video
    },

    // Preview thumbnails (multiple frames)
    previewThumbnails: {
      format: 'jpg',
      quality: 'auto:good', 
      width: 160,
      height: 90,
      crop: 'fill',
      gravity: 'center'
    }
  },

  // Processing options
  processing: {
    // Eager transformations to generate immediately
    eagerTransformations: [
      'c_limit,w_640,h_360,q_auto:good,f_auto',
      'c_fill,w_320,h_180,g_center,so_50p,f_jpg,q_auto:good'
    ],
    
    // Background processing for additional formats
    backgroundTransformations: [
      'sp_hd,f_auto',
      'sp_sd,f_auto'
    ],

    // Webhook notifications
    notificationUrl: process.env.CLOUDINARY_WEBHOOK_URL,
    
    // Auto-tagging for organization
    autoTagging: true,
    
    // Content analysis
    contentAnalysis: {
      google_video_tagging: true,
      aws_rek_face: false, // Disable face detection for privacy
      aws_rek_moderation: true
    }
  },

  // Storage organization
  storage: {
    folderStructure: 'splintr/videos/{userId}',
    useUniqueFilenames: true,
    preserveOriginalFilename: false,
    
    // Backup and archival
    backup: {
      enabled: process.env.NODE_ENV === 'production',
      archiveAfterDays: 365
    }
  },

  // CDN and delivery
  delivery: {
    // Force HTTPS
    secure: true,
    
    // CDN settings
    cdn: {
      subdomain: true,
      secure_cdn_subdomain: true
    },
    
    // Adaptive streaming
    adaptiveStreaming: {
      enabled: true,
      profiles: ['hd', 'sd']
    }
  }
} as const;

// Environment-specific overrides
export const getVideoConfig = () => {
  const config = { ...videoConfig };
  
  // Development overrides
  if (process.env.NODE_ENV === 'development') {
    (config.processing.contentAnalysis as any).aws_rek_moderation = false;
    (config.storage.backup as any).enabled = false;
  }
  
  // Test environment overrides
  if (process.env.NODE_ENV === 'test') {
    (config.constraints as any).maxFileSize = 10 * 1024 * 1024; // 10MB for tests
    (config.processing as any).eagerTransformations = []; // Skip transformations in tests
    (config.processing.contentAnalysis as any).google_video_tagging = false;
  }
  
  return config;
};
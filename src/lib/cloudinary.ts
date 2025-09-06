import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true, // Force HTTPS URLs
});

// Validate configuration
export const validateCloudinaryConfig = (): boolean => {
  const requiredEnvVars = [
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET'
  ];

  const missingVars = requiredEnvVars.filter(
    varName => !process.env[varName]
  );

  if (missingVars.length > 0) {
    console.error('Missing Cloudinary environment variables:', missingVars);
    return false;
  }

  return true;
};

// Video upload configuration
export const videoUploadConfig = {
  resource_type: 'video' as const,
  folder: 'splintr/videos',
  use_filename: false,
  unique_filename: true,
  overwrite: false,
  // Video processing options
  eager: [
    // HD streaming version
    {
      streaming_profile: 'hd',
      format: 'auto',
      quality: 'auto:good'
    },
    // SD streaming version for mobile
    {
      width: 640,
      height: 360,
      crop: 'limit',
      quality: 'auto:good',
      format: 'auto',
      streaming_profile: 'sd'
    },
    // Thumbnail generation
    {
      width: 320,
      height: 180,
      crop: 'fill',
      gravity: 'center',
      format: 'jpg',
      quality: 'auto:good',
      start_offset: '50%'
    }
  ],
  // Generate thumbnails and process asynchronously
  eager_async: true,
  notification_url: process.env.CLOUDINARY_WEBHOOK_URL || `${process.env.NEXT_PUBLIC_APP_URL}/api/videos/webhook`,
  // Video-specific settings
  video_codec: 'auto',
  audio_codec: 'auto',
  // Quality and optimization
  quality: 'auto:good',
  fetch_format: 'auto',
};

// Thumbnail generation configuration
export const thumbnailConfig = {
  resource_type: 'video' as const,
  format: 'jpg',
  quality: 'auto:good',
  width: 320,
  height: 180,
  crop: 'fill',
  gravity: 'center',
  start_offset: '50%', // Take thumbnail from middle of video
};

export default cloudinary;
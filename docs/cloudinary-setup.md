# Cloudinary Video Processing Setup

This document describes the Cloudinary configuration for Splintr's video processing capabilities.

## Overview

Splintr uses Cloudinary for video upload, processing, and streaming. The integration provides:

- Video upload with automatic processing
- Adaptive streaming for different qualities (HD, SD, Mobile)
- Automatic thumbnail generation
- Content delivery via CDN
- Webhook notifications for processing status

## Configuration

### Environment Variables

Add the following to your `.env.local` file:

```bash
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
CLOUDINARY_WEBHOOK_URL=http://localhost:3000/api/videos/webhook
```

### Getting Cloudinary Credentials

1. Sign up for a [Cloudinary account](https://cloudinary.com/)
2. Go to your Dashboard
3. Copy the Cloud Name, API Key, and API Secret
4. For production, set up a webhook URL pointing to your deployed API

## Video Constraints

Based on the requirements, videos must meet these criteria:

- **Duration**: 15-30 seconds
- **File Size**: Maximum 100MB
- **Formats**: MP4, MOV, AVI, WebM
- **Processing**: Automatic thumbnail generation and streaming optimization

## API Endpoints

### Upload Signature
```
POST /api/videos/upload
```
Returns upload signature for client-side uploads to Cloudinary.

### Video Status
```
GET /api/videos/[videoId]/status
```
Returns processing status and video details.

### Webhook
```
POST /api/videos/webhook
```
Receives notifications from Cloudinary about processing completion.

## Usage Examples

### Client-Side Upload

```typescript
import { useVideoUpload } from '@/hooks/useVideoUpload';

function VideoUploadComponent() {
  const { uploadVideo, isUploading, uploadProgress, error } = useVideoUpload({
    onSuccess: (result) => {
      console.log('Upload completed:', result);
    },
    onError: (error) => {
      console.error('Upload failed:', error);
    }
  });

  const handleFileSelect = async (file: File) => {
    const metadata = {
      title: 'My Video',
      duration: 25, // seconds
      size: file.size
    };

    uploadVideo(file, metadata);
  };

  return (
    <div>
      {isUploading && (
        <div>
          Uploading: {uploadProgress?.percentage || 0}%
        </div>
      )}
      {error && <div>Error: {error.message}</div>}
    </div>
  );
}
```

### Server-Side Processing

```typescript
import { videoService } from '@/services/video.service';

// Get video details
const videoDetails = await videoService.getVideoDetails('video-public-id');

// Generate thumbnail URL
const thumbnailUrl = videoService.generateThumbnailUrl('video-public-id');

// Generate streaming URL
const streamingUrl = videoService.generateStreamingUrl('video-public-id', 'hd');
```

## Transformations

### Automatic Transformations

Videos are automatically processed with these transformations:

1. **HD Streaming**: High-quality adaptive streaming
2. **SD Streaming**: Standard quality for slower connections
3. **Mobile Optimized**: 640x360 resolution for mobile devices
4. **Thumbnails**: 320x180 JPEG thumbnails from video middle frame

### Custom Transformations

Additional transformations can be configured in `src/config/video.config.ts`:

```typescript
// Example: Add watermark
const watermarkTransformation = {
  overlay: 'splintr-watermark',
  gravity: 'south_east',
  x: 10,
  y: 10,
  opacity: 70
};
```

## Webhook Processing

Cloudinary sends webhooks for these events:

- **upload**: Video upload completed
- **eager**: Transformations completed
- **delete**: Video deleted

The webhook handler updates the database with processing status and URLs.

## Security

- All uploads use signed URLs for security
- Webhook signatures are verified to prevent tampering
- HTTPS is enforced for all video URLs
- User-specific folder structure prevents unauthorized access

## Monitoring

### Processing Status

Videos go through these states:
1. `pending` - Upload initiated
2. `processing` - Cloudinary processing transformations
3. `completed` - Ready for streaming
4. `failed` - Processing error occurred

### Error Handling

Common errors and solutions:

- **Invalid file type**: Check `ALLOWED_MIME_TYPES` in video types
- **File too large**: Ensure file is under 100MB limit
- **Duration invalid**: Video must be 15-30 seconds
- **Upload timeout**: Check network connection and file size

## Testing

Run video service tests:

```bash
npm test tests/unit/video.service.test.ts
```

The tests verify:
- File validation logic
- Upload signature generation
- URL generation for thumbnails and streaming
- Error handling for invalid inputs

## Production Considerations

1. **CDN**: Cloudinary provides global CDN for fast video delivery
2. **Bandwidth**: Monitor usage and optimize transformations
3. **Storage**: Set up archival policies for old videos
4. **Backup**: Consider backup strategies for critical content
5. **Monitoring**: Set up alerts for processing failures

## Troubleshooting

### Common Issues

1. **Environment variables not set**: Verify all Cloudinary credentials are configured
2. **Webhook not receiving**: Check webhook URL is publicly accessible
3. **Upload failures**: Verify file meets size and format requirements
4. **Processing stuck**: Check Cloudinary dashboard for processing errors

### Debug Mode

Enable debug logging by setting:

```bash
CLOUDINARY_DEBUG=true
```

This will log detailed information about uploads and transformations.
# Video Upload and Processing System

This document describes the video upload and processing infrastructure implemented for Splintr.

## Overview

The video upload system handles:
- Video file validation (duration, size, format)
- Upload to Cloudinary for storage and processing
- Background job processing for video operations
- Content moderation integration
- Webhook handling for processing notifications

## Architecture

```
Client Upload → API Validation → Cloudinary → Background Jobs → Database Updates
                     ↓                ↓              ↓
                File Validation   Webhook      Processing/Moderation
```

## API Endpoints

### POST /api/videos/upload
Handles video file uploads with validation.

**Request:**
- Supports both direct file upload and signature generation for client-side uploads
- Requires video metadata (duration, size, title, description)
- Validates file constraints (15-30s duration, 100MB max size)

**Response:**
```json
{
  "success": true,
  "data": {
    "videoId": "video-id",
    "uploadUrl": "https://cloudinary-url",
    "processingJobId": "job-id",
    "moderationJobId": "job-id"
  }
}
```

### POST /api/videos/validate
Pre-upload validation for video files.

**Request:**
```json
{
  "filename": "video.mp4",
  "size": 50000000,
  "type": "video/mp4",
  "duration": 20
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "isValid": true,
    "errors": [],
    "constraints": { ... },
    "recommendations": ["Your video meets all requirements!"]
  }
}
```

### GET /api/videos/jobs/[jobId]
Check the status of background processing jobs.

**Query Parameters:**
- `type`: "processing" or "moderation"

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "job-id",
    "state": "completed",
    "progress": 100,
    "createdAt": 1234567890,
    "finishedAt": 1234567890
  }
}
```

### GET /api/videos/queue-stats
Get queue statistics (admin only).

**Response:**
```json
{
  "success": true,
  "data": {
    "processing": {
      "waiting": 0,
      "active": 1,
      "completed": 10,
      "failed": 0
    },
    "moderation": {
      "waiting": 0,
      "active": 0,
      "completed": 8,
      "failed": 0
    }
  }
}
```

### POST /api/videos/webhook
Cloudinary webhook endpoint for processing notifications.

## Video Constraints

Based on requirements 2.1, 2.4, and 2.5:

- **Duration**: 15-30 seconds
- **File Size**: Maximum 100MB
- **Formats**: MP4, MOV, AVI, WebM
- **MIME Types**: video/mp4, video/quicktime, video/x-msvideo, video/webm

## Background Job Processing

The system uses Bull Queue with Redis for background job processing:

### Video Processing Jobs
- Retrieve video details from Cloudinary
- Generate thumbnails
- Update database with processing results
- Handle processing failures with retry logic

### Video Moderation Jobs
- Scan video content for inappropriate material
- Integration with AI moderation services (AWS Rekognition, Hive AI)
- Update database with moderation results
- Flag content for manual review when needed

## Configuration

### Environment Variables

```bash
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
CLOUDINARY_WEBHOOK_URL=https://your-domain.com/api/videos/webhook

# Redis Configuration (for background jobs)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# Application URL
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### Cloudinary Settings

The system is configured with:
- Automatic video optimization
- Multiple quality streaming profiles (HD, SD)
- Thumbnail generation at 50% video position
- Eager transformations for faster delivery
- Webhook notifications for processing completion

## Error Handling

The system provides comprehensive error handling:

- **Validation Errors (400)**: Invalid duration, file size, or format
- **Authentication Errors (401/403)**: Missing or invalid authentication
- **Content Errors (422)**: Processing failures, moderation rejection
- **System Errors (500)**: Service unavailability, processing failures

## Testing

Comprehensive test suite covers:
- Video validation logic
- Upload functionality
- Background job processing
- API endpoint behavior
- Error scenarios

Run tests with:
```bash
npm test -- --testPathPattern="video"
```

## Usage Examples

### Client-Side Upload with Validation

```javascript
// 1. Validate video before upload
const validation = await fetch('/api/videos/validate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    filename: file.name,
    size: file.size,
    type: file.type,
    duration: videoDuration
  })
});

// 2. Upload if valid
if (validation.data.isValid) {
  const formData = new FormData();
  formData.append('video', file);
  formData.append('metadata', JSON.stringify({
    duration: videoDuration,
    size: file.size,
    title: 'My Video',
    description: 'Video description'
  }));

  const upload = await fetch('/api/videos/upload', {
    method: 'POST',
    body: formData
  });
}
```

### Monitoring Job Progress

```javascript
// Check job status
const checkJobStatus = async (jobId, type) => {
  const response = await fetch(`/api/videos/jobs/${jobId}?type=${type}`);
  const { data } = await response.json();
  
  console.log(`Job ${jobId} is ${data.state} (${data.progress}%)`);
  
  if (data.state === 'completed') {
    console.log('Video processing completed!');
  } else if (data.state === 'failed') {
    console.log('Video processing failed:', data.failedReason);
  }
};
```

## Security Considerations

- All uploads are validated for file type, size, and duration
- Webhook signatures are verified to prevent unauthorized requests
- Background jobs include retry logic with exponential backoff
- File uploads are processed in isolated environments
- Content moderation scans all uploaded videos

## Performance Optimizations

- Asynchronous processing prevents blocking uploads
- Redis caching for job queue management
- Cloudinary CDN for global video delivery
- Eager transformations for multiple quality levels
- Automatic cleanup of old job records
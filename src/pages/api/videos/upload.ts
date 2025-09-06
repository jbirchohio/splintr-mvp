import { NextApiRequest, NextApiResponse } from 'next';
import { videoService } from '@/services/video.service';
import { JobService } from '@/services/job.service';
import { VideoMetadata, VIDEO_CONSTRAINTS } from '@/types/video.types';
import formidable from 'formidable';
import fs from 'fs';

// Disable default body parser to handle file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

interface UploadRequest {
  metadata: VideoMetadata;
  file?: File;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: { 
        code: 'METHOD_NOT_ALLOWED', 
        message: 'Only POST method is allowed' 
      } 
    });
  }

  try {
    // TODO: Add authentication middleware to get userId
    // For now, using a placeholder
    const userId = req.headers['user-id'] as string || 'anonymous';

    // Parse form data including file upload
    const form = formidable({
      maxFileSize: VIDEO_CONSTRAINTS.MAX_FILE_SIZE,
      filter: ({ mimetype }) => {
        return VIDEO_CONSTRAINTS.ALLOWED_MIME_TYPES.includes(mimetype as any);
      },
    });

    const [fields, files] = await form.parse(req);
    
    // Extract metadata from form fields
    const metadataStr = Array.isArray(fields.metadata) ? fields.metadata[0] : fields.metadata;
    if (!metadataStr) {
      return res.status(400).json({
        error: {
          code: 'MISSING_METADATA',
          message: 'Video metadata is required'
        }
      });
    }

    let metadata: VideoMetadata;
    try {
      metadata = JSON.parse(metadataStr);
    } catch (error) {
      return res.status(400).json({
        error: {
          code: 'INVALID_METADATA',
          message: 'Invalid metadata format'
        }
      });
    }

    // Validate metadata
    if (!metadata.duration || !metadata.size) {
      return res.status(400).json({
        error: {
          code: 'INCOMPLETE_METADATA',
          message: 'Duration and size are required in metadata'
        }
      });
    }

    // Validate duration constraints
    if (metadata.duration < VIDEO_CONSTRAINTS.MIN_DURATION || metadata.duration > VIDEO_CONSTRAINTS.MAX_DURATION) {
      return res.status(400).json({
        error: {
          code: 'INVALID_DURATION',
          message: `Video duration must be between ${VIDEO_CONSTRAINTS.MIN_DURATION} and ${VIDEO_CONSTRAINTS.MAX_DURATION} seconds`
        }
      });
    }

    // Validate file size
    if (metadata.size > VIDEO_CONSTRAINTS.MAX_FILE_SIZE) {
      return res.status(400).json({
        error: {
          code: 'FILE_TOO_LARGE',
          message: `File size must be less than ${VIDEO_CONSTRAINTS.MAX_FILE_SIZE / (1024 * 1024)}MB`
        }
      });
    }

    // Handle file upload if present (direct upload)
    const videoFile = Array.isArray(files.video) ? files.video[0] : files.video;
    
    if (videoFile) {
      // Direct file upload
      const fileBuffer = fs.readFileSync(videoFile.filepath);
      const file = new File([fileBuffer], videoFile.originalFilename || 'video', {
        type: videoFile.mimetype || 'video/mp4'
      });

      // Upload video to Cloudinary
      const uploadResult = await videoService.uploadVideo(file, metadata, userId);

      // Add background jobs for processing and moderation
      const [processingJob, moderationJob] = await Promise.all([
        JobService.addVideoProcessingJob({
          videoId: uploadResult.videoId,
          publicId: uploadResult.publicId,
          userId,
          metadata: {
            title: metadata.title,
            description: metadata.description,
            originalFilename: videoFile.originalFilename || 'video'
          }
        }),
        JobService.addVideoModerationJob({
          videoId: uploadResult.videoId,
          publicId: uploadResult.publicId,
          userId
        })
      ]);

      // Clean up temporary file
      fs.unlinkSync(videoFile.filepath);

      res.status(200).json({
        success: true,
        data: {
          ...uploadResult,
          processingJobId: processingJob.id,
          moderationJobId: moderationJob.id
        }
      });

    } else {
      // Generate upload signature for client-side upload
      const uploadSignature = videoService.generateUploadSignature(userId);

      res.status(200).json({
        success: true,
        data: {
          uploadSignature,
          constraints: VIDEO_CONSTRAINTS
        }
      });
    }

  } catch (error) {
    console.error('Video upload API error:', error);
    
    // Handle specific validation errors
    if (error instanceof Error) {
      if (error.message.includes('File size')) {
        return res.status(413).json({
          error: {
            code: 'FILE_TOO_LARGE',
            message: error.message,
            timestamp: new Date().toISOString()
          }
        });
      }
      
      if (error.message.includes('File type')) {
        return res.status(415).json({
          error: {
            code: 'UNSUPPORTED_MEDIA_TYPE',
            message: error.message,
            timestamp: new Date().toISOString()
          }
        });
      }
    }
    
    res.status(500).json({
      error: {
        code: 'UPLOAD_FAILED',
        message: error instanceof Error ? error.message : 'Video upload failed',
        timestamp: new Date().toISOString()
      }
    });
  }
}


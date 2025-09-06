import { NextApiRequest, NextApiResponse } from 'next';
import { videoService } from '@/services/video.service';
import { VideoMetadata, VIDEO_CONSTRAINTS } from '@/types/video.types';

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
    const { filename, size, type, duration, title, description } = req.body;

    if (!filename || !size || !type) {
      return res.status(400).json({
        error: {
          code: 'MISSING_FILE_INFO',
          message: 'Filename, size, and type are required'
        }
      });
    }

    // Create a mock file object for validation
    const mockFile = {
      name: filename,
      size: size,
      type: type
    } as File;

    const metadata: VideoMetadata = {
      duration: duration || 0,
      size: size,
      title,
      description,
      originalFilename: filename
    };

    // Validate the video
    const validation = videoService.validateVideo(mockFile, metadata);

    // Additional constraint checks
    const constraintChecks = {
      durationValid: duration ? 
        duration >= VIDEO_CONSTRAINTS.MIN_DURATION && duration <= VIDEO_CONSTRAINTS.MAX_DURATION : 
        null,
      sizeValid: size <= VIDEO_CONSTRAINTS.MAX_FILE_SIZE,
      typeValid: VIDEO_CONSTRAINTS.ALLOWED_MIME_TYPES.includes(type as any),
      formatValid: VIDEO_CONSTRAINTS.ALLOWED_FORMATS.some(format => 
        filename.toLowerCase().endsWith(`.${format}`)
      )
    };

    res.status(200).json({
      success: true,
      data: {
        isValid: validation.isValid,
        errors: validation.errors,
        constraints: VIDEO_CONSTRAINTS,
        checks: constraintChecks,
        recommendations: generateRecommendations(validation.errors, constraintChecks)
      }
    });

  } catch (error) {
    console.error('Video validation API error:', error);

    res.status(500).json({
      error: {
        code: 'VALIDATION_FAILED',
        message: error instanceof Error ? error.message : 'Video validation failed',
        timestamp: new Date().toISOString()
      }
    });
  }
}

function generateRecommendations(errors: any[], checks: any): string[] {
  const recommendations: string[] = [];

  if (!checks.durationValid && checks.durationValid !== null) {
    recommendations.push(`Trim your video to be between ${VIDEO_CONSTRAINTS.MIN_DURATION}-${VIDEO_CONSTRAINTS.MAX_DURATION} seconds`);
  }

  if (!checks.sizeValid) {
    recommendations.push(`Compress your video to be under ${VIDEO_CONSTRAINTS.MAX_FILE_SIZE / (1024 * 1024)}MB`);
  }

  if (!checks.typeValid) {
    recommendations.push(`Convert your video to one of these formats: ${VIDEO_CONSTRAINTS.ALLOWED_FORMATS.join(', ')}`);
  }

  if (recommendations.length === 0 && errors.length === 0) {
    recommendations.push('Your video meets all requirements and is ready for upload!');
  }

  return recommendations;
}
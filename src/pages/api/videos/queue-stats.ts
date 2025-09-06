import { NextApiRequest, NextApiResponse } from 'next';
import { JobService } from '@/services/job.service';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: 'Only GET method is allowed'
      }
    });
  }

  try {
    // TODO: Add admin authentication check
    // This endpoint should only be accessible to administrators

    const [processingStats, moderationStats] = await Promise.all([
      JobService.getQueueStats('processing'),
      JobService.getQueueStats('moderation')
    ]);

    res.status(200).json({
      success: true,
      data: {
        processing: processingStats,
        moderation: moderationStats,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Queue stats API error:', error);

    res.status(500).json({
      error: {
        code: 'QUEUE_STATS_FAILED',
        message: error instanceof Error ? error.message : 'Failed to get queue statistics',
        timestamp: new Date().toISOString()
      }
    });
  }
}
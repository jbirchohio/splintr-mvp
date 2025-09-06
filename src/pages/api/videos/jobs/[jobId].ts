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
    const { jobId, type } = req.query;

    if (!jobId || typeof jobId !== 'string') {
      return res.status(400).json({
        error: {
          code: 'MISSING_JOB_ID',
          message: 'Job ID is required'
        }
      });
    }

    const queueType = type === 'moderation' ? 'moderation' : 'processing';
    const jobStatus = await JobService.getJobStatus(jobId, queueType);

    if (!jobStatus) {
      return res.status(404).json({
        error: {
          code: 'JOB_NOT_FOUND',
          message: 'Job not found'
        }
      });
    }

    res.status(200).json({
      success: true,
      data: jobStatus
    });

  } catch (error) {
    console.error('Job status API error:', error);

    res.status(500).json({
      error: {
        code: 'JOB_STATUS_FAILED',
        message: error instanceof Error ? error.message : 'Failed to get job status',
        timestamp: new Date().toISOString()
      }
    });
  }
}
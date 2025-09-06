import { NextApiRequest, NextApiResponse } from 'next';
import { FeedService } from '@/services/feed.service';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ success: boolean; message: string } | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // In a production environment, you might want to add authentication
    // and rate limiting for this endpoint
    
    const { force = false } = req.body;

    // Check if refresh is needed (unless forced)
    if (!force) {
      const stats = await FeedService.getFeedStats();
      const lastRefresh = stats.lastRefresh ? new Date(stats.lastRefresh) : null;
      const now = new Date();
      
      // Only refresh if it's been more than 5 minutes since last refresh
      if (lastRefresh && (now.getTime() - lastRefresh.getTime()) < 5 * 60 * 1000) {
        return res.status(200).json({
          success: true,
          message: 'Feed cache is still fresh, skipping refresh'
        });
      }
    }

    await FeedService.refreshFeedCache();

    return res.status(200).json({
      success: true,
      message: 'Feed cache refreshed successfully'
    });
  } catch (error) {
    console.error('Feed refresh API error:', error);
    return res.status(500).json({ error: 'Failed to refresh feed cache' });
  }
}
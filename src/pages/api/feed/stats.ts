import { NextApiRequest, NextApiResponse } from 'next';
import { FeedService } from '@/services/feed.service';
import { FeedStats } from '@/types/feed.types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<FeedStats | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const stats = await FeedService.getFeedStats();

    // Set cache headers for stats (shorter cache time)
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');

    return res.status(200).json(stats);
  } catch (error) {
    console.error('Feed stats API error:', error);
    return res.status(500).json({ error: 'Failed to fetch feed statistics' });
  }
}
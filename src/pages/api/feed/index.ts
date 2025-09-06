import { NextApiRequest, NextApiResponse } from 'next';
import { FeedService } from '@/services/feed.service';
import { GetFeedRequest, FeedResponse, FeedType } from '@/types/feed.types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<FeedResponse | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { type = 'chronological', limit = 20, cursor } = req.query as {
      type?: FeedType;
      limit?: string;
      cursor?: string;
    };

    // Validate parameters
    const parsedLimit = parseInt(limit as string, 10);
    if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 50) {
      return res.status(400).json({ error: 'Invalid limit parameter (1-50)' });
    }

    if (type && !['chronological', 'trending'].includes(type)) {
      return res.status(400).json({ error: 'Invalid feed type' });
    }

    // Validate cursor format if provided
    if (cursor && isNaN(Date.parse(cursor as string))) {
      return res.status(400).json({ error: 'Invalid cursor format' });
    }

    const feedResponse = await FeedService.getFeed(type, {
      limit: parsedLimit,
      cursor: cursor as string
    });

    // Set cache headers
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    res.setHeader('X-Feed-Type', type);
    res.setHeader('X-Items-Count', feedResponse.items.length.toString());

    return res.status(200).json(feedResponse);
  } catch (error) {
    console.error('Feed API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
import { NextApiRequest, NextApiResponse } from 'next';
import { FeedService } from '@/services/feed.service';
import { FeedResponse } from '@/types/feed.types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<FeedResponse | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { creatorId, limit = '20', cursor } = req.query as {
      creatorId: string;
      limit?: string;
      cursor?: string;
    };

    // Validate creatorId
    if (!creatorId || typeof creatorId !== 'string') {
      return res.status(400).json({ error: 'Creator ID is required' });
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(creatorId)) {
      return res.status(400).json({ error: 'Invalid creator ID format' });
    }

    // Validate limit
    const parsedLimit = parseInt(limit, 10);
    if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 50) {
      return res.status(400).json({ error: 'Invalid limit parameter (1-50)' });
    }

    // Validate cursor format if provided
    if (cursor && isNaN(Date.parse(cursor as string))) {
      return res.status(400).json({ error: 'Invalid cursor format' });
    }

    const feedResponse = await FeedService.getCreatorFeed(creatorId, {
      limit: parsedLimit,
      cursor: cursor as string
    });

    // Set cache headers
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    res.setHeader('X-Creator-Id', creatorId);
    res.setHeader('X-Items-Count', feedResponse.items.length.toString());

    return res.status(200).json(feedResponse);
  } catch (error) {
    console.error('Creator feed API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
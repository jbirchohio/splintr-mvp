import { NextApiRequest, NextApiResponse } from 'next'
import { FeedService } from '@/services/feed.service'
import { FeedType } from '@/types/feed.types'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { type = 'chronological', limit, cursor } = req.query

    const feedType = String(type) as FeedType
    if (!['chronological', 'trending'].includes(feedType)) {
      return res.status(400).json({ error: 'Invalid feed type' })
    }

    let pageSize = 20
    if (typeof limit === 'string') {
      const n = parseInt(limit, 10)
      if (!Number.isFinite(n) || n < 1 || n > 50) {
        return res.status(400).json({ error: 'Invalid limit parameter' })
      }
      pageSize = n
    }

    let cursorStr: string | undefined
    if (typeof cursor === 'string') {
      const d = new Date(cursor)
      if (Number.isNaN(d.getTime())) {
        return res.status(400).json({ error: 'Invalid cursor format' })
      }
      cursorStr = cursor
    }

    const data = await FeedService.getFeed(feedType, { limit: pageSize, cursor: cursorStr })
    return res.status(200).json(data)
  } catch (error) {
    // Keep parity with API behavior used in tests
    return res.status(500).json({ error: 'Failed to fetch feed' })
  }
}


import { NextApiRequest, NextApiResponse } from 'next'
import { FeedService } from '@/services/feed.service'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { creatorId, limit, cursor } = req.query

    if (!creatorId || typeof creatorId !== 'string') {
      return res.status(400).json({ error: 'Creator ID is required' })
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(creatorId)) {
      return res.status(400).json({ error: 'Invalid creator ID format' })
    }

    let pageSize: number | undefined
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

    const data = await FeedService.getCreatorFeed(creatorId, { limit: pageSize, cursor: cursorStr })
    return res.status(200).json(data)
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch creator feed' })
  }
}


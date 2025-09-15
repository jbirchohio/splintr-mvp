import { NextApiRequest, NextApiResponse } from 'next'
import { FeedService } from '@/services/feed.service'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ success: boolean } | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { id } = req.query as { id: string }

    // Validate id
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Story ID is required' })
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ error: 'Invalid story ID format' })
    }

    await FeedService.incrementStoryViews(id)

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Story view increment API error:', error)
    return res.status(500).json({ error: 'Failed to increment story views' })
  }
}


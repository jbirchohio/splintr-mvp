import { NextApiRequest, NextApiResponse } from 'next'
import crypto from 'crypto'
import { RecommendationService } from '@/services/recommendation.service'

// Simple FYP placeholder: assigns a variant and returns paged chronological stories.
// GET /api/feed/foryou?page=&limit=&variant=override
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10))
    const limit = Math.max(1, Math.min(50, parseInt((req.query.limit as string) || '20', 10)))
    const from = (page - 1) * limit
    const to = from + limit - 1

    // Assign stable variant based on x-session-id (or random)
    const sessionId = (req.headers['x-session-id'] as string) || crypto.randomUUID()
    const override = (req.query.variant as string) || ''
    const variants = ['A', 'B']
    const assignedVariant = override || variants[Math.abs(hashString(sessionId)) % variants.length]

    const userId = (req.headers['x-user-id'] as string) || null
    const { items: slice, total } = await RecommendationService.getForYou({ userId, sessionId, limit, offset: from, variant: assignedVariant })

    // Log exposures best-effort
    await RecommendationService.logFeedExposures({
      userId: userId || null,
      sessionId,
      variant: assignedVariant,
      storyIds: slice.map((s: any) => s.id),
      startPosition: from,
    })

    // Total estimate
    const totalPages = Math.max(1, Math.ceil(total / limit))

    return res.status(200).json({
      assignedVariant,
      stories: slice,
      pagination: { page, limit, total, totalPages }
    })
  } catch (error) {
    console.error('FYP API error:', error)
    return res.status(500).json({ error: 'Failed to fetch for-you feed' })
  }
}

function hashString(input: string): number {
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i)
    hash |= 0
  }
  return hash
}

import { NextApiRequest, NextApiResponse } from 'next'
import { RecommendationService } from '@/services/recommendation.service'

// GET /api/recs/inspect?userId=&sessionId=&limit=&offset=
// Returns top picks with scores and reasons for debugging
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const userId = (req.query.userId as string) || (req.headers['x-user-id'] as string) || null
    const sessionId = (req.query.sessionId as string) || (req.headers['x-session-id'] as string) || null
    const limit = Math.max(1, Math.min(50, parseInt((req.query.limit as string) || '20', 10)))
    const offset = Math.max(0, parseInt((req.query.offset as string) || '0', 10))

    const { items, total, debug } = await RecommendationService.getForYou({ userId, sessionId, limit, offset, variant: undefined })
    return res.status(200).json({ total, items, debug })
  } catch (error) {
    console.error('Recs inspect error:', error)
    return res.status(500).json({ error: 'Failed to inspect recommendations' })
  }
}


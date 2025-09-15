import type { NextApiRequest, NextApiResponse } from 'next'
import realHandler from '@/pages/api/stories/[id]/view'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Adapt storyId param expected by tests to the handler's `id`
  const q: any = req.query || {}
  if (q.storyId && !q.id) {
    q.id = q.storyId
    // keep storyId as well to avoid mutating unexpected state
    req.query = q
  }
  return (realHandler as any)(req, res)
}


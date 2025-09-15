import { NextApiRequest, NextApiResponse } from 'next'
import { createServerClient } from '@/lib/supabase'

// GET /api/users/[id]/follow -> { following, followerCount }
// POST /api/users/[id]/follow -> toggle, returns { following, followerCount }
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id: creatorId } = req.query as { id: string }
  if (!creatorId) return res.status(400).json({ error: 'Creator ID required' })

  try {
    const supabase = createServerClient()
    const userId = (req.headers['x-user-id'] as string) || ''

    if (req.method === 'GET') {
      const [following, followerCount] = await Promise.all([
        userId ? isFollowing(supabase, userId, creatorId) : Promise.resolve(false),
        getFollowerCount(supabase, creatorId)
      ])
      return res.status(200).json({ following, followerCount })
    }

    if (req.method === 'POST') {
      if (!userId) return res.status(401).json({ error: 'Unauthorized' })
      const following = await isFollowing(supabase, userId, creatorId)
      if (following) {
        await supabase.from('user_follows').delete().eq('follower_id', userId).eq('following_id', creatorId)
      } else {
        await supabase.from('user_follows').insert({ follower_id: userId, following_id: creatorId })
        // Log interaction best-effort
        try { await supabase.from('user_interactions').insert({ user_id: userId, story_id: null, type: 'follow', metadata: { creatorId } as any }) } catch {}
      }
      const followerCount = await getFollowerCount(supabase, creatorId)
      return res.status(200).json({ following: !following, followerCount })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('Follow API error:', error)
    return res.status(500).json({ error: 'Failed to process follow' })
  }
}

async function isFollowing(supabase: ReturnType<typeof createServerClient>, userId: string, creatorId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_follows')
    .select('following_id')
    .eq('follower_id', userId)
    .eq('following_id', creatorId)
    .limit(1)
  return !error && !!(data && data.length > 0)
}

async function getFollowerCount(supabase: ReturnType<typeof createServerClient>, creatorId: string): Promise<number> {
  const { count } = await supabase
    .from('user_follows')
    .select('*', { count: 'exact', head: true })
    .eq('following_id', creatorId)
  return count || 0
}

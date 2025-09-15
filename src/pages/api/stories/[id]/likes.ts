import { NextApiRequest, NextApiResponse } from 'next'
import { createServerClient } from '@/lib/supabase'
import { RedisCache } from '@/lib/redis'

const LIKE_COUNT_KEY = (storyId: string) => `likes:count:${storyId}`
const LIKE_FLAG_KEY = (storyId: string, userId: string) => `likes:flag:${storyId}:${userId}`

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query as { id: string }
  if (!id) return res.status(400).json({ error: 'Story ID is required' })

  try {
    if (req.method === 'GET') {
      const userId = (req.headers['x-user-id'] as string) || ''
      const [count, liked] = await Promise.all([
        getLikeCount(id),
        userId ? getLiked(id, userId) : Promise.resolve(false)
      ])
      return res.status(200).json({ count, liked })
    }

    if (req.method === 'POST') {
      const userId = (req.headers['x-user-id'] as string) || ''
      if (!userId) return res.status(401).json({ error: 'Unauthorized' })

      const liked = await getLiked(id, userId)
      if (liked) {
        await unlikeStory(id, userId)
      } else {
        await likeStory(id, userId)
        // Log interaction best-effort
        try {
          const supabase = createServerClient()
          await supabase.from('user_interactions').insert({ user_id: userId, story_id: id, type: 'like' })
        } catch {}
      }
      const count = await getLikeCount(id)
      return res.status(200).json({ count, liked: !liked })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('Likes API error:', error)
    return res.status(500).json({ error: 'Failed to process like' })
  }
}

async function getLikeCount(storyId: string): Promise<number> {
  try {
    const cached = await RedisCache.get<number>(LIKE_COUNT_KEY(storyId))
    if (typeof cached === 'number') return cached
  } catch {}

  // Fallback to database count if available
  try {
    const supabase = createServerClient()
    const { count } = await supabase
      .from('story_likes')
      .select('*', { count: 'exact', head: true })
      .eq('story_id', storyId)

    const c = count || 0
    await RedisCache.set(LIKE_COUNT_KEY(storyId), c, 300)
    return c
  } catch {
    return 0
  }
}

async function getLiked(storyId: string, userId: string): Promise<boolean> {
  try {
    const flag = await RedisCache.get<string>(LIKE_FLAG_KEY(storyId, userId))
    if (flag === '1') return true
  } catch {}

  try {
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('story_likes')
      .select('story_id')
      .eq('story_id', storyId)
      .eq('user_id', userId)
      .limit(1)
    if (!error && data && data.length > 0) return true
  } catch {}
  return false
}

async function likeStory(storyId: string, userId: string): Promise<void> {
  try {
    await RedisCache.set(LIKE_FLAG_KEY(storyId, userId), '1', 7 * 24 * 3600)
    const newCount = (await RedisCache.incr(LIKE_COUNT_KEY(storyId), 7 * 24 * 3600)) || 1
    // Attempt DB persistence (best-effort)
    try {
      const supabase = createServerClient()
      await supabase.from('story_likes').insert({ story_id: storyId, user_id: userId })
    } catch {}
  } catch {}
}

async function unlikeStory(storyId: string, userId: string): Promise<void> {
  try {
    await RedisCache.del(LIKE_FLAG_KEY(storyId, userId))
    // Decrement counter cautiously
    const current = (await RedisCache.get<number>(LIKE_COUNT_KEY(storyId))) || 0
    const next = Math.max(0, current - 1)
    await RedisCache.set(LIKE_COUNT_KEY(storyId), next, 7 * 24 * 3600)
    // Attempt DB persistence (best-effort)
    try {
      const supabase = createServerClient()
      await supabase.from('story_likes').delete().eq('story_id', storyId).eq('user_id', userId)
    } catch {}
  } catch {}
}

import { createServerClient } from '@/lib/supabase'
import { UserSignals } from './types'

type BuildUserSignalsParams = {
  userId?: string | null
  sessionId?: string | null
}

export class UserFeatureService {
  static async build({ userId = null, sessionId = null }: BuildUserSignalsParams): Promise<UserSignals> {
    const empty: UserSignals = {
      followedCreators: new Set(),
      categoryAffinities: new Map(),
      hasHistory: false,
      engagedStoryIds: new Set(),
      recentActions: [],
    }

    if (!userId && !sessionId) return empty

    const supabase = createServerClient()
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()
    const twoHoursAgo = new Date(Date.now() - 2 * 3600 * 1000).toISOString()

    const followsPromise = userId
      ? supabase
          .from('user_follows')
          .select('following_id')
          .eq('follower_id', userId)
      : Promise.resolve({ data: [], error: null })

    const historyPromise = userId
      ? supabase
          .from('user_interactions')
          .select('story_id, type, value, metadata, created_at')
          .eq('user_id', userId)
          .gte('created_at', thirtyDaysAgo)
          .order('created_at', { ascending: false })
          .limit(2000)
      : Promise.resolve({ data: [], error: null })

    let sessionQuery = supabase
      .from('user_interactions')
      .select('story_id, type, value, metadata, created_at')
      .gte('created_at', twoHoursAgo)
      .order('created_at', { ascending: false })
      .limit(100)

    if (userId) sessionQuery = sessionQuery.eq('user_id', userId)
    if (sessionId) sessionQuery = sessionQuery.contains('metadata', { sessionId })

    const [followsRes, historyRes, sessionRes] = await Promise.all([
      followsPromise,
      historyPromise,
      sessionQuery,
    ])

    const followedCreators = new Set(
      (followsRes.data || []).map((row: any) => row.following_id as string)
    )
    const history = (historyRes.data || []) as any[]
    const session = (sessionRes.data || []) as any[]

    const engagedStoryIds = new Set<string>()
    const weightedStories = new Map<string, number>()
    const actionWeights: Record<string, number> = {
      share: 5,
      complete: 4,
      like: 3,
      time_spent: 2,
      comment: 2,
      view: 0.5,
      skip: -2,
      choice: 3,
      continuation: 4,
      replay: 5,
      path_complete: 5,
      alternate_ending: 5,
      not_interested: -6,
      report: -10,
    }

    for (const event of history) {
      const storyId = event.story_id as string | null
      if (!storyId) continue
      engagedStoryIds.add(storyId)
      const weight = actionWeights[event.type as string] ?? 0.5
      weightedStories.set(storyId, (weightedStories.get(storyId) || 0) + weight)
    }

    // Session behavior deliberately receives stronger weight so the feed can pivot quickly.
    for (const event of session) {
      const storyId = event.story_id as string | null
      if (!storyId) continue
      engagedStoryIds.add(storyId)
      const weight = (actionWeights[event.type as string] ?? 0.5) * 2.5
      weightedStories.set(storyId, (weightedStories.get(storyId) || 0) + weight)
    }

    const categoryAffinities = new Map<string, number>()
    const storyIds = Array.from(weightedStories.keys())
    if (storyIds.length) {
      const { data: stories } = await supabase
        .from('stories')
        .select('id, category')
        .in('id', storyIds.slice(0, 1000))

      for (const story of stories || []) {
        const id = (story as any).id as string
        const category = (story as any).category as string | null
        if (!category) continue
        categoryAffinities.set(
          category,
          (categoryAffinities.get(category) || 0) + (weightedStories.get(id) || 0)
        )
      }
    }

    return {
      followedCreators,
      categoryAffinities,
      hasHistory: history.length > 0 || session.length > 0,
      engagedStoryIds,
      recentActions: session.slice(0, 20).map(event => String(event.type)),
    }
  }
}

export default UserFeatureService

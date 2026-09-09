import { createServerClient } from '@/lib/supabase'
import { RankedCandidate } from './types'

type ExposureState = {
  storyIds: Set<string>
  creatorCounts: Map<string, number>
}

export class ReRankingService {
  static async getExposureState(params: {
    userId?: string | null
    sessionId?: string | null
  }): Promise<ExposureState> {
    const { userId = null, sessionId = null } = params
    const empty: ExposureState = { storyIds: new Set(), creatorCounts: new Map() }
    if (!userId && !sessionId) return empty

    try {
      const supabase = createServerClient()
      const since24h = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
      const since4h = new Date(Date.now() - 4 * 3600 * 1000).toISOString()

      let storyQuery = supabase
        .from('feed_exposures')
        .select('story_id')
        .gte('created_at', since24h)
      if (userId) storyQuery = storyQuery.eq('user_id', userId)
      else if (sessionId) storyQuery = storyQuery.eq('session_id', sessionId)

      let creatorQuery = supabase
        .from('feed_exposures')
        .select('story_id, stories!inner(creator_id)')
        .gte('created_at', since4h)
      if (userId) creatorQuery = creatorQuery.eq('user_id', userId)
      else if (sessionId) creatorQuery = creatorQuery.eq('session_id', sessionId)

      const [storyRes, creatorRes] = await Promise.all([storyQuery, creatorQuery])
      const storyIds = new Set((storyRes.data || []).map((row: any) => row.story_id as string))
      const creatorCounts = new Map<string, number>()

      for (const row of creatorRes.data || []) {
        const creatorId = (row as any).stories?.creator_id as string | undefined
        if (!creatorId) continue
        creatorCounts.set(creatorId, (creatorCounts.get(creatorId) || 0) + 1)
      }

      return { storyIds, creatorCounts }
    } catch (error) {
      console.warn('Failed to load recommendation exposure state', error)
      return empty
    }
  }

  static apply(params: {
    ranked: RankedCandidate[]
    recentExposureState: ExposureState
    diversity: {
      perCreatorMax: number
      perCategoryWindow: number
      perCategoryMaxInWindow: number
    }
  }): RankedCandidate[] {
    const { ranked, recentExposureState, diversity } = params
    const unseen = ranked.filter(item => !recentExposureState.storyIds.has(item.story.id))

    const cooled = unseen
      .map(item => {
        const creatorSeen = recentExposureState.creatorCounts.get(item.story.creator_id) || 0
        if (!creatorSeen) return item
        const penalty = Math.min(0.5, creatorSeen * 0.08)
        return {
          ...item,
          score: item.score - penalty,
          reasons: [...item.reasons, `creator-cooldown-${penalty.toFixed(2)}`],
        }
      })
      .sort((a, b) => b.score - a.score)

    const byCreator = new Map<string, number>()
    const categoryWindow: string[] = []
    const selected: RankedCandidate[] = []
    const deferred: RankedCandidate[] = []

    for (const item of cooled) {
      const creatorId = item.story.creator_id
      const category = item.story.category || ''
      const creatorCount = byCreator.get(creatorId) || 0
      const categoryCount = categoryWindow
        .slice(-diversity.perCategoryWindow)
        .filter(existing => existing === category).length

      const creatorAllowed = creatorCount < diversity.perCreatorMax
      const categoryAllowed =
        !category || categoryCount < diversity.perCategoryMaxInWindow

      if (!creatorAllowed || !categoryAllowed) {
        deferred.push(item)
        continue
      }

      selected.push(item)
      byCreator.set(creatorId, creatorCount + 1)
      if (category) categoryWindow.push(category)
    }

    // Keep enough inventory if the strict diversity pass is too aggressive.
    return [...selected, ...deferred]
  }
}

export default ReRankingService

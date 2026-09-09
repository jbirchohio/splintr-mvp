import { createServerClient } from '@/lib/supabase'
import {
  CandidateSource,
  RecommendationCandidate,
  StoryRow,
  UserSignals,
} from './types'

type GenerateCandidatesParams = {
  userId?: string | null
  signals: UserSignals
  maxCandidates?: number
}

export class CandidateService {
  static async generate({
    userId = null,
    signals,
    maxCandidates = 1200,
  }: GenerateCandidatesParams): Promise<{
    candidates: RecommendationCandidate[]
    sourceCounts: Record<CandidateSource, number>
  }> {
    const supabase = createServerClient()

    const recentPromise = supabase
      .from('stories')
      .select(this.storySelect())
      .eq('is_published', true)
      .order('published_at', { ascending: false })
      .limit(400)

    const trendingPromise = supabase
      .from('stories')
      .select(this.storySelect())
      .eq('is_published', true)
      .order('view_count', { ascending: false })
      .limit(250)

    const explorationPromise = supabase
      .from('stories')
      .select(this.storySelect())
      .eq('is_published', true)
      .order('view_count', { ascending: true, nullsFirst: true })
      .order('published_at', { ascending: false })
      .limit(150)

    const followingPromise = signals.followedCreators.size
      ? supabase
          .from('stories')
          .select(this.storySelect())
          .eq('is_published', true)
          .in('creator_id', Array.from(signals.followedCreators).slice(0, 100))
          .order('published_at', { ascending: false })
          .limit(250)
      : Promise.resolve({ data: [] as StoryRow[], error: null })

    const collaborativeIdsPromise = userId
      ? this.getCollaborativeStoryIds(userId, signals.engagedStoryIds)
      : Promise.resolve([] as string[])

    const [recentRes, trendingRes, explorationRes, followingRes, collaborativeIds] =
      await Promise.all([
        recentPromise,
        trendingPromise,
        explorationPromise,
        followingPromise,
        collaborativeIdsPromise,
      ])

    const firstError =
      recentRes.error || trendingRes.error || explorationRes.error || followingRes.error
    if (firstError) throw firstError

    const collaborative = collaborativeIds.length
      ? await this.fetchStoriesByIds(collaborativeIds.slice(0, 250))
      : []

    const merged = new Map<string, RecommendationCandidate>()
    const sourceCounts: Record<CandidateSource, number> = {
      recent: 0,
      trending: 0,
      following: 0,
      collaborative: 0,
      exploration: 0,
    }

    const add = (stories: StoryRow[] | null, source: CandidateSource) => {
      for (const story of stories || []) {
        sourceCounts[source] += 1
        const existing = merged.get(story.id)
        if (existing) {
          if (!existing.sources.includes(source)) existing.sources.push(source)
          continue
        }
        merged.set(story.id, { story, sources: [source] })
      }
    }

    add((recentRes.data || []) as StoryRow[], 'recent')
    add((trendingRes.data || []) as StoryRow[], 'trending')
    add((followingRes.data || []) as StoryRow[], 'following')
    add(collaborative, 'collaborative')
    add((explorationRes.data || []) as StoryRow[], 'exploration')

    return {
      candidates: Array.from(merged.values()).slice(0, maxCandidates),
      sourceCounts,
    }
  }

  private static storySelect() {
    return 'id, creator_id, title, description, thumbnail_url, view_count, published_at, is_premium, tip_enabled, category'
  }

  private static async fetchStoriesByIds(ids: string[]): Promise<StoryRow[]> {
    if (!ids.length) return []
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('stories')
      .select(this.storySelect())
      .eq('is_published', true)
      .in('id', ids)
    if (error) throw error

    const byId = new Map(((data || []) as StoryRow[]).map(story => [story.id, story]))
    return ids.map(id => byId.get(id)).filter((story): story is StoryRow => Boolean(story))
  }

  private static async getCollaborativeStoryIds(
    userId: string,
    engagedStoryIds: Set<string>
  ): Promise<string[]> {
    if (!engagedStoryIds.size) return []

    const supabase = createServerClient()
    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()
    const seedIds = Array.from(engagedStoryIds).slice(0, 200)

    const { data: overlaps, error: overlapError } = await supabase
      .from('user_interactions')
      .select('user_id, story_id')
      .neq('user_id', userId)
      .in('story_id', seedIds)
      .gte('created_at', since)
      .limit(5000)
    if (overlapError) return []

    const overlapCounts = new Map<string, number>()
    for (const row of overlaps || []) {
      const similarUserId = (row as any).user_id as string | null
      if (!similarUserId) continue
      overlapCounts.set(similarUserId, (overlapCounts.get(similarUserId) || 0) + 1)
    }

    const similarUsers = Array.from(overlapCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 25)
      .map(([id]) => id)
    if (!similarUsers.length) return []

    const { data: interactions, error } = await supabase
      .from('user_interactions')
      .select('story_id, type')
      .in('user_id', similarUsers)
      .gte('created_at', since)
      .limit(10000)
    if (error) return []

    const actionWeight: Record<string, number> = {
      share: 5,
      complete: 4,
      like: 3,
      time_spent: 2,
      view: 1,
      skip: -2,
    }
    const scores = new Map<string, number>()

    for (const row of interactions || []) {
      const storyId = (row as any).story_id as string | null
      if (!storyId || engagedStoryIds.has(storyId)) continue
      const action = (row as any).type as string
      scores.set(storyId, (scores.get(storyId) || 0) + (actionWeight[action] ?? 0.5))
    }

    return Array.from(scores.entries())
      .filter(([, score]) => score > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 250)
      .map(([storyId]) => storyId)
  }
}

export default CandidateService

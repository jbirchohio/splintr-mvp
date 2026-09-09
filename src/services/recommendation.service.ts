import { createServerClient } from '@/lib/supabase'
import { RecsConfigService } from '@/services/recs-config.service'
import { CandidateService } from '@/recommendation/candidate.service'
import { HeuristicRanker } from '@/recommendation/heuristic-ranker'
import { ReRankingService } from '@/recommendation/reranking.service'
import { UserFeatureService } from '@/recommendation/user-feature.service'
import {
  CreatorAuthority,
  HEURISTIC_MODEL_VERSION,
  RecommendationTrace,
  StoryMetrics,
  StoryRow,
} from '@/recommendation/types'

export class RecommendationService {
  static async getForYou(params: {
    userId?: string | null
    sessionId?: string | null
    limit: number
    offset: number
    variant?: string | null
  }): Promise<{
    items: StoryRow[]
    total: number
    traces: Record<string, RecommendationTrace>
    debug?: any
  }> {
    const {
      userId = null,
      sessionId = null,
      limit,
      offset,
      variant = null,
    } = params

    const [signals, weights, exposureState] = await Promise.all([
      UserFeatureService.build({ userId, sessionId }),
      RecsConfigService.getFypWeights(variant),
      ReRankingService.getExposureState({ userId, sessionId }),
    ])

    const { candidates, sourceCounts } = await CandidateService.generate({
      userId,
      signals,
    })

    const storyIds = candidates.map(candidate => candidate.story.id)
    const creatorIds = Array.from(
      new Set(candidates.map(candidate => candidate.story.creator_id))
    )

    const [metricsByStory, authorityByCreator] = await Promise.all([
      this.fetchStoryMetrics(storyIds),
      this.fetchCreatorAuthority(creatorIds),
    ])

    // Phase A keeps the heuristic ranker as a safe fallback behind a stable interface.
    // A learned ranker can replace this call without changing feed API consumers.
    const ranked = HeuristicRanker.rank({
      candidates,
      signals,
      weights,
      metricsByStory,
      authorityByCreator,
    })

    const reranked = ReRankingService.apply({
      ranked,
      recentExposureState: exposureState,
      diversity: weights.diversity,
    })

    const total = reranked.length
    const page = reranked.slice(offset, offset + limit)
    const traces: Record<string, RecommendationTrace> = {}

    for (const item of page) {
      traces[item.story.id] = {
        modelVersion: HEURISTIC_MODEL_VERSION,
        candidateSources: item.sources,
        score: item.score,
      }
    }

    return {
      items: page.map(item => item.story),
      total,
      traces,
      debug: {
        modelVersion: HEURISTIC_MODEL_VERSION,
        candidateCount: candidates.length,
        sourceCounts,
        session: {
          recentActions: signals.recentActions,
          engagedCount: signals.engagedStoryIds.size,
        },
        longTerm: {
          followedCreators: Array.from(signals.followedCreators).slice(0, 10),
          categoryAffinities: Array.from(signals.categoryAffinities.entries()).slice(0, 10),
        },
        topSample: reranked.slice(0, 10).map(item => ({
          id: item.story.id,
          score: item.score,
          sources: item.sources,
          reasons: item.reasons,
        })),
        weights,
      },
    }
  }

  static async logFeedExposures(params: {
    userId?: string | null
    sessionId?: string | null
    variant?: string | null
    storyIds: string[]
    startPosition?: number
    traces?: Record<string, RecommendationTrace>
  }): Promise<void> {
    const {
      userId = null,
      sessionId = null,
      variant = null,
      storyIds,
      startPosition = 0,
      traces = {},
    } = params
    if (!storyIds.length) return

    const supabase = createServerClient()
    const richRows = storyIds.map((storyId, index) => {
      const trace = traces[storyId]
      return {
        user_id: userId,
        session_id: sessionId,
        variant: variant || undefined,
        story_id: storyId,
        position: startPosition + index,
        candidate_source: trace?.candidateSources?.join(',') || null,
        model_version: trace?.modelVersion || HEURISTIC_MODEL_VERSION,
        served_score: trace?.score ?? null,
        metadata: trace
          ? {
              candidateSources: trace.candidateSources,
              modelVersion: trace.modelVersion,
              score: trace.score,
            }
          : null,
      }
    })

    try {
      const { error } = await supabase.from('feed_exposures').insert(richRows as any)
      if (!error) return

      // Backward-compatible fallback while environments roll out the Phase A migration.
      const legacyRows = storyIds.map((storyId, index) => ({
        user_id: userId,
        session_id: sessionId,
        variant: variant || undefined,
        story_id: storyId,
        position: startPosition + index,
      }))
      const { error: fallbackError } = await supabase
        .from('feed_exposures')
        .insert(legacyRows as any)
      if (fallbackError) throw fallbackError
    } catch (error) {
      // Recommendation logging is best-effort and must never break feed delivery.
      console.warn('logFeedExposures failed', error)
    }
  }

  private static async fetchStoryMetrics(
    storyIds: string[]
  ): Promise<Map<string, StoryMetrics>> {
    const map = new Map<string, StoryMetrics>()
    if (!storyIds.length) return map

    const supabase = createServerClient()
    const [{ data: engagement }, { data: velocity }] = await Promise.all([
      supabase
        .from('story_engagement_metrics')
        .select('story_id, total_views, completions')
        .in('story_id', storyIds),
      supabase
        .from('story_velocity')
        .select('story_id, views_48h, likes_48h, completes_48h')
        .in('story_id', storyIds),
    ])

    const completionRates = new Map<string, number>()
    for (const row of engagement || []) {
      const storyId = (row as any).story_id as string
      const views = Number((row as any).total_views) || 0
      const completions = Number((row as any).completions) || 0
      completionRates.set(storyId, views > 0 ? completions / views : 0)
    }

    const velocityByStory = new Map<
      string,
      { views: number; likes: number; completes: number }
    >()
    for (const row of velocity || []) {
      velocityByStory.set((row as any).story_id as string, {
        views: Number((row as any).views_48h) || 0,
        likes: Number((row as any).likes_48h) || 0,
        completes: Number((row as any).completes_48h) || 0,
      })
    }

    for (const storyId of storyIds) {
      map.set(storyId, {
        completionRate: completionRates.get(storyId) || 0,
        velocity: velocityByStory.get(storyId) || {
          views: 0,
          likes: 0,
          completes: 0,
        },
      })
    }

    return map
  }

  private static async fetchCreatorAuthority(
    creatorIds: string[]
  ): Promise<Map<string, CreatorAuthority>> {
    const map = new Map<string, CreatorAuthority>()
    if (!creatorIds.length) return map

    const supabase = createServerClient()
    const { data } = await supabase
      .from('creator_authority')
      .select('creator_id, follower_count, avg_completion_rate')
      .in('creator_id', creatorIds)

    for (const row of data || []) {
      map.set((row as any).creator_id as string, {
        followerCount: Number((row as any).follower_count) || 0,
        avgCompletionRate: Number((row as any).avg_completion_rate) || 0,
      })
    }

    return map
  }
}

export default RecommendationService

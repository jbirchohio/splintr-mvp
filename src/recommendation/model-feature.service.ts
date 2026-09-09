import { FypWeights } from '@/services/recs-config.service'
import { HeuristicRanker } from './heuristic-ranker'
import {
  CreatorAuthority,
  RecommendationCandidate,
  StoryMetrics,
  UserSignals,
} from './types'

export const RECOMMENDATION_FEATURE_SCHEMA_VERSION = 'phase-c-v1'

export const RECOMMENDATION_FEATURE_NAMES = [
  'heuristic_score',
  'freshness_hours',
  'log_views',
  'followed_creator',
  'category_affinity',
  'completion_rate',
  'velocity_views',
  'velocity_likes',
  'velocity_completes',
  'creator_followers_log',
  'creator_completion_rate',
  'source_recent',
  'source_trending',
  'source_following',
  'source_collaborative',
  'source_embedding',
  'source_exploration',
] as const

export type RecommendationFeatureName = typeof RECOMMENDATION_FEATURE_NAMES[number]
export type RecommendationFeatureVector = Record<RecommendationFeatureName, number>

export class ModelFeatureService {
  static build(params: {
    candidates: RecommendationCandidate[]
    signals: UserSignals
    weights: FypWeights
    metricsByStory: Map<string, StoryMetrics>
    authorityByCreator: Map<string, CreatorAuthority>
  }): Map<string, RecommendationFeatureVector> {
    const { candidates, signals, weights, metricsByStory, authorityByCreator } = params
    const heuristic = HeuristicRanker.rank(params)
    const heuristicByStory = new Map(heuristic.map(item => [item.story.id, item.score]))
    const now = Date.now()
    const vectors = new Map<string, RecommendationFeatureVector>()

    for (const candidate of candidates) {
      const story = candidate.story
      const metrics = metricsByStory.get(story.id)
      const authority = authorityByCreator.get(story.creator_id)
      const freshnessHours = Math.max(
        0,
        (now - new Date(story.published_at).getTime()) / 3600000
      )

      vectors.set(story.id, {
        heuristic_score: heuristicByStory.get(story.id) || 0,
        freshness_hours: Math.min(freshnessHours, 24 * 30),
        log_views: Math.log1p(Math.max(0, story.view_count || 0)),
        followed_creator: signals.followedCreators.has(story.creator_id) ? 1 : 0,
        category_affinity: story.category
          ? signals.categoryAffinities.get(story.category) || 0
          : 0,
        completion_rate: metrics?.completionRate || 0,
        velocity_views: Math.log1p(metrics?.velocity.views || 0),
        velocity_likes: Math.log1p(metrics?.velocity.likes || 0),
        velocity_completes: Math.log1p(metrics?.velocity.completes || 0),
        creator_followers_log: Math.log1p(authority?.followerCount || 0),
        creator_completion_rate: authority?.avgCompletionRate || 0,
        source_recent: candidate.sources.includes('recent') ? 1 : 0,
        source_trending: candidate.sources.includes('trending') ? 1 : 0,
        source_following: candidate.sources.includes('following') ? 1 : 0,
        source_collaborative: candidate.sources.includes('collaborative') ? 1 : 0,
        source_embedding: candidate.sources.includes('embedding') ? 1 : 0,
        source_exploration: candidate.sources.includes('exploration') ? 1 : 0,
      })
    }

    return vectors
  }
}

export default ModelFeatureService

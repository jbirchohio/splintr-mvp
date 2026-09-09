import { FypWeights } from '@/services/recs-config.service'
import {
  CreatorAuthority,
  RankedCandidate,
  RecommendationCandidate,
  StoryMetrics,
  UserSignals,
} from './types'

export type HeuristicRankerInput = {
  candidates: RecommendationCandidate[]
  signals: UserSignals
  weights: FypWeights
  metricsByStory: Map<string, StoryMetrics>
  authorityByCreator: Map<string, CreatorAuthority>
}

export class HeuristicRanker {
  static rank({
    candidates,
    signals,
    weights,
    metricsByStory,
    authorityByCreator,
  }: HeuristicRankerInput): RankedCandidate[] {
    const now = Date.now()

    return candidates
      .map(candidate => {
        const { story, sources } = candidate
        let score = 0
        const reasons: string[] = []

        const ageHours = Math.max(0, (now - new Date(story.published_at).getTime()) / 3600000)
        const freshness =
          Math.max(0, (weights.freshnessHours ?? 72) - ageHours) *
          (weights.freshnessFactor ?? 0.25)
        score += freshness
        if (freshness > 0) reasons.push(`fresh+${freshness.toFixed(2)}`)

        const socialProof = Math.min(
          weights.socialProofCap ?? 50,
          (story.view_count || 0) * (weights.socialProofFactor ?? 0.001)
        )
        score += socialProof
        if (socialProof > 0) reasons.push(`social+${socialProof.toFixed(2)}`)

        if (signals.followedCreators.has(story.creator_id)) {
          const boost = weights.followedBoost ?? 10
          score += boost
          reasons.push(`followed+${boost}`)
        }

        if (story.category && signals.categoryAffinities.has(story.category)) {
          const affinity =
            (signals.categoryAffinities.get(story.category) || 0) *
            (weights.categoryAffinityFactor ?? 0.5)
          score += affinity
          reasons.push(`category+${affinity.toFixed(2)}`)
        }

        const metrics = metricsByStory.get(story.id)
        if (metrics) {
          const completionBoost =
            (weights.completionBoostFactor || 0) * metrics.completionRate
          if (completionBoost) {
            score += completionBoost
            reasons.push(`completion+${completionBoost.toFixed(2)}`)
          }

          const velocityBoost =
            metrics.velocity.views * (weights.velocityViewFactor || 0) +
            metrics.velocity.likes * (weights.velocityLikeFactor || 0) +
            metrics.velocity.completes * (weights.velocityCompleteFactor || 0)
          if (velocityBoost) {
            score += velocityBoost
            reasons.push(`velocity+${velocityBoost.toFixed(2)}`)
          }
        }

        // Creator history stays a weak contextual feature. Story behavior should be
        // able to overpower creator size so new creators can break out.
        const authority = authorityByCreator.get(story.creator_id)
        if (authority) {
          const followerSignal = Math.tanh(authority.followerCount / 1000)
          const authorityBoost =
            followerSignal * Math.min(weights.authorityFollowerFactor || 0, 0.25) +
            authority.avgCompletionRate * Math.min(weights.authorityCompletionFactor || 0, 1)
          if (authorityBoost) {
            score += authorityBoost
            reasons.push(`authority+${authorityBoost.toFixed(2)}`)
          }
        }

        // Retrieval source is useful information even before the learned ranker exists.
        // Keep these deliberately small so retrieval does not become another hard-coded ranker.
        if (sources.includes('collaborative')) {
          score += 0.35
          reasons.push('source:collaborative')
        }
        if (sources.includes('following')) reasons.push('source:following')
        if (sources.includes('trending')) reasons.push('source:trending')
        if (sources.includes('exploration')) reasons.push('source:exploration')

        if (!signals.hasHistory) {
          const jitter = (Math.random() - 0.5) * (weights.coldStartJitter ?? 0.5)
          score += jitter
          reasons.push('coldstart')
        }

        return { ...candidate, score, reasons }
      })
      .sort((a, b) => b.score - a.score)
  }
}

export default HeuristicRanker

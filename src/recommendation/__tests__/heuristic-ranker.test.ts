import { HeuristicRanker } from '../heuristic-ranker'
import type { FypWeights } from '@/services/recs-config.service'
import type { RecommendationCandidate, UserSignals } from '../types'

const weights: FypWeights = {
  freshnessFactor: 0,
  freshnessHours: 72,
  socialProofFactor: 0,
  socialProofCap: 50,
  followedBoost: 5,
  categoryAffinityFactor: 1,
  coldStartJitter: 0,
  cfEnabled: false,
  cfMaxBoost: 0,
  diversity: {
    perCreatorMax: 2,
    perCategoryWindow: 10,
    perCategoryMaxInWindow: 5,
  },
  completionBoostFactor: 4,
  velocityViewFactor: 0,
  velocityLikeFactor: 0,
  velocityCompleteFactor: 0,
  authorityFollowerFactor: 0.001,
  authorityCompletionFactor: 2,
}

function candidate(
  id: string,
  creatorId: string,
  category: string,
  sources: RecommendationCandidate['sources'] = ['recent']
): RecommendationCandidate {
  return {
    story: {
      id,
      creator_id: creatorId,
      title: id,
      description: null,
      thumbnail_url: null,
      view_count: 0,
      published_at: new Date().toISOString(),
      category,
    },
    sources,
  }
}

const baseSignals: UserSignals = {
  followedCreators: new Set(),
  categoryAffinities: new Map(),
  hasHistory: true,
  engagedStoryIds: new Set(),
  recentActions: [],
}

describe('HeuristicRanker', () => {
  it('lets behavioral completion quality outrank creator size', () => {
    const smallCreator = candidate('small', 'creator-small', 'horror')
    const largeCreator = candidate('large', 'creator-large', 'horror')

    const ranked = HeuristicRanker.rank({
      candidates: [largeCreator, smallCreator],
      signals: baseSignals,
      weights,
      metricsByStory: new Map([
        ['small', { completionRate: 0.95, velocity: { views: 0, likes: 0, completes: 0 } }],
        ['large', { completionRate: 0.1, velocity: { views: 0, likes: 0, completes: 0 } }],
      ]),
      authorityByCreator: new Map([
        ['creator-small', { followerCount: 10, avgCompletionRate: 0.2 }],
        ['creator-large', { followerCount: 500000, avgCompletionRate: 0.2 }],
      ]),
    })

    expect(ranked[0].story.id).toBe('small')
  })

  it('responds to weighted category affinity', () => {
    const horror = candidate('horror', 'creator-a', 'horror')
    const comedy = candidate('comedy', 'creator-b', 'comedy')

    const ranked = HeuristicRanker.rank({
      candidates: [comedy, horror],
      signals: {
        ...baseSignals,
        categoryAffinities: new Map([['horror', 3]]),
      },
      weights,
      metricsByStory: new Map(),
      authorityByCreator: new Map(),
    })

    expect(ranked[0].story.id).toBe('horror')
  })

  it('keeps collaborative retrieval as a small signal rather than a dominant rule', () => {
    const collaborative = candidate('collab', 'creator-a', 'drama', ['collaborative'])
    const highQuality = candidate('quality', 'creator-b', 'drama', ['recent'])

    const ranked = HeuristicRanker.rank({
      candidates: [collaborative, highQuality],
      signals: baseSignals,
      weights,
      metricsByStory: new Map([
        ['collab', { completionRate: 0.2, velocity: { views: 0, likes: 0, completes: 0 } }],
        ['quality', { completionRate: 0.9, velocity: { views: 0, likes: 0, completes: 0 } }],
      ]),
      authorityByCreator: new Map(),
    })

    expect(ranked[0].story.id).toBe('quality')
    expect(ranked.find(item => item.story.id === 'collab')?.reasons).toContain('source:collaborative')
  })
})

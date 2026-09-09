import { OfflineEvaluationService } from '../offline-evaluation.service'
import { RECOMMENDATION_FEATURE_SCHEMA_VERSION } from '../model-feature.service'
import { RecommendationTrainingRow } from '../training-data.service'

function row(index: number): RecommendationTrainingRow {
  const positive = index % 2 === 0
  return {
    exposureId: `e-${index}`,
    userId: `u-${index % 10}`,
    sessionId: `s-${index}`,
    storyId: `story-${index}`,
    position: index + 1,
    shownAt: new Date(Date.UTC(2026, 0, 1, 0, index)).toISOString(),
    candidateSource: 'recent',
    servedModelVersion: 'heuristic-phase-c-v1',
    servedScore: positive ? 0 : 1,
    experimentArm: 'control',
    featureSchemaVersion: RECOMMENDATION_FEATURE_SCHEMA_VERSION,
    features: {
      heuristic_score: positive ? 0 : 1,
      freshness_hours: 1,
      log_views: 1,
      followed_creator: 0,
      category_affinity: positive ? 2 : -2,
      completion_rate: positive ? 0.9 : 0.1,
      velocity_views: 0,
      velocity_likes: 0,
      velocity_completes: 0,
      creator_followers_log: 0,
      creator_completion_rate: 0,
      source_recent: 1,
      source_trending: 0,
      source_following: 0,
      source_collaborative: 0,
      source_embedding: 0,
      source_exploration: 0,
    },
    watchRatio: positive ? 1 : 0.1,
    watchMs: positive ? 10000 : 1000,
    fastSkip: positive ? 0 : 1,
    completedNode: positive ? 1 : 0,
    selectedChoice: positive ? 1 : 0,
    continued: positive ? 1 : 0,
    completedPath: positive ? 1 : 0,
    replayed: 0,
    alternateEnding: 0,
    liked: 0,
    commented: 0,
    shared: 0,
    notInterested: 0,
    reported: 0,
    targetUtility: positive ? 5 : -1,
  }
}

describe('OfflineEvaluationService', () => {
  test('evaluates on a temporal holdout and can beat a bad heuristic ordering', () => {
    const result = OfflineEvaluationService.evaluate({
      rows: Array.from({ length: 100 }, (_, index) => row(index)),
      positiveThreshold: 1.5,
      holdoutFraction: 0.2,
      version: 'test-model',
    })

    expect(result.trainRows).toBe(80)
    expect(result.holdoutRows).toBe(20)
    expect(result.learned.auc).not.toBeNull()
    expect(result.heuristic.auc).not.toBeNull()
    expect(result.learned.auc!).toBeGreaterThan(result.heuristic.auc!)
    expect(result.aucLift!).toBeGreaterThan(0)
    expect(result.learned.calibration.length).toBeGreaterThan(0)
  })
})

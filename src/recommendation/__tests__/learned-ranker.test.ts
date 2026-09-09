import { LearnedRanker } from '../learned-ranker'
import { ModelTrainerService } from '../model-trainer.service'
import {
  RECOMMENDATION_FEATURE_NAMES,
  RECOMMENDATION_FEATURE_SCHEMA_VERSION,
} from '../model-feature.service'

const baseFeatures = () => Object.fromEntries(
  RECOMMENDATION_FEATURE_NAMES.map(name => [name, 0])
) as Record<(typeof RECOMMENDATION_FEATURE_NAMES)[number], number>

describe('LearnedRanker', () => {
  test('ranks candidates using an active model coefficient set', () => {
    const a = baseFeatures()
    const b = baseFeatures()
    a.completion_rate = 0.9
    b.completion_rate = 0.1

    const ranked = LearnedRanker.rank({
      candidates: [
        { story: { id: 'a', creator_id: 'c1', title: 'A', published_at: new Date().toISOString() }, sources: ['recent'] },
        { story: { id: 'b', creator_id: 'c2', title: 'B', published_at: new Date().toISOString() }, sources: ['recent'] },
      ],
      featuresByStory: new Map([['a', a], ['b', b]]),
      model: {
        version: 'test-v1',
        featureSchemaVersion: RECOMMENDATION_FEATURE_SCHEMA_VERSION,
        intercept: 0,
        coefficients: { completion_rate: 4 },
      },
    })

    expect(ranked[0].story.id).toBe('a')
    expect(ranked[0].score).toBeGreaterThan(ranked[1].score)
  })

  test('rejects incompatible feature schemas', () => {
    expect(() => LearnedRanker.validateModel({
      version: 'bad',
      featureSchemaVersion: 'old-schema',
      intercept: 0,
      coefficients: {},
    })).toThrow(/Unsupported feature schema/)
  })
})

describe('ModelTrainerService', () => {
  test('learns a positive coefficient from labeled exposure rows', () => {
    const rows = Array.from({ length: 80 }, (_, index) => {
      const features = baseFeatures()
      features.completion_rate = index < 40 ? 0.1 : 0.9
      return {
        features,
        targetUtility: index < 40 ? 0 : 3,
      }
    })

    const model = ModelTrainerService.train({ rows, version: 'trained-test', iterations: 250 })
    expect(model.featureSchemaVersion).toBe(RECOMMENDATION_FEATURE_SCHEMA_VERSION)
    expect(model.coefficients.completion_rate).toBeGreaterThan(0)
  })
})

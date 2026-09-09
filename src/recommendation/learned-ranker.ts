import {
  RankedCandidate,
  RecommendationCandidate,
} from './types'
import {
  RecommendationFeatureName,
  RecommendationFeatureVector,
  RECOMMENDATION_FEATURE_SCHEMA_VERSION,
} from './model-feature.service'

export type LearnedRankerModel = {
  version: string
  featureSchemaVersion: string
  intercept: number
  coefficients: Partial<Record<RecommendationFeatureName, number>>
  means?: Partial<Record<RecommendationFeatureName, number>>
  scales?: Partial<Record<RecommendationFeatureName, number>>
}

export class LearnedRanker {
  static validateModel(model: LearnedRankerModel): void {
    if (!model.version) throw new Error('Learned ranker model requires a version')
    if (model.featureSchemaVersion !== RECOMMENDATION_FEATURE_SCHEMA_VERSION) {
      throw new Error(
        `Unsupported feature schema ${model.featureSchemaVersion}; expected ${RECOMMENDATION_FEATURE_SCHEMA_VERSION}`
      )
    }
    if (!Number.isFinite(model.intercept)) throw new Error('Model intercept must be finite')
    for (const value of Object.values(model.coefficients || {})) {
      if (value !== undefined && !Number.isFinite(value)) {
        throw new Error('Model coefficients must be finite')
      }
    }
  }

  static rank(params: {
    candidates: RecommendationCandidate[]
    featuresByStory: Map<string, RecommendationFeatureVector>
    model: LearnedRankerModel
  }): RankedCandidate[] {
    const { candidates, featuresByStory, model } = params
    this.validateModel(model)

    return candidates
      .map(candidate => {
        const features = featuresByStory.get(candidate.story.id)
        if (!features) {
          return { ...candidate, score: Number.NEGATIVE_INFINITY, reasons: ['ml:missing-features'] }
        }

        let raw = model.intercept
        for (const [name, coefficient] of Object.entries(model.coefficients || {})) {
          const featureName = name as RecommendationFeatureName
          const value = features[featureName]
          if (!Number.isFinite(value) || !Number.isFinite(coefficient)) continue
          const mean = model.means?.[featureName] || 0
          const scale = model.scales?.[featureName] || 1
          const normalized = scale === 0 ? value - mean : (value - mean) / scale
          raw += normalized * (coefficient as number)
        }

        // Logistic transform gives a stable 0..1 score while preserving ordering.
        const score = 1 / (1 + Math.exp(-Math.max(-30, Math.min(30, raw))))
        return {
          ...candidate,
          score,
          reasons: [`ml:${model.version}`, `probability:${score.toFixed(4)}`],
        }
      })
      .sort((a, b) => b.score - a.score)
  }
}

export default LearnedRanker

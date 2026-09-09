import { LearnedRankerModel } from './learned-ranker'
import {
  RECOMMENDATION_FEATURE_NAMES,
  RECOMMENDATION_FEATURE_SCHEMA_VERSION,
  RecommendationFeatureName,
} from './model-feature.service'

export type TrainableRecommendationRow = {
  features: Record<string, number>
  targetUtility: number
}

export class ModelTrainerService {
  static train(params: {
    rows: TrainableRecommendationRow[]
    version: string
    iterations?: number
    learningRate?: number
    l2?: number
    positiveThreshold?: number
  }): LearnedRankerModel {
    const {
      rows,
      version,
      iterations = 400,
      learningRate = 0.05,
      l2 = 0.001,
      positiveThreshold = 1.5,
    } = params

    if (rows.length < 50) {
      throw new Error('At least 50 labeled exposure rows are required to train a model')
    }

    const means: Partial<Record<RecommendationFeatureName, number>> = {}
    const scales: Partial<Record<RecommendationFeatureName, number>> = {}

    for (const name of RECOMMENDATION_FEATURE_NAMES) {
      const values = rows.map(row => Number(row.features[name]) || 0)
      const mean = values.reduce((sum, value) => sum + value, 0) / values.length
      const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length
      means[name] = mean
      scales[name] = Math.sqrt(variance) || 1
    }

    const coefficients: Partial<Record<RecommendationFeatureName, number>> = {}
    for (const name of RECOMMENDATION_FEATURE_NAMES) coefficients[name] = 0
    let intercept = 0

    for (let iteration = 0; iteration < iterations; iteration += 1) {
      let interceptGradient = 0
      const gradients: Partial<Record<RecommendationFeatureName, number>> = {}
      for (const name of RECOMMENDATION_FEATURE_NAMES) gradients[name] = 0

      for (const row of rows) {
        let raw = intercept
        for (const name of RECOMMENDATION_FEATURE_NAMES) {
          const value = Number(row.features[name]) || 0
          const normalized = (value - (means[name] || 0)) / (scales[name] || 1)
          raw += normalized * (coefficients[name] || 0)
        }
        const probability = 1 / (1 + Math.exp(-Math.max(-30, Math.min(30, raw))))
        const label = row.targetUtility >= positiveThreshold ? 1 : 0
        const error = probability - label
        interceptGradient += error

        for (const name of RECOMMENDATION_FEATURE_NAMES) {
          const value = Number(row.features[name]) || 0
          const normalized = (value - (means[name] || 0)) / (scales[name] || 1)
          gradients[name] = (gradients[name] || 0) + error * normalized
        }
      }

      intercept -= learningRate * (interceptGradient / rows.length)
      for (const name of RECOMMENDATION_FEATURE_NAMES) {
        const coefficient = coefficients[name] || 0
        const gradient = (gradients[name] || 0) / rows.length + l2 * coefficient
        coefficients[name] = coefficient - learningRate * gradient
      }
    }

    return {
      version,
      featureSchemaVersion: RECOMMENDATION_FEATURE_SCHEMA_VERSION,
      intercept,
      coefficients,
      means,
      scales,
    }
  }
}

export default ModelTrainerService

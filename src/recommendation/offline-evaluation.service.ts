import { LearnedRankerModel } from './learned-ranker'
import { ModelTrainerService } from './model-trainer.service'
import {
  RecommendationFeatureName,
  RECOMMENDATION_FEATURE_SCHEMA_VERSION,
} from './model-feature.service'
import { RecommendationTrainingRow } from './training-data.service'

export type CalibrationBucket = {
  minScore: number
  maxScore: number
  count: number
  averagePrediction: number
  observedPositiveRate: number
}

export type OfflineEvaluationResult = {
  trainRows: number
  holdoutRows: number
  positiveThreshold: number
  positiveRate: number
  learned: {
    auc: number | null
    logLoss: number
    brierScore: number
    accuracy: number
    topQuartileAverageUtility: number
    calibration: CalibrationBucket[]
  }
  heuristic: {
    auc: number | null
    topQuartileAverageUtility: number
  }
  aucLift: number | null
  utilityLift: number | null
  model: LearnedRankerModel
}

function predict(model: LearnedRankerModel, features: Record<string, number>): number {
  let raw = model.intercept
  for (const [name, coefficient] of Object.entries(model.coefficients || {})) {
    const featureName = name as RecommendationFeatureName
    const value = Number(features[featureName]) || 0
    const mean = model.means?.[featureName] || 0
    const scale = model.scales?.[featureName] || 1
    const normalized = scale === 0 ? value - mean : (value - mean) / scale
    raw += normalized * (Number(coefficient) || 0)
  }
  return 1 / (1 + Math.exp(-Math.max(-30, Math.min(30, raw))))
}

function auc(scores: Array<{ score: number; label: number }>): number | null {
  const positives = scores.filter(row => row.label === 1).length
  const negatives = scores.length - positives
  if (!positives || !negatives) return null

  const sorted = [...scores].sort((a, b) => a.score - b.score)
  let rankSum = 0
  let index = 0
  while (index < sorted.length) {
    let end = index + 1
    while (end < sorted.length && sorted[end].score === sorted[index].score) end += 1
    const averageRank = ((index + 1) + end) / 2
    for (let cursor = index; cursor < end; cursor += 1) {
      if (sorted[cursor].label === 1) rankSum += averageRank
    }
    index = end
  }

  return (rankSum - positives * (positives + 1) / 2) / (positives * negatives)
}

function topQuartileUtility(rows: Array<{ score: number; utility: number }>): number {
  if (!rows.length) return 0
  const topCount = Math.max(1, Math.ceil(rows.length * 0.25))
  const top = [...rows].sort((a, b) => b.score - a.score).slice(0, topCount)
  return top.reduce((sum, row) => sum + row.utility, 0) / top.length
}

function calibration(rows: Array<{ probability: number; label: number }>): CalibrationBucket[] {
  const buckets: CalibrationBucket[] = []
  for (let bucket = 0; bucket < 10; bucket += 1) {
    const minScore = bucket / 10
    const maxScore = (bucket + 1) / 10
    const members = rows.filter(row =>
      bucket === 9
        ? row.probability >= minScore && row.probability <= maxScore
        : row.probability >= minScore && row.probability < maxScore
    )
    if (!members.length) continue
    buckets.push({
      minScore,
      maxScore,
      count: members.length,
      averagePrediction: members.reduce((sum, row) => sum + row.probability, 0) / members.length,
      observedPositiveRate: members.reduce((sum, row) => sum + row.label, 0) / members.length,
    })
  }
  return buckets
}

export class OfflineEvaluationService {
  static evaluate(params: {
    rows: RecommendationTrainingRow[]
    positiveThreshold?: number
    holdoutFraction?: number
    version?: string
  }): OfflineEvaluationResult {
    const positiveThreshold = params.positiveThreshold ?? 1.5
    const holdoutFraction = Math.max(0.1, Math.min(0.4, params.holdoutFraction ?? 0.2))
    const usable = params.rows
      .filter(row =>
        row.featureSchemaVersion === RECOMMENDATION_FEATURE_SCHEMA_VERSION &&
        Object.keys(row.features).length > 0
      )
      .sort((a, b) => new Date(a.shownAt).getTime() - new Date(b.shownAt).getTime())

    if (usable.length < 70) {
      throw new Error('At least 70 trainable exposure rows are required for holdout evaluation')
    }

    const holdoutCount = Math.max(20, Math.floor(usable.length * holdoutFraction))
    const trainRows = usable.slice(0, usable.length - holdoutCount)
    const holdoutRows = usable.slice(usable.length - holdoutCount)
    if (trainRows.length < 50) throw new Error('Holdout split leaves fewer than 50 training rows')

    const model = ModelTrainerService.train({
      rows: trainRows.map(row => ({ features: row.features, targetUtility: row.targetUtility })),
      version: params.version || `offline-${Date.now()}`,
      positiveThreshold,
    })

    const predictions = holdoutRows.map(row => {
      const probability = predict(model, row.features)
      const label = row.targetUtility >= positiveThreshold ? 1 : 0
      return {
        probability,
        heuristicScore: Number(row.features.heuristic_score) || 0,
        label,
        utility: row.targetUtility,
      }
    })

    const learnedAuc = auc(predictions.map(row => ({ score: row.probability, label: row.label })))
    const heuristicAuc = auc(predictions.map(row => ({ score: row.heuristicScore, label: row.label })))
    const epsilon = 1e-7
    const logLoss = predictions.reduce((sum, row) => {
      const p = Math.min(1 - epsilon, Math.max(epsilon, row.probability))
      return sum - (row.label * Math.log(p) + (1 - row.label) * Math.log(1 - p))
    }, 0) / predictions.length
    const brierScore = predictions.reduce(
      (sum, row) => sum + (row.probability - row.label) ** 2,
      0
    ) / predictions.length
    const accuracy = predictions.filter(row => (row.probability >= 0.5 ? 1 : 0) === row.label).length / predictions.length

    const learnedTopUtility = topQuartileUtility(
      predictions.map(row => ({ score: row.probability, utility: row.utility }))
    )
    const heuristicTopUtility = topQuartileUtility(
      predictions.map(row => ({ score: row.heuristicScore, utility: row.utility }))
    )
    const positiveRate = predictions.reduce((sum, row) => sum + row.label, 0) / predictions.length

    return {
      trainRows: trainRows.length,
      holdoutRows: holdoutRows.length,
      positiveThreshold,
      positiveRate,
      learned: {
        auc: learnedAuc,
        logLoss,
        brierScore,
        accuracy,
        topQuartileAverageUtility: learnedTopUtility,
        calibration: calibration(predictions),
      },
      heuristic: {
        auc: heuristicAuc,
        topQuartileAverageUtility: heuristicTopUtility,
      },
      aucLift: learnedAuc == null || heuristicAuc == null ? null : learnedAuc - heuristicAuc,
      utilityLift: learnedTopUtility - heuristicTopUtility,
      model,
    }
  }
}

export default OfflineEvaluationService

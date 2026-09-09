import { RecommendationTrainingRow } from './training-data.service'

export type RankerExperimentArmReport = {
  arm: 'control' | 'learned'
  exposures: number
  uniqueUsers: number
  averageUtility: number
  averageWatchRatio: number
  fastSkipRate: number
  choiceRate: number
  continuationRate: number
  pathCompletionRate: number
  replayRate: number
  shareRate: number
  notInterestedRate: number
  reportRate: number
}

export type RankerExperimentReport = {
  control: RankerExperimentArmReport
  learned: RankerExperimentArmReport
  lift: {
    averageUtility: number | null
    averageWatchRatio: number | null
    continuationRate: number | null
    pathCompletionRate: number | null
    replayRate: number | null
    fastSkipRate: number | null
  }
}

function summarize(rows: RecommendationTrainingRow[], arm: 'control' | 'learned'): RankerExperimentArmReport {
  const selected = rows.filter(row => row.experimentArm === arm)
  const count = selected.length
  const ratio = (selector: (row: RecommendationTrainingRow) => number) =>
    count ? selected.reduce((sum, row) => sum + selector(row), 0) / count : 0

  const identities = new Set(
    selected
      .map(row => row.userId || row.sessionId)
      .filter((value): value is string => Boolean(value))
  )

  return {
    arm,
    exposures: count,
    uniqueUsers: identities.size,
    averageUtility: ratio(row => row.targetUtility),
    averageWatchRatio: ratio(row => row.watchRatio),
    fastSkipRate: ratio(row => row.fastSkip),
    choiceRate: ratio(row => row.selectedChoice),
    continuationRate: ratio(row => row.continued),
    pathCompletionRate: ratio(row => row.completedPath),
    replayRate: ratio(row => row.replayed),
    shareRate: ratio(row => row.shared),
    notInterestedRate: ratio(row => row.notInterested),
    reportRate: ratio(row => row.reported),
  }
}

function relativeLift(treatment: number, control: number): number | null {
  if (!Number.isFinite(treatment) || !Number.isFinite(control) || control === 0) return null
  return (treatment - control) / Math.abs(control)
}

export class ExperimentReportService {
  static build(rows: RecommendationTrainingRow[]): RankerExperimentReport {
    const control = summarize(rows, 'control')
    const learned = summarize(rows, 'learned')

    return {
      control,
      learned,
      lift: {
        averageUtility: relativeLift(learned.averageUtility, control.averageUtility),
        averageWatchRatio: relativeLift(learned.averageWatchRatio, control.averageWatchRatio),
        continuationRate: relativeLift(learned.continuationRate, control.continuationRate),
        pathCompletionRate: relativeLift(learned.pathCompletionRate, control.pathCompletionRate),
        replayRate: relativeLift(learned.replayRate, control.replayRate),
        // Lower fast-skip rate is better, so positive lift means improvement.
        fastSkipRate: relativeLift(control.fastSkipRate, learned.fastSkipRate),
      },
    }
  }
}

export default ExperimentReportService

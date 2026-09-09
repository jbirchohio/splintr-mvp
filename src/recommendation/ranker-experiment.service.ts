export type RankerExperimentArm = 'control' | 'learned'

function hash32(value: string): number {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export class RankerExperimentService {
  static trafficPercent(): number {
    const configured = Number(process.env.RECOMMENDATION_LEARNED_TRAFFIC_PERCENT ?? 10)
    if (!Number.isFinite(configured)) return 10
    return Math.max(0, Math.min(100, configured))
  }

  static assign(params: {
    userId?: string | null
    sessionId?: string | null
    explicitArm?: string | null
  }): RankerExperimentArm {
    const explicit = params.explicitArm?.toLowerCase()
    if (explicit === 'control' || explicit === 'learned') return explicit

    const key = params.userId || params.sessionId
    if (!key) return 'control'

    const bucket = hash32(`ranker-v1:${key}`) % 10000
    return bucket < this.trafficPercent() * 100 ? 'learned' : 'control'
  }
}

export default RankerExperimentService

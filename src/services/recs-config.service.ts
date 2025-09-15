import { createServerClient } from '@/lib/supabase'

export type FypWeights = {
  freshnessFactor: number
  freshnessHours: number
  socialProofFactor: number
  socialProofCap: number
  followedBoost: number
  categoryAffinityFactor: number
  coldStartJitter: number
  cfEnabled: boolean
  cfMaxBoost: number
  diversity: { perCreatorMax: number; perCategoryWindow: number; perCategoryMaxInWindow: number }
  // Additional boosts
  completionBoostFactor?: number
  velocityViewFactor?: number
  velocityLikeFactor?: number
  velocityCompleteFactor?: number
  authorityFollowerFactor?: number
  authorityCompletionFactor?: number
}

const DEFAULT_A: FypWeights = {
  freshnessFactor: 0.25,
  freshnessHours: 72,
  socialProofFactor: 0.001,
  socialProofCap: 50,
  followedBoost: 10,
  categoryAffinityFactor: 0.5,
  coldStartJitter: 0.5,
  cfEnabled: false,
  cfMaxBoost: 0,
  diversity: { perCreatorMax: 2, perCategoryWindow: 10, perCategoryMaxInWindow: 5 },
  completionBoostFactor: 4,
  velocityViewFactor: 0.01,
  velocityLikeFactor: 0.2,
  velocityCompleteFactor: 0.3,
  authorityFollowerFactor: 0.001,
  authorityCompletionFactor: 2,
}

const DEFAULT_B: FypWeights = {
  ...DEFAULT_A,
  coldStartJitter: 0.4,
  cfEnabled: true,
  cfMaxBoost: 6,
}

type CacheEntry = { value: FypWeights; expiry: number }
const cache: Record<string, CacheEntry> = {}
const TTL_MS = 60_000

export class RecsConfigService {
  static async getFypWeights(variant?: string | null): Promise<FypWeights> {
    const v = (variant || 'A').toUpperCase()
    const key = `fyp:${v}`
    const now = Date.now()
    const hit = cache[key]
    if (hit && hit.expiry > now) return hit.value

    try {
      const supabase = createServerClient()
      const { data, error } = await supabase
        .from('recs_config')
        .select('data')
        .eq('key', 'fyp_weights')
        .eq('variant', v)
        .eq('active', true)
        .limit(1)
      if (error) throw error
      let value: FypWeights
      if (data && data.length > 0) {
        const row = data[0] as any
        value = { ...(v === 'B' ? DEFAULT_B : DEFAULT_A), ...row.data }
      } else {
        value = v === 'B' ? DEFAULT_B : DEFAULT_A
      }
      cache[key] = { value, expiry: now + TTL_MS }
      return value
    } catch {
      const value = v === 'B' ? DEFAULT_B : DEFAULT_A
      cache[key] = { value, expiry: now + TTL_MS }
      return value
    }
  }
}

export default RecsConfigService

import { createServerClient } from '@/lib/supabase'
import { LearnedRankerModel } from './learned-ranker'

export class ModelRegistryService {
  static async getActiveModel(): Promise<LearnedRankerModel | null> {
    try {
      const supabase = createServerClient() as any
      const { data, error } = await supabase
        .from('recommendation_models')
        .select('version, feature_schema_version, intercept, coefficients, means, scales')
        .eq('is_active', true)
        .order('activated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error || !data) return null
      return {
        version: data.version,
        featureSchemaVersion: data.feature_schema_version,
        intercept: Number(data.intercept) || 0,
        coefficients: data.coefficients || {},
        means: data.means || {},
        scales: data.scales || {},
      }
    } catch {
      return null
    }
  }
}

export default ModelRegistryService

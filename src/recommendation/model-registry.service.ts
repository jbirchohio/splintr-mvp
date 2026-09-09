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

  static async saveModel(params: {
    model: LearnedRankerModel
    trainingRows: number
    metrics?: Record<string, unknown>
    activate?: boolean
  }): Promise<void> {
    const { model, trainingRows, metrics = {}, activate = false } = params
    const supabase = createServerClient() as any
    const { error } = await supabase.from('recommendation_models').upsert(
      {
        version: model.version,
        feature_schema_version: model.featureSchemaVersion,
        intercept: model.intercept,
        coefficients: model.coefficients,
        means: model.means || {},
        scales: model.scales || {},
        training_rows: trainingRows,
        metrics,
        is_active: false,
      },
      { onConflict: 'version' }
    )
    if (error) throw error

    if (activate) {
      const { error: activateError } = await supabase.rpc(
        'activate_recommendation_model',
        { target_version: model.version }
      )
      if (activateError) throw activateError
    }
  }
}

export default ModelRegistryService

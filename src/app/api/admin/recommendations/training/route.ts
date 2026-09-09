import { timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { ModelRegistryService } from '@/recommendation/model-registry.service'
import { ModelTrainerService } from '@/recommendation/model-trainer.service'
import { OfflineEvaluationService } from '@/recommendation/offline-evaluation.service'
import {
  RECOMMENDATION_FEATURE_SCHEMA_VERSION,
} from '@/recommendation/model-feature.service'
import { TrainingDataService } from '@/recommendation/training-data.service'

export const runtime = 'nodejs'

function authorized(req: NextRequest): boolean {
  const expected = process.env.ADMIN_API_KEY
  const provided = req.headers.get('x-admin-api-key')
  if (!expected || !provided) return false
  const left = Buffer.from(expected)
  const right = Buffer.from(provided)
  return left.length === right.length && timingSafeEqual(left, right)
}

function guard(req: NextRequest): NextResponse | null {
  if (!process.env.ADMIN_API_KEY) {
    return NextResponse.json({ error: 'Admin API is not configured' }, { status: 503 })
  }
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

export async function GET(req: NextRequest) {
  const denied = guard(req)
  if (denied) return denied

  try {
    const url = new URL(req.url)
    const since = url.searchParams.get('since') || new Date(Date.now() - 30 * 86400000).toISOString()
    const until = url.searchParams.get('until') || new Date().toISOString()
    const limit = Number(url.searchParams.get('limit') || 5000)
    const rows = await TrainingDataService.build({ since, until, limit })
    return NextResponse.json({
      featureSchemaVersion: RECOMMENDATION_FEATURE_SCHEMA_VERSION,
      count: rows.length,
      rows,
    })
  } catch (error) {
    console.error('Recommendation training export failed', error)
    return NextResponse.json({ error: 'Training export failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const denied = guard(req)
  if (denied) return denied

  try {
    const body = await req.json().catch(() => ({})) as {
      since?: string
      until?: string
      limit?: number
      version?: string
      activate?: boolean
      forceActivate?: boolean
      positiveThreshold?: number
      holdoutFraction?: number
    }

    const since = body.since || new Date(Date.now() - 30 * 86400000).toISOString()
    const positiveThreshold = body.positiveThreshold ?? 1.5
    const rows = await TrainingDataService.build({
      since,
      until: body.until,
      limit: body.limit ?? 10000,
    })

    const trainable = rows.filter(row =>
      row.featureSchemaVersion === RECOMMENDATION_FEATURE_SCHEMA_VERSION &&
      Object.keys(row.features).length > 0
    )

    const version = body.version || `logistic-${Date.now()}`
    const model = ModelTrainerService.train({
      rows: trainable.map(row => ({ features: row.features, targetUtility: row.targetUtility })),
      version,
      positiveThreshold,
    })

    let offline: ReturnType<typeof OfflineEvaluationService.evaluate> | null = null
    let offlineError: string | null = null
    try {
      offline = OfflineEvaluationService.evaluate({
        rows,
        positiveThreshold,
        holdoutFraction: body.holdoutFraction,
        version: `${version}-holdout`,
      })
    } catch (error: any) {
      offlineError = error?.message || 'Offline evaluation unavailable'
    }

    const positives = trainable.filter(row => row.targetUtility >= positiveThreshold).length
    const activationGatePassed = Boolean(
      offline &&
      (offline.aucLift == null || offline.aucLift >= 0) &&
      (offline.utilityLift == null || offline.utilityLift >= 0)
    )

    if (body.activate === true && !activationGatePassed && body.forceActivate !== true) {
      return NextResponse.json(
        {
          error: 'Activation blocked: learned model did not pass holdout gate',
          version,
          offline,
          offlineError,
          forceActivateAvailable: true,
        },
        { status: 409 }
      )
    }

    const metrics = {
      featureSchemaVersion: RECOMMENDATION_FEATURE_SCHEMA_VERSION,
      totalExportRows: rows.length,
      trainableRows: trainable.length,
      positiveRate: trainable.length ? positives / trainable.length : 0,
      positiveThreshold,
      offline,
      offlineError,
      activationGatePassed,
    }

    await ModelRegistryService.saveModel({
      model,
      trainingRows: trainable.length,
      metrics,
      activate: body.activate === true,
    })

    return NextResponse.json({
      ok: true,
      version,
      activated: body.activate === true,
      forcedActivation: body.activate === true && body.forceActivate === true && !activationGatePassed,
      trainingRows: trainable.length,
      metrics,
      coefficients: model.coefficients,
    })
  } catch (error: any) {
    console.error('Recommendation model training failed', error)
    return NextResponse.json(
      { error: error?.message || 'Model training failed' },
      { status: 400 }
    )
  }
}

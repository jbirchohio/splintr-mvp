import { timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { ExperimentReportService } from '@/recommendation/experiment-report.service'
import { OfflineEvaluationService } from '@/recommendation/offline-evaluation.service'
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

export async function GET(req: NextRequest) {
  if (!process.env.ADMIN_API_KEY) {
    return NextResponse.json({ error: 'Admin API is not configured' }, { status: 503 })
  }
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const url = new URL(req.url)
    const since = url.searchParams.get('since') || new Date(Date.now() - 30 * 86400000).toISOString()
    const until = url.searchParams.get('until') || new Date().toISOString()
    const limit = Number(url.searchParams.get('limit') || 10000)
    const positiveThreshold = Number(url.searchParams.get('positiveThreshold') || 1.5)
    const holdoutFraction = Number(url.searchParams.get('holdoutFraction') || 0.2)

    const rows = await TrainingDataService.build({ since, until, limit })
    const experiment = ExperimentReportService.build(rows)

    let offline: ReturnType<typeof OfflineEvaluationService.evaluate> | null = null
    let offlineError: string | null = null
    try {
      offline = OfflineEvaluationService.evaluate({
        rows,
        positiveThreshold,
        holdoutFraction,
      })
    } catch (error: any) {
      offlineError = error?.message || 'Offline evaluation unavailable'
    }

    return NextResponse.json({
      ok: true,
      period: { since, until },
      rows: rows.length,
      experiment,
      offline,
      offlineError,
    })
  } catch (error: any) {
    console.error('Recommendation evaluation failed', error)
    return NextResponse.json(
      { error: error?.message || 'Recommendation evaluation failed' },
      { status: 500 }
    )
  }
}

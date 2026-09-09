import { timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { EmbeddingService } from '@/recommendation/embedding.service'

function authorized(req: NextRequest): boolean {
  const expected = process.env.ADMIN_API_KEY
  const provided = req.headers.get('x-admin-api-key')
  if (!expected || !provided) return false

  const left = Buffer.from(expected)
  const right = Buffer.from(provided)
  return left.length === right.length && timingSafeEqual(left, right)
}

export async function POST(req: NextRequest) {
  if (!process.env.ADMIN_API_KEY) {
    return NextResponse.json({ error: 'Admin API is not configured' }, { status: 503 })
  }
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json().catch(() => ({})) as {
      storyLimit?: number
      storyId?: string
      userId?: string
    }

    const result: Record<string, unknown> = {}

    if (body.storyId) {
      result.story = await EmbeddingService.refreshStoryEmbedding(body.storyId)
    } else {
      result.stories = await EmbeddingService.refreshRecentStoryEmbeddings(body.storyLimit ?? 25)
    }

    if (body.userId) {
      result.userEmbeddingUpdated = await EmbeddingService.refreshUserEmbedding(body.userId)
    }

    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    console.error('Recommendation embedding refresh failed', error)
    return NextResponse.json({ error: 'Embedding refresh failed' }, { status: 500 })
  }
}

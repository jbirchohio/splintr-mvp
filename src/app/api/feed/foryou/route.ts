import { NextResponse } from 'next/server'
import { withSecurity } from '@/lib/security-middleware'
import { withValidation } from '@/lib/validation-middleware'
import { validationSchemas } from '@/lib/validation-schemas'
import { RecommendationService } from '@/services/recommendation.service'

function assignVariant(userId?: string, explicit?: string) {
  if (explicit) return explicit
  if (userId) {
    let hash = 0
    for (let i = 0; i < userId.length; i++) {
      hash = ((hash << 5) - hash) + userId.charCodeAt(i)
      hash |= 0
    }
    return Math.abs(hash) % 2 === 0 ? 'A' : 'B'
  }
  return Math.random() < 0.5 ? 'A' : 'B'
}

export const GET = withSecurity(
  withValidation({ querySchema: validationSchemas.feed.publicFeed })(
    async (req, { query, user }) => {
      try {
        const page = Number((query as any)?.page || 1)
        const limit = Number((query as any)?.limit || 20)
        const offset = (page - 1) * limit
        const sessionId = req.headers.get('x-session-id') || undefined
        const variant = assignVariant(user?.id, (query as any)?.variant as string | undefined)

        const result = await RecommendationService.getForYou({
          userId: user?.id || null,
          sessionId,
          limit,
          offset,
          variant,
        })

        await RecommendationService.logFeedExposures({
          userId: user?.id || null,
          sessionId,
          variant,
          storyIds: result.items.map(story => story.id),
          startPosition: offset + 1,
          traces: result.traces,
        })

        return NextResponse.json({
          stories: result.items,
          pagination: {
            page,
            limit,
            total: result.total,
            totalPages: Math.ceil(result.total / limit),
          },
          assignedVariant: variant,
        })
      } catch (error) {
        console.error('For You feed failed', error)
        return NextResponse.json({ error: 'Failed to fetch feed' }, { status: 500 })
      }
    }
  )
)

import { NextResponse } from 'next/server'
import { videoDatabaseService } from '@/services/video.database.service'
import { withSecurity } from '@/lib/security-middleware'
import { withValidation } from '@/lib/validation-middleware'
import { RATE_LIMITS } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

export const GET = withSecurity(
  withValidation({ rateLimit: RATE_LIMITS.READ })(async (_req: Request, { params }: { params: { videoId: string } }) => {
  try {
    const { videoId } = params
    if (!videoId) return NextResponse.json({ error: 'Video ID is required' }, { status: 400 })

    const video = await videoDatabaseService.getVideoById(videoId)
    if (!video) return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    if (video.processingStatus !== 'completed') return NextResponse.json({ error: 'Video is not ready for streaming' }, { status: 400 })
    if (video.moderationStatus === 'rejected') return NextResponse.json({ error: 'Video is not available' }, { status: 403 })

    const target = video.streamingUrl || `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/video/upload/${video.cloudinaryPublicId}.mp4`
    return NextResponse.redirect(target, { status: 302 })
  } catch (err) {
    logger.error({ err }, 'Error streaming video')
    return NextResponse.json({ error: 'Failed to stream video' }, { status: 500 })
  }
  })
)

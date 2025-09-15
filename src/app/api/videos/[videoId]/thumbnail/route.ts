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

    const target = video.thumbnailUrl || `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/video/upload/so_0,w_400,h_300,c_fill/${video.cloudinaryPublicId}.jpg`
    return NextResponse.redirect(target, { status: 302 })
  } catch (err) {
    logger.error({ err }, 'Error getting video thumbnail')
    return NextResponse.json({ error: 'Failed to get video thumbnail' }, { status: 500 })
  }
  })
)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { cookies } from 'next/headers'
import { v2 as cloudinary } from 'cloudinary'
import { logger } from '@/lib/logger'

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = user.id

    // Start transaction-like cleanup process
    logger.info({ userId }, 'Starting account deletion')

    // 1. Get all videos to delete from Cloudinary
    const { data: videos } = await supabase
      .from('videos')
      .select('cloudinary_public_id')
      .eq('creator_id', userId)

    // Delete videos from Cloudinary
    if (videos && videos.length > 0) {
      for (const video of videos) {
        if (video.cloudinary_public_id) {
          try {
            await cloudinary.uploader.destroy(video.cloudinary_public_id, {
              resource_type: 'video'
            })
            logger.info({ publicId: video.cloudinary_public_id }, 'Deleted video from Cloudinary')
          } catch (cloudinaryError) {
            logger.error({ publicId: video.cloudinary_public_id, err: cloudinaryError }, 'Failed to delete video from Cloudinary')
            // Continue with deletion even if Cloudinary fails
          }
        }
      }
    }

    // 2. Delete story playthroughs (as viewer)
    const { error: playthroughsError } = await supabase
      .from('story_playthroughs')
      .delete()
      .eq('viewer_id', userId)

    if (playthroughsError) {
      logger.error({ err: playthroughsError }, 'Error deleting playthroughs')
    }

    // 3. Delete content flags reported by user
    const { error: flagsError } = await supabase
      .from('content_flags')
      .delete()
      .eq('reporter_id', userId)

    if (flagsError) {
      logger.error({ err: flagsError }, 'Error deleting content flags')
    }

    // 4. Delete videos (this will cascade to related data)
    const { error: videosError } = await supabase
      .from('videos')
      .delete()
      .eq('creator_id', userId)

    if (videosError) {
      logger.error({ err: videosError }, 'Error deleting videos')
      return NextResponse.json(
        { error: 'Failed to delete user videos' },
        { status: 500 }
      )
    }

    // 5. Delete stories (this will cascade to related data)
    const { error: storiesError } = await supabase
      .from('stories')
      .delete()
      .eq('creator_id', userId)

    if (storiesError) {
      logger.error({ err: storiesError }, 'Error deleting stories')
      return NextResponse.json(
        { error: 'Failed to delete user stories' },
        { status: 500 }
      )
    }

    // 6. Delete user profile
    const { error: profileError } = await supabase
      .from('users')
      .delete()
      .eq('id', userId)

    if (profileError) {
      logger.error({ err: profileError }, 'Error deleting user profile')
      return NextResponse.json(
        { error: 'Failed to delete user profile' },
        { status: 500 }
      )
    }

    // 7. Delete user from Supabase Auth (this should be last)
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userId)

    if (authDeleteError) {
      logger.error({ err: authDeleteError }, 'Error deleting user from auth')
      return NextResponse.json(
        { error: 'Failed to delete user account' },
        { status: 500 }
      )
    }

    logger.info({ userId }, 'Successfully deleted account')

    return NextResponse.json({
      message: 'Account successfully deleted',
      deletedAt: new Date().toISOString()
    })

  } catch (error) {
    logger.error({ err: error }, 'Account deletion error')
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    )
  }
}

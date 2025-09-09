import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { cookies } from 'next/headers'
import { v2 as cloudinary } from 'cloudinary'

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
    console.log(`Starting account deletion for user: ${userId}`)

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
            console.log(`Deleted video from Cloudinary: ${video.cloudinary_public_id}`)
          } catch (cloudinaryError) {
            console.error(`Failed to delete video from Cloudinary: ${video.cloudinary_public_id}`, cloudinaryError)
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
      console.error('Error deleting playthroughs:', playthroughsError)
    }

    // 3. Delete content flags reported by user
    const { error: flagsError } = await supabase
      .from('content_flags')
      .delete()
      .eq('reporter_id', userId)

    if (flagsError) {
      console.error('Error deleting content flags:', flagsError)
    }

    // 4. Delete videos (this will cascade to related data)
    const { error: videosError } = await supabase
      .from('videos')
      .delete()
      .eq('creator_id', userId)

    if (videosError) {
      console.error('Error deleting videos:', videosError)
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
      console.error('Error deleting stories:', storiesError)
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
      console.error('Error deleting user profile:', profileError)
      return NextResponse.json(
        { error: 'Failed to delete user profile' },
        { status: 500 }
      )
    }

    // 7. Delete user from Supabase Auth (this should be last)
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userId)

    if (authDeleteError) {
      console.error('Error deleting user from auth:', authDeleteError)
      return NextResponse.json(
        { error: 'Failed to delete user account' },
        { status: 500 }
      )
    }

    console.log(`Successfully deleted account for user: ${userId}`)

    return NextResponse.json({
      message: 'Account successfully deleted',
      deletedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('Account deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    )
  }
}
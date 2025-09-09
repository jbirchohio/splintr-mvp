import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { cookies } from 'next/headers'
import { 
  validateDataExportRequest, 
  getDataCategories,
  estimateExportSize 
} from '@/utils/privacy-compliance'
import { ComplianceAuditService } from '@/services/compliance-audit.service'

export async function GET(request: NextRequest) {
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

    // Validate export request
    const exportRequest = {
      userId: user.id,
      requestDate: new Date(),
      format: 'json' as const
    }

    const validation = validateDataExportRequest(exportRequest)
    if (!validation.isValid) {
      return NextResponse.json(
        { error: 'Invalid export request', details: validation.errors },
        { status: 400 }
      )
    }

    // Initialize compliance audit service
    const auditService = new ComplianceAuditService(supabase)

    // Collect all user data from different tables
    const userData = {
      exportDate: new Date().toISOString(),
      exportId: crypto.randomUUID(), // Will be updated with audit log ID
      dataCategories: getDataCategories(),
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.created_at,
        lastSignIn: user.last_sign_in_at,
        metadata: user.user_metadata
      },
      profile: null,
      stories: [],
      videos: [],
      playthroughs: [],
      contentFlags: [],
      exportMetadata: {
        totalRecords: 0,
        estimatedSize: estimateExportSize(['Account Information', 'Content Data', 'Interaction Data', 'Moderation Data']),
        complianceNote: 'This export contains all personal data associated with your Splintr account as required by GDPR Article 20 (Right to Data Portability) and CCPA Section 1798.110 (Right to Know).'
      }
    }

    // Get user profile data
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profile) {
      userData.profile = {
        name: profile.name,
        avatarUrl: profile.avatar_url,
        createdAt: profile.created_at,
        updatedAt: profile.updated_at
      }
    }

    // Get user's stories
    const { data: stories } = await supabase
      .from('stories')
      .select('*')
      .eq('creator_id', user.id)

    if (stories) {
      userData.stories = stories.map(story => ({
        id: story.id,
        title: story.title,
        description: story.description,
        isPublished: story.is_published,
        viewCount: story.view_count,
        createdAt: story.created_at,
        updatedAt: story.updated_at,
        publishedAt: story.published_at,
        storyData: story.story_data
      }))
    }

    // Get user's videos
    const { data: videos } = await supabase
      .from('videos')
      .select('*')
      .eq('creator_id', user.id)

    if (videos) {
      userData.videos = videos.map(video => ({
        id: video.id,
        originalFilename: video.original_filename,
        duration: video.duration,
        fileSize: video.file_size,
        processingStatus: video.processing_status,
        moderationStatus: video.moderation_status,
        createdAt: video.created_at,
        updatedAt: video.updated_at
      }))
    }

    // Get user's story playthroughs (as viewer)
    const { data: playthroughs } = await supabase
      .from('story_playthroughs')
      .select('*')
      .eq('viewer_id', user.id)

    if (playthroughs) {
      userData.playthroughs = playthroughs.map(playthrough => ({
        id: playthrough.id,
        storyId: playthrough.story_id,
        pathTaken: playthrough.path_taken,
        completedAt: playthrough.completed_at,
        createdAt: playthrough.created_at
      }))
    }

    // Get content flags reported by user
    const { data: flags } = await supabase
      .from('content_flags')
      .select('*')
      .eq('reporter_id', user.id)

    if (flags) {
      userData.contentFlags = flags.map(flag => ({
        id: flag.id,
        contentType: flag.content_type,
        contentId: flag.content_id,
        reason: flag.reason,
        status: flag.status,
        createdAt: flag.created_at
      }))
    }

    // Calculate total records for metadata
    userData.exportMetadata.totalRecords = 
      1 + // user record
      (userData.profile ? 1 : 0) +
      userData.stories.length +
      userData.videos.length +
      userData.playthroughs.length +
      userData.contentFlags.length

    // Log the data export for compliance audit
    const auditLog = await auditService.logDataExport(
      user.id,
      {
        format: 'json',
        dataCategories: getDataCategories().map(cat => cat.category),
        totalRecords: userData.exportMetadata.totalRecords,
        fileSizeBytes: JSON.stringify(userData).length
      },
      request
    )

    // Update export ID with audit log ID
    userData.exportId = auditLog.id

    console.log(`Data export completed for user ${user.id}: ${userData.exportMetadata.totalRecords} records exported`)

    // Return data as JSON with proper headers for download
    const response = NextResponse.json(userData)
    response.headers.set('Content-Disposition', `attachment; filename="splintr-data-export-${user.id}-${Date.now()}.json"`)
    response.headers.set('Content-Type', 'application/json')
    response.headers.set('X-Export-ID', auditLog.id)
    response.headers.set('X-Total-Records', userData.exportMetadata.totalRecords.toString())

    return response

  } catch (error) {
    console.error('Data export error:', error)
    return NextResponse.json(
      { error: 'Failed to export user data' },
      { status: 500 }
    )
  }
}
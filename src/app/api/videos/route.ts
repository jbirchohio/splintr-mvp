import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { withValidation } from '@/lib/validation-middleware'
import { withSecurity } from '@/lib/security-middleware'
import { validationSchemas } from '@/lib/validation-schemas'
import { RATE_LIMITS } from '@/lib/rate-limit'
import { sanitizeFileUpload } from '@/lib/sanitization'
import { scanBuffer } from '@/lib/antivirus'
import { Database } from '@/types/database.types'
import { logger } from '@/lib/logger'

type VideoRow = Database['public']['Tables']['videos']['Row']

// GET /api/videos - Get videos with pagination and filtering
export const GET = withSecurity(
  withValidation({
    querySchema: validationSchemas.video.videoQuery,
    requireAuth: true,
    rateLimit: RATE_LIMITS.READ
  })(async (request, { query, user }) => {
    try {
      const { 
        page = 1, 
        limit = 20, 
        creatorId, 
        status 
      } = query || {}

      const supabase = createServerClient()
      let queryBuilder = supabase
        .from('videos')
        .select(`
          id,
          original_filename,
          duration,
          file_size,
          streaming_url,
          thumbnail_url,
          processing_status,
          moderation_status,
          created_at,
          updated_at,
          users!videos_creator_id_fkey (
            id,
            name,
            avatar_url
          )
        `)

      // Apply filters
      if (creatorId) {
        queryBuilder = queryBuilder.eq('creator_id', creatorId)
      } else {
        // If no specific creator, only show user's own videos
        queryBuilder = queryBuilder.eq('creator_id', user.id)
      }

      if (status) {
        queryBuilder = queryBuilder.eq('processing_status', status)
      }

      // Apply pagination
      const offset = (page - 1) * limit
      queryBuilder = queryBuilder
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false })

      const { data: videos, error, count } = await queryBuilder

      if (error) {
        logger.error({ err: error }, 'Videos fetch error')
        return NextResponse.json(
          { error: 'Failed to fetch videos' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        videos: videos?.map(video => ({
          id: video.id,
          filename: video.original_filename,
          duration: video.duration,
          fileSize: video.file_size,
          streamingUrl: video.streaming_url,
          thumbnailUrl: video.thumbnail_url,
          processingStatus: video.processing_status,
          moderationStatus: video.moderation_status,
          createdAt: video.created_at,
          updatedAt: video.updated_at,
          creator: video.users ? {
            id: video.users.id,
            name: video.users.name,
            avatar: video.users.avatar_url
          } : null
        })) || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        }
      })
    } catch (error) {
      logger.error({ err: error }, 'Videos fetch error')
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  })
)

// POST /api/videos - Upload a new video
export const POST = withSecurity(
  withValidation({
    formSchema: validationSchemas.video.upload,
    requireAuth: true,
    rateLimit: RATE_LIMITS.UPLOAD
  })(async (request, { form, user }) => {
    try {
      const { video: file, title, description } = form

      // Additional file validation and sanitization
      const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime']
      const maxSize = 100 * 1024 * 1024 // 100MB
      
      const fileValidation = sanitizeFileUpload(file, allowedTypes, maxSize)
      if (!fileValidation.isValid) {
        return NextResponse.json(
          { 
            error: 'File validation failed',
            details: fileValidation.errors
          },
          { status: 400 }
        )
      }

      // Generate unique filename using sanitized name
      const fileExt = fileValidation.sanitizedName?.split('.').pop() || 'mp4'
      const fileName = `${user.id}-${Date.now()}.${fileExt}`
      const filePath = `videos/${fileName}`

      // Convert File to ArrayBuffer
      const arrayBuffer = await file.arrayBuffer()
      const buffer = new Uint8Array(arrayBuffer)

      const supabase = createServerClient()

      // Security: virus scan prior to upload
      const scan = await scanBuffer(buffer)
      if (!scan.clean) {
        return NextResponse.json(
          {
            error: 'File failed antivirus scan',
            details: scan.threat || 'UNKNOWN_THREAT',
          },
          { status: 400 }
        )
      }
      
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('videos')
        .upload(filePath, buffer, {
          contentType: file.type,
          upsert: false
        })

      if (uploadError) {
        logger.error({ err: uploadError }, 'Video upload error')
        return NextResponse.json(
          { error: 'Failed to upload video' },
          { status: 500 }
        )
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('videos')
        .getPublicUrl(filePath)

      // Create video record in database
      const { data: video, error: dbError } = await supabase
        .from('videos')
        .insert({
          creator_id: user.id,
          original_filename: fileValidation.sanitizedName || file.name,
          duration: 0, // Will be updated after processing
          file_size: file.size,
          streaming_url: publicUrl,
          processing_status: 'pending',
          moderation_status: 'pending'
        })
        .select()
        .single()

      if (dbError) {
        logger.error({ err: dbError }, 'Video record creation error')
        // Try to clean up uploaded file
        await supabase.storage.from('videos').remove([filePath])
        
        return NextResponse.json(
          { error: 'Failed to create video record' },
          { status: 500 }
        )
      }

      const videoRow = video as VideoRow

      // TODO: Trigger background processing job
      // This would typically involve:
      // 1. Video duration extraction
      // 2. Thumbnail generation
      // 3. Format optimization
      // 4. Content moderation scanning

      return NextResponse.json({
        video: {
          id: videoRow.id,
          filename: videoRow.original_filename,
          duration: videoRow.duration,
          fileSize: videoRow.file_size,
          streamingUrl: videoRow.streaming_url,
          thumbnailUrl: videoRow.thumbnail_url,
          processingStatus: videoRow.processing_status,
          moderationStatus: videoRow.moderation_status,
          createdAt: videoRow.created_at,
          updatedAt: videoRow.updated_at
        }
      }, { status: 201 })
    } catch (error) {
      logger.error({ err: error }, 'Video upload error')
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  })
)

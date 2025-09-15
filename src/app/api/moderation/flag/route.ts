import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { withValidation } from '@/lib/validation-middleware'
import { withSecurity } from '@/lib/security-middleware'
import { validationSchemas } from '@/lib/validation-schemas'
import { RATE_LIMITS } from '@/lib/rate-limit'
import { Database } from '@/types/database.types'
import { isAdminBySupabase } from '@/lib/auth-helpers'

type ContentFlagRow = Database['public']['Tables']['content_flags']['Row']

// POST /api/moderation/flag - Flag content for review
export const POST = withSecurity(
  withValidation({
    bodySchema: validationSchemas.moderation.flag,
    requireAuth: true,
    rateLimit: RATE_LIMITS.MODERATION
  })(async (request, { body, user }) => {
    try {
      const { contentType, contentId, reason, description } = body

      const supabase = createServerClient()

      // Verify the content exists
      let contentExists = false
      if (contentType === 'story') {
        const { data } = await supabase
          .from('stories')
          .select('id')
          .eq('id', contentId)
          .single()
        contentExists = !!data
      } else if (contentType === 'video') {
        const { data } = await supabase
          .from('videos')
          .select('id')
          .eq('id', contentId)
          .single()
        contentExists = !!data
      }

      if (!contentExists) {
        return NextResponse.json(
          { error: 'Content not found' },
          { status: 404 }
        )
      }

      // Check if user has already flagged this content
      const { data: existingFlag } = await supabase
        .from('content_flags')
        .select('id')
        .eq('content_type', contentType)
        .eq('content_id', contentId)
        .eq('reporter_id', user.id)
        .single()

      if (existingFlag) {
        return NextResponse.json(
          { error: 'You have already flagged this content' },
          { status: 409 }
        )
      }

      // Create flag record
      const { data: flag, error } = await supabase
        .from('content_flags')
        .insert({
          content_type: contentType,
          content_id: contentId,
          reporter_id: user.id,
          reason,
          description: description || null,
          status: 'pending'
        })
        .select()
        .single()

      if (error) {
        console.error('Flag creation error:', error.message)
        return NextResponse.json(
          { error: 'Failed to flag content' },
          { status: 500 }
        )
      }

      const flagRow = flag as ContentFlagRow

      // TODO: Trigger moderation workflow
      // This could involve:
      // 1. Automatic content scanning
      // 2. Adding to moderation queue
      // 3. Notifying moderators
      // 4. Temporary content hiding if multiple flags

      return NextResponse.json({
        flag: {
          id: flagRow.id,
          contentType: flagRow.content_type,
          contentId: flagRow.content_id,
          reason: flagRow.reason,
          description: flagRow.description,
          status: flagRow.status,
          createdAt: flagRow.created_at
        }
      }, { status: 201 })
    } catch (error) {
      console.error('Content flagging error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  })
)

// GET /api/moderation/flag - Get flagged content (admin only)
export const GET = withSecurity(
  withValidation({
    querySchema: validationSchemas.moderation.moderationQuery,
    requireAuth: true,
    rateLimit: RATE_LIMITS.READ
  })(async (request, { query, user }) => {
    try {
      if (!(await isAdminBySupabase(user.id))) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      
      const { 
        page = 1, 
        limit = 20, 
        status,
        contentType 
      } = query || {}

      const supabase = createServerClient()
      let queryBuilder = supabase
        .from('content_flags')
        .select(`
          id,
          content_type,
          content_id,
          reason,
          description,
          status,
          admin_notes,
          created_at,
          reviewed_at,
          users!content_flags_reporter_id_fkey (
            id,
            name,
            avatar_url
          )
        `)

      // Apply filters
      if (status) {
        queryBuilder = queryBuilder.eq('status', status)
      }

      if (contentType) {
        queryBuilder = queryBuilder.eq('content_type', contentType)
      }

      // Apply pagination
      const offset = (page - 1) * limit
      queryBuilder = queryBuilder
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false })

      const { data: flags, error, count } = await queryBuilder

      if (error) {
        console.error('Flags fetch error:', error.message)
        return NextResponse.json(
          { error: 'Failed to fetch flags' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        flags: flags?.map(flag => ({
          id: flag.id,
          contentType: flag.content_type,
          contentId: flag.content_id,
          reason: flag.reason,
          description: flag.description,
          status: flag.status,
          adminNotes: flag.admin_notes,
          createdAt: flag.created_at,
          reviewedAt: flag.reviewed_at,
          reporter: flag.users ? {
            id: flag.users.id,
            name: flag.users.name,
            avatar: flag.users.avatar_url
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
      console.error('Flags fetch error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  })
)

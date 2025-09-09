import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { withValidation } from '@/lib/validation-middleware'
import { withSecurity } from '@/lib/security-middleware'
import { validationSchemas } from '@/lib/validation-schemas'
import { RATE_LIMITS } from '@/lib/rate-limit'
import { Database } from '@/types/database.types'

type StoryRow = Database['public']['Tables']['stories']['Row']

// GET /api/feed/creator/[creatorId] - Get stories from a specific creator
export const GET = withSecurity(
  withValidation({
    querySchema: validationSchemas.feed.creatorFeed,
    paramsSchema: validationSchemas.feed.feedParams,
    rateLimit: RATE_LIMITS.READ
  })(async (request, { query, params }) => {
    try {
      const { creatorId } = params || {}
      const { 
        page = 1, 
        limit = 20 
      } = query || {}

      if (!creatorId) {
        return NextResponse.json(
          { error: 'Creator ID is required' },
          { status: 400 }
        )
      }

      const supabase = createServerClient()

      // First, verify the creator exists
      const { data: creator, error: creatorError } = await supabase
        .from('users')
        .select('id, name, avatar_url')
        .eq('id', creatorId)
        .single()

      if (creatorError || !creator) {
        return NextResponse.json(
          { error: 'Creator not found' },
          { status: 404 }
        )
      }

      // Get creator's published stories
      let queryBuilder = supabase
        .from('stories')
        .select(`
          id,
          title,
          description,
          thumbnail_url,
          view_count,
          created_at,
          updated_at,
          published_at
        `)
        .eq('creator_id', creatorId)
        .eq('is_published', true)
        .order('published_at', { ascending: false })

      // Apply pagination
      const offset = (page - 1) * limit
      queryBuilder = queryBuilder.range(offset, offset + limit - 1)

      const { data: stories, error, count } = await queryBuilder

      if (error) {
        console.error('Creator feed fetch error:', error.message)
        return NextResponse.json(
          { error: 'Failed to fetch creator stories' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        creator: {
          id: creator.id,
          name: creator.name,
          avatar: creator.avatar_url
        },
        stories: stories?.map(story => ({
          id: story.id,
          title: story.title,
          description: story.description,
          thumbnailUrl: story.thumbnail_url,
          viewCount: story.view_count,
          createdAt: story.created_at,
          updatedAt: story.updated_at,
          publishedAt: story.published_at
        })) || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        }
      })
    } catch (error) {
      console.error('Creator feed fetch error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  })
)
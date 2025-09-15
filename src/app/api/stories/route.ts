import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { withValidation } from '@/lib/validation-middleware'
import { withSecurity } from '@/lib/security-middleware'
import { validationSchemas } from '@/lib/validation-schemas'
import { RATE_LIMITS } from '@/lib/rate-limit'
import { Database } from '@/types/database.types'
import { logger } from '@/lib/logger'
import { createServerClient as createSb } from '@/lib/supabase'

type StoryRow = Database['public']['Tables']['stories']['Row']

// GET /api/stories - Get stories with pagination and filtering
export const GET = withSecurity(
  withValidation({
    querySchema: validationSchemas.story.storyQuery,
    rateLimit: RATE_LIMITS.READ
  })(async (request, { query }) => {
    try {
      const { 
        page = 1, 
        limit = 20, 
        creatorId, 
        isPublished 
      } = query || {}

      const supabase = createServerClient()
      let queryBuilder = supabase
        .from('stories')
        .select(`
          *,
          users!stories_creator_id_fkey (
            id,
            name,
            avatar_url
          )
        `)

      // Apply filters
      if (creatorId) {
        queryBuilder = queryBuilder.eq('creator_id', creatorId)
      }

      if (typeof isPublished === 'boolean') {
        queryBuilder = queryBuilder.eq('is_published', isPublished)
      }

      // Apply pagination
      const offset = (page - 1) * limit
      queryBuilder = queryBuilder
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false })

      const { data: stories, error, count } = await queryBuilder

      if (error) {
        logger.error({ err: error }, 'Stories fetch error')
        return NextResponse.json(
          { error: 'Failed to fetch stories' },
          { status: 500 }
        )
      }

      // Entitlement gating: mark locked if premium and user lacks entitlement
      const userId = (typeof (request as any).headers?.get === 'function') ? (request as any).headers.get('x-user-id') : null
      let entitledMap: Record<string, boolean> = {}
      if (userId) {
        const premiumIds = (stories || []).filter((s: any) => s.is_published && s.is_premium).map((s: any) => s.id)
        if (premiumIds.length) {
          const supabase = createSb()
          const { data: ents } = await supabase
            .from('entitlements')
            .select('story_id')
            .eq('user_id', userId)
            .in('story_id', premiumIds)
          (ents || []).forEach((e: any) => { entitledMap[e.story_id] = true })
        }
      }

      return NextResponse.json({
        stories: stories?.map(story => ({
          id: story.id,
          title: story.title,
          description: story.description,
          isPublished: story.is_published,
          isPremium: (story as any).is_premium === true,
          isLocked: (story as any).is_premium === true && !entitledMap[story.id],
          thumbnailUrl: story.thumbnail_url,
          viewCount: story.view_count,
          createdAt: story.created_at,
          updatedAt: story.updated_at,
          publishedAt: story.published_at,
          creator: story.users ? {
            id: story.users.id,
            name: story.users.name,
            avatar: story.users.avatar_url
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
      logger.error({ err: error }, 'Stories fetch error')
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  })
)

// POST /api/stories - Create a new story
export const POST = withSecurity(
  withValidation({
    bodySchema: validationSchemas.story.create,
    requireAuth: true,
    rateLimit: RATE_LIMITS.STORY_WRITE
  })(async (request, { body, user }) => {
    try {
      const { title, description, nodes } = body

      const supabase = createServerClient()

      // Validate that all referenced videos exist and belong to the user
      const videoIds = nodes.map((node: any) => node.videoId)
      const { data: videos, error: videoError } = await supabase
        .from('videos')
        .select('id, creator_id')
        .in('id', videoIds)

      if (videoError) {
        logger.error({ err: videoError }, 'Video validation error')
        return NextResponse.json(
          { error: 'Failed to validate videos' },
          { status: 500 }
        )
      }

      // Check if all videos exist and belong to the user
      const foundVideoIds = videos?.map(v => v.id) || []
      const missingVideos = videoIds.filter((id: string) => !foundVideoIds.includes(id))
      
      if (missingVideos.length > 0) {
        return NextResponse.json(
          { 
            error: 'Some videos not found',
            details: { missingVideos }
          },
          { status: 400 }
        )
      }

      const unauthorizedVideos = videos?.filter(v => v.creator_id !== user.id) || []
      if (unauthorizedVideos.length > 0) {
        return NextResponse.json(
          { error: 'You can only use your own videos in stories' },
          { status: 403 }
        )
      }

      // Generate node IDs and validate story structure
      const processedNodes = nodes.map((node: any, index: number) => ({
        id: `node_${Date.now()}_${index}`,
        videoId: node.videoId,
        choices: node.choices.map((choice: any, choiceIndex: number) => ({
          id: `choice_${Date.now()}_${index}_${choiceIndex}`,
          text: choice.text,
          nextNodeId: choice.nextNodeId
        })),
        isStartNode: node.isStartNode,
        isEndNode: node.isEndNode
      }))

      // Validate story structure (must have exactly one start node)
      const startNodes = processedNodes.filter((node: any) => node.isStartNode)
      if (startNodes.length !== 1) {
        return NextResponse.json(
          { error: 'Story must have exactly one start node' },
          { status: 400 }
        )
      }

      // Create story in database
      const { data: story, error } = await supabase
        .from('stories')
        .insert({
          creator_id: user.id,
          title,
          description,
          story_data: { nodes: processedNodes },
          is_published: false
        })
        .select()
        .single()

      if (error) {
        logger.error({ err: error }, 'Story creation error')
        return NextResponse.json(
          { error: 'Failed to create story' },
          { status: 500 }
        )
      }

      const storyRow = story as StoryRow

      return NextResponse.json({
        story: {
          id: storyRow.id,
          title: storyRow.title,
          description: storyRow.description,
          nodes: processedNodes,
          isPublished: storyRow.is_published,
          createdAt: storyRow.created_at,
          updatedAt: storyRow.updated_at
        }
      }, { status: 201 })
    } catch (error) {
      logger.error({ err: error }, 'Story creation error')
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  })
)

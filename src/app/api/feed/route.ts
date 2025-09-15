import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { withValidation } from '@/lib/validation-middleware'
import { withSecurity } from '@/lib/security-middleware'
import { validationSchemas } from '@/lib/validation-schemas'
import { RATE_LIMITS } from '@/lib/rate-limit'
import { Database } from '@/types/database.types'
import { logger } from '@/lib/logger'
import { FeedCacheService } from '@/services/cache.service'
import { cacheService, REDIS_KEYS } from '@/lib/redis'
import { isAdminBySupabase } from '@/lib/auth-helpers'

type StoryRow = Database['public']['Tables']['stories']['Row']

// GET /api/feed - Get public feed with pagination and filtering
export const GET = withSecurity(
  withValidation({
    querySchema: validationSchemas.feed.publicFeed,
    rateLimit: RATE_LIMITS.READ
  })(async (request, { query }) => {
    try {
      const { 
        page = 1, 
        limit = 20, 
        category,
        sortBy = 'newest'
      } = query || {}

      const supabase = createServerClient()
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
          published_at,
          category,
          is_premium,
          tip_enabled,
          users!stories_creator_id_fkey (
            id,
            name,
            avatar_url
          )
        `)
        .eq('is_published', true)

      // Apply category filter if provided
      if (category) {
        queryBuilder = queryBuilder.eq('category', category)
      }

      // Apply sorting
      switch (sortBy) {
        case 'popular':
          queryBuilder = queryBuilder.order('view_count', { ascending: false })
          break
        case 'trending':
          // TODO: Implement trending algorithm based on recent views/engagement
          queryBuilder = queryBuilder
            .order('view_count', { ascending: false })
            .order('created_at', { ascending: false })
          break
        case 'newest':
        default:
          queryBuilder = queryBuilder.order('published_at', { ascending: false })
          break
      }

      // Apply pagination
      const offset = (page - 1) * limit
      queryBuilder = queryBuilder.range(offset, offset + limit - 1)

      const { data: stories, error, count } = await queryBuilder

      if (error) {
        logger.error({ err: error }, 'Feed fetch error')
        return NextResponse.json(
          { error: 'Failed to fetch feed' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        stories: stories?.map(story => ({
          id: story.id,
          title: story.title,
          description: story.description,
          thumbnailUrl: story.thumbnail_url,
          viewCount: story.view_count,
          category: (story as any).category || null,
          isPremium: (story as any).is_premium || false,
          tipEnabled: (story as any).tip_enabled || false,
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
        },
        meta: {
          sortBy,
          category: category || null
        }
      })
    } catch (error) {
      logger.error({ err: error }, 'Feed fetch error')
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  })
)

// POST /api/feed/refresh - Refresh feed cache (admin only)
export const POST = withSecurity(
  withValidation({
    requireAuth: true,
    rateLimit: {
      windowMs: 5 * 60 * 1000, // 5 minutes
      maxRequests: 1 // Only 1 refresh per 5 minutes
    }
  })(async (request, { user }) => {
    try {
      if (!(await isAdminBySupabase(user.id))) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      // Invalidate feed caches and set last refresh timestamp
      const feedCache = new FeedCacheService()
      await feedCache.invalidateAllFeeds()
      await cacheService.set(REDIS_KEYS.FEED_LAST_REFRESH, new Date().toISOString(), 3600)

      return NextResponse.json({
        message: 'Feed cache refresh initiated',
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      logger.error({ err: error }, 'Feed refresh error')
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  })
)

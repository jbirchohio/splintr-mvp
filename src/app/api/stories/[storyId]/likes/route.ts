import { NextRequest, NextResponse } from 'next/server'
import { withSecurity } from '@/lib/security-middleware'
import { withValidation } from '@/lib/validation-middleware'
import { validationSchemas } from '@/lib/validation-schemas'
import { createServerClient } from '@/lib/supabase'

// GET: like stats for a story and whether current user liked
export const GET = withSecurity(
  withValidation({ paramsSchema: validationSchemas.story.storyParams })(async (_req, { params, user }) => {
    const { storyId } = params!
    const supabase = createServerClient()

    const [{ data: countRow }, { data: likedRow }] = await Promise.all([
      supabase.from('story_like_counts').select('like_count').eq('story_id', storyId).maybeSingle(),
      user?.id
        ? supabase.from('story_likes').select('story_id').eq('story_id', storyId).eq('user_id', user.id).maybeSingle()
        : Promise.resolve({ data: null } as any)
    ])

    return NextResponse.json({
      count: countRow?.like_count || 0,
      liked: Boolean(likedRow)
    })
  })
)

// POST: toggle like
export const POST = withSecurity(
  withValidation({ paramsSchema: validationSchemas.story.storyParams, requireAuth: true })(async (_req, { params, user }) => {
    const { storyId } = params!
    const supabase = createServerClient()
    const userId = user!.id

    // check if exists
    const { data: existing } = await supabase
      .from('story_likes')
      .select('story_id')
      .eq('story_id', storyId)
      .eq('user_id', userId)
      .maybeSingle()

    if (existing) {
      await supabase.from('story_likes').delete().eq('story_id', storyId).eq('user_id', userId)
      // Log interaction
      await supabase.from('user_interactions').insert({ user_id: userId, story_id: storyId, type: 'unlike' })
    } else {
      await supabase.from('story_likes').insert({ story_id: storyId, user_id: userId })
      await supabase.from('user_interactions').insert({ user_id: userId, story_id: storyId, type: 'like' })
      // Notify story creator
      const { data: story } = await supabase.from('stories').select('creator_id').eq('id', storyId).maybeSingle()
      if (story && story.creator_id && story.creator_id !== userId) {
        await supabase.from('notifications').insert({
          user_id: story.creator_id,
          type: 'like',
          data: { storyId, actorId: userId }
        } as any)
      }
    }

    // return updated count/state
    const [{ data: countRow }, { data: likedRow }] = await Promise.all([
      supabase.from('story_like_counts').select('like_count').eq('story_id', storyId).maybeSingle(),
      supabase.from('story_likes').select('story_id').eq('story_id', storyId).eq('user_id', userId).maybeSingle()
    ])

    return NextResponse.json({
      count: countRow?.like_count || 0,
      liked: Boolean(likedRow)
    })
  })
)

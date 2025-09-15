import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth-helpers'
import { createServerClient } from '@/lib/supabase'

export const GET = withAuth(async (_req, user) => {
  const sb = createServerClient()
  // Get followed creators
  const { data: follows } = await sb.from('user_follows').select('following_id').eq('follower_id', user.id)
  const ids = (follows || []).map(f => (f as any).following_id)
  if (!ids.length) return NextResponse.json({ stories: [] })
  // Recent published stories by followed creators
  const { data: stories, error } = await sb
    .from('stories')
    .select('id, title, description, creator_id, published_at, thumbnail_url, view_count')
    .eq('is_published', true)
    .in('creator_id', ids)
    .gt('published_at', new Date(Date.now() - 7*24*3600*1000).toISOString())
    .order('published_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  // Exclude stories already viewed by user
  const storyIds = (stories || []).map(s => (s as any).id)
  let unseen = stories || []
  if (storyIds.length) {
    const { data: views } = await sb
      .from('story_playthroughs')
      .select('story_id')
      .eq('viewer_id', user.id)
      .in('story_id', storyIds)
    const seenSet = new Set((views || []).map(v => (v as any).story_id))
    unseen = (stories || []).filter(s => !seenSet.has((s as any).id))
  }
  return NextResponse.json({ stories: unseen })
})


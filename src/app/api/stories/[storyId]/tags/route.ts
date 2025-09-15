import { NextResponse } from 'next/server'
import { withSecurity } from '@/lib/security-middleware'
import { withValidation } from '@/lib/validation-middleware'
import { createServerClient } from '@/lib/supabase'

// GET: list tags for a story
export const GET = withSecurity(async (_req, { params }) => {
  const { storyId } = params as any
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('story_hashtags')
    .select('tag')
    .eq('story_id', storyId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tags: (data || []).map(r => (r as any).tag) })
})

// POST: replace tags for a story (creator only)
export const POST = withSecurity(async (req, { params, user }) => {
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { storyId } = params as any
  const body = await req.json().catch(() => ({}))
  const tags: string[] = (body?.tags || []).map((t: string) => t.trim().toLowerCase()).filter(Boolean)
  const supabase = createServerClient()
  // verify creator
  const { data: story } = await supabase.from('stories').select('creator_id').eq('id', storyId).maybeSingle()
  if (!story || story.creator_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  // sync tags
  if (tags.length > 0) {
    const rows = tags.map(tag => ({ tag }))
    await supabase.from('hashtags').upsert(rows as any)
  }
  await supabase.from('story_hashtags').delete().eq('story_id', storyId)
  if (tags.length > 0) {
    await supabase.from('story_hashtags').insert(tags.map(tag => ({ story_id: storyId, tag })) as any)
  }
  return NextResponse.json({ ok: true })
})


import { NextResponse } from 'next/server'
import { withSecurity } from '@/lib/security-middleware'
import { createServerClient } from '@/lib/supabase'

// PATCH: set or clear scheduled publish timestamp (creator only)
export const PATCH = withSecurity(async (req, { params, user }) => {
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { storyId } = params as any
  const { scheduledAt } = await req.json().catch(() => ({}))
  const supabase = createServerClient()
  const { data: story } = await supabase.from('stories').select('creator_id').eq('id', storyId).maybeSingle()
  if (!story || story.creator_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { error } = await supabase.from('stories').update({ scheduled_publish_at: scheduledAt || null, is_published: false }).eq('id', storyId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
})


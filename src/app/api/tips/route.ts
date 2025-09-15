import { NextResponse } from 'next/server'
import { withSecurity } from '@/lib/security-middleware'
import { createServerClient } from '@/lib/supabase'

export const POST = withSecurity(async (req, { user }) => {
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { storyId, amount } = await req.json()
  if (!storyId) return NextResponse.json({ error: 'Missing storyId' }, { status: 400 })
  const supabase = createServerClient()
  await (supabase as any).from('user_interactions' as any).insert({ user_id: user.id, story_id: storyId, type: 'tip', value: amount || null })
  const { data: story } = await supabase.from('stories').select('creator_id').eq('id', storyId).maybeSingle()
  if (story?.creator_id && story.creator_id !== user.id) {
    await supabase.from('notifications').insert({ user_id: story.creator_id, type: 'tip', data: { actorId: user.id, storyId, amount } } as any)
  }
  return NextResponse.json({ ok: true })
})

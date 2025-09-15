import { NextResponse } from 'next/server'
import { withSecurity } from '@/lib/security-middleware'
import { createServerClient } from '@/lib/supabase'

// GET: list notifications for current user (unread first)
export const GET = withSecurity(async (_req, { user }) => {
  if (!user) return NextResponse.json({ notifications: [] })
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('notifications')
    .select('id, type, data, is_read, created_at')
    .eq('user_id', user.id)
    .order('is_read', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const unreadCount = (data || []).filter(n => !n.is_read).length
  return NextResponse.json({ notifications: data || [], unreadCount })
})

// PATCH: mark notifications as read (all or list)
export const PATCH = withSecurity(async (req, { user }) => {
  if (!user) return NextResponse.json({ ok: true })
  const supabase = createServerClient()
  const body = await req.json().catch(() => ({}))
  const ids: string[] | undefined = body?.ids
  let q = supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id)
  if (ids && ids.length > 0) q = q.in('id', ids)
  const { error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
})


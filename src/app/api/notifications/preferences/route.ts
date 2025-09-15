import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth-helpers'
import { createServerClient } from '@/lib/supabase'

export const POST = withAuth(async (req: NextRequest, user) => {
  const { startHour, endHour, timezone } = await req.json() as { startHour?: number; endHour?: number; timezone?: string }
  const sb = createServerClient()
  const row = { user_id: user.id, preferred_hour_start: startHour ?? 18, preferred_hour_end: endHour ?? 22, timezone: timezone || null }
  const { error } = await sb.from('notification_preferences').upsert(row, { onConflict: 'user_id' })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
})


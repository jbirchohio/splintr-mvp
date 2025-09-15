import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth-helpers'
import { createServerClient } from '@/lib/supabase'

export const POST = withAuth(async (req: NextRequest, user) => {
  try {
    const { token, platform } = await req.json() as { token: string; platform: 'ios' | 'android' }
    if (!token || !platform) return NextResponse.json({ error: 'Invalid' }, { status: 400 })
    const sb = createServerClient()
    const { error } = await sb.from('native_push_tokens').upsert({ user_id: user.id, token, platform }, { onConflict: 'platform,token' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed' }, { status: 400 })
  }
})


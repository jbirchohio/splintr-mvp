import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth-helpers'
import { createServerClient } from '@/lib/supabase'

export const POST = withAuth(async (req: NextRequest, user) => {
  try {
    const body = await req.json() as { endpoint: string; keys: { p256dh: string; auth: string } }
    if (!body?.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
    }
    const supabase = createServerClient()
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({ user_id: user.id, endpoint: body.endpoint, p256dh: body.keys.p256dh, auth: body.keys.auth }, { onConflict: 'endpoint' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Subscribe failed' }, { status: 400 })
  }
})


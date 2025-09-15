import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth-helpers'
import { createServerClient } from '@/lib/supabase'

async function sendFCM(tokens: string[], title: string, body: string, data?: Record<string, any>) {
  const key = process.env.FCM_SERVER_KEY
  if (!key) throw new Error('FCM_SERVER_KEY missing')
  const payload = {
    registration_ids: tokens,
    notification: { title, body },
    data: data || {},
    priority: 'high'
  }
  const res = await fetch('https://fcm.googleapis.com/fcm/send', {
    method: 'POST',
    headers: { 'Authorization': `key=${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`FCM error ${res.status}: ${JSON.stringify(json)}`)
  return json
}

export const POST = withAuth(async (req: NextRequest, user) => {
  try {
    const body = await req.json() as { userId?: string; token?: string; title?: string; body?: string; data?: Record<string, any> }
    const targetUser = body.userId || user.id
    const title = body.title || 'Test Notification'
    const message = body.body || 'Hello from Splintr'
    const sb = createServerClient()
    let tokens: string[] = []
    if (body.token) {
      tokens = [body.token]
    } else {
      const { data, error } = await sb.from('native_push_tokens').select('token').eq('user_id', targetUser)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      tokens = (data || []).map((r: any) => r.token)
    }
    if (!tokens.length) return NextResponse.json({ sent: 0, error: 'No tokens' }, { status: 400 })
    const result = await sendFCM(tokens, title, message, body.data)
    return NextResponse.json({ sent: tokens.length, result })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to send' }, { status: 400 })
  }
})


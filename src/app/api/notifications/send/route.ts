import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import webpush from 'web-push'

function initVAPID() {
  const publicKey = process.env.VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const mail = process.env.VAPID_SUBJECT || 'mailto:admin@example.com'
  if (!publicKey || !privateKey) throw new Error('VAPID keys missing')
  webpush.setVapidDetails(mail, publicKey, privateKey)
}

export async function POST(req: NextRequest) {
  try {
    const adminKey = req.headers.get('x-admin-key')
    if (!adminKey || adminKey !== process.env.ADMIN_API_KEY) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { userId, title, body, url } = await req.json() as { userId: string; title: string; body: string; url?: string }
    if (!userId || !title) return NextResponse.json({ error: 'userId and title required' }, { status: 400 })
    initVAPID()
    const supabase = createServerClient()
    const { data: subs, error } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', userId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const payload = JSON.stringify({ title, body, data: { url: url || '/' } })
    const results = [] as any[]
    for (const s of subs || []) {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } } as any, payload)
        results.push({ endpoint: s.endpoint, ok: true })
      } catch (err: any) {
        results.push({ endpoint: s.endpoint, ok: false, error: String(err?.statusCode || err?.message || 'fail') })
      }
    }
    return NextResponse.json({ results })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Send failed' }, { status: 400 })
  }
}


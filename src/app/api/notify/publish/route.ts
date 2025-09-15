import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const adminKey = req.headers.get('x-admin-key')
    if (!adminKey || adminKey !== process.env.ADMIN_API_KEY) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { storyId, title, url } = await req.json() as { storyId: string; title: string; url: string }
    const sb = createServerClient()
    // Find creator and followers
    const { data: story } = await sb.from('stories').select('creator_id').eq('id', storyId).single()
    const creatorId = (story as any)?.creator_id
    if (!creatorId) return NextResponse.json({ error: 'Story not found' }, { status: 404 })
    const { data: followers } = await sb.from('user_follows').select('follower_id').eq('following_id', creatorId)
    const followerIds = (followers || []).map(f => (f as any).follower_id)
    if (!followerIds.length) return NextResponse.json({ sent: 0 })
    // Send web push via existing send endpoint per user
    const results: any[] = []
    for (const uid of followerIds) {
      try {
        await fetch(`${process.env.NEXTAUTH_URL || ''}/api/notifications/send`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-key': process.env.ADMIN_API_KEY || '' }, body: JSON.stringify({ userId: uid, title: 'New story', body: title, url }) })
        results.push({ userId: uid, ok: true })
      } catch { results.push({ userId: uid, ok: false }) }
    }
    return NextResponse.json({ sent: results.filter(r => r.ok).length })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed' }, { status: 400 })
  }
}


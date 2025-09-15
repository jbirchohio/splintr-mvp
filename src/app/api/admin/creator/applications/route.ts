import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const adminKey = req.headers.get('x-admin-key')
  if (!adminKey || adminKey !== process.env.ADMIN_API_KEY) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const sb = createServerClient()
  const { data, error } = await sb.from('creator_applications').select('id, user_id, bio, links, status, created_at, reviewed_at')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ applications: data || [] })
}

export async function POST(req: NextRequest) {
  const adminKey = req.headers.get('x-admin-key')
  if (!adminKey || adminKey !== process.env.ADMIN_API_KEY) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, action } = await req.json() as { id: string; action: 'approve' | 'reject' }
  const sb = createServerClient()
  const status = action === 'approve' ? 'approved' : 'rejected'
  const { error } = await sb.from('creator_applications').update({ status, reviewed_at: new Date().toISOString() }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  if (action === 'approve') {
    const { data: app } = await sb.from('creator_applications').select('user_id').eq('id', id).single()
    if (app?.user_id) {
      await sb.from('users').update({ is_creator: true }).eq('id', app.user_id)
    }
  }
  return NextResponse.json({ ok: true })
}


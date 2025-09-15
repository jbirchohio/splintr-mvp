import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

type Body = { userId: string; verified: boolean }

export async function POST(req: Request) {
  try {
    const adminKey = req.headers.get('x-admin-key')
    if (!adminKey || adminKey !== process.env.ADMIN_API_KEY) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = (await req.json()) as Body
    if (!body.userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })
    const supabase = createServerClient()
    const { error } = await supabase.from('users').update({ is_verified: !!body.verified }).eq('id', body.userId)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to update verification' }, { status: 400 })
  }
}


import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth-helpers'
import { createServerClient } from '@/lib/supabase'

export const POST = withAuth(async (req: NextRequest, user) => {
  try {
    const { bio, links } = await req.json() as { bio: string; links?: string[] }
    if (!bio || bio.length < 20) return NextResponse.json({ error: 'Bio too short' }, { status: 400 })
    const sb = createServerClient()
    const { data: existing } = await sb.from('creator_applications').select('id,status').eq('user_id', user.id).maybeSingle()
    if (existing && existing.status === 'pending') return NextResponse.json({ error: 'Application already pending' }, { status: 400 })
    const { error } = await sb.from('creator_applications').insert({ user_id: user.id, bio, links: links || [] })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to apply' }, { status: 400 })
  }
})


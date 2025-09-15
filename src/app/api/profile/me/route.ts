import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth-helpers'
import { createServerClient } from '@/lib/supabase'

export const GET = withAuth(async (_req, user) => {
  const sb = createServerClient()
  const { data, error } = await sb.from('users').select('id, name, avatar_url, bio, link_url').eq('id', user.id).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ profile: { id: data.id, name: (data as any).name, avatarUrl: (data as any).avatar_url, bio: (data as any).bio, link: (data as any).link_url } })
})

export const POST = withAuth(async (req: NextRequest, user) => {
  try {
    const { bio, link } = await req.json() as { bio?: string; link?: string }
    const sb = createServerClient()
    const { error } = await sb.from('users').update({ bio: bio ?? null, link_url: link ?? null }).eq('id', user.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed' }, { status: 400 })
  }
})


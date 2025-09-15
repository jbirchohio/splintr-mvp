import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth-helpers'
import { createServerClient } from '@/lib/supabase'

export const POST = withAuth(async (req: NextRequest, _user) => {
  try {
    const { emails, consent } = await req.json() as { emails?: string[]; consent?: boolean }
    if (!consent) return NextResponse.json({ error: 'Consent required' }, { status: 400 })
    if (!Array.isArray(emails) || emails.length === 0) return NextResponse.json({ matches: [] })
    const sb = createServerClient()
    const lower = emails.map(e => String(e).trim().toLowerCase()).filter(Boolean)
    const { data, error } = await sb.from('users').select('id, name, avatar_url, email').in('email', lower)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const matches = (data || []).map(u => ({ id: (u as any).id, name: (u as any).name, avatar: (u as any).avatar_url }))
    return NextResponse.json({ matches })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed' }, { status: 400 })
  }
})

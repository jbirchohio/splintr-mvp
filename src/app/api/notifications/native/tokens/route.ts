import { withAuth } from '@/lib/auth-helpers'
import { createServerClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export const GET = withAuth(async (_req, user) => {
  const sb = createServerClient()
  const { data, error } = await sb
    .from('native_push_tokens')
    .select('platform, token, updated_at')
    .eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tokens: data || [] })
})


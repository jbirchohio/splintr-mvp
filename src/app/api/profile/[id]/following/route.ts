import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const sb = createServerClient()
  const { data, error } = await sb
    .from('user_follows')
    .select('following_id, users:following_id(id, name, avatar_url, is_verified)')
    .eq('follower_id', params.id)
    .order('following_id', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const following = (data || []).map((r: any) => ({ id: r.users?.id, name: r.users?.name, avatar: r.users?.avatar_url, verified: r.users?.is_verified }))
  return NextResponse.json({ following })
}


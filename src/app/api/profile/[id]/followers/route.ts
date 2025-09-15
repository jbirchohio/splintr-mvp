import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const sb = createServerClient()
  const { data, error } = await sb
    .from('user_follows')
    .select('follower_id, users:follower_id(id, name, avatar_url, is_verified)')
    .eq('following_id', params.id)
    .order('follower_id', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const followers = (data || []).map((r: any) => ({ id: r.users?.id, name: r.users?.name, avatar: r.users?.avatar_url, verified: r.users?.is_verified }))
  return NextResponse.json({ followers })
}


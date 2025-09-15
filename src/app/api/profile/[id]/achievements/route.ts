import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const sb = createServerClient()
  const { data, error } = await sb
    .from('user_achievements')
    .select('earned_at, achievements:achievement_id(code, name, description, icon)')
    .eq('user_id', params.id)
    .order('earned_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const achievements = (data || []).map((r: any) => ({ code: r.achievements?.code, name: r.achievements?.name, description: r.achievements?.description, icon: r.achievements?.icon, earnedAt: r.earned_at }))
  return NextResponse.json({ achievements })
}


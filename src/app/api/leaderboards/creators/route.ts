import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET() {
  try {
    const sb = createServerClient()
    const { data, error } = await sb
      .from('stories')
      .select('creator_id, view_count, users:creator_id(id, name, avatar_url)')
      .eq('is_published', true)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const map = new Map<string, { id: string; name: string; avatar: string | null; views: number }>()
    for (const s of data || []) {
      const id = (s as any).creator_id
      const u = (s as any).users
      const entry = map.get(id) || { id, name: u?.name || 'Unknown', avatar: u?.avatar_url || null, views: 0 }
      entry.views += Number((s as any).view_count || 0)
      map.set(id, entry)
    }
    const leaders = Array.from(map.values()).sort((a,b) => b.views - a.views).slice(0, 50)
    return NextResponse.json({ leaders })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed' }, { status: 500 })
  }
}


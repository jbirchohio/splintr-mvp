import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const userId = params.id
  const sb = createServerClient()
  const { data, error } = await sb
    .from('stories')
    .select('id, title, thumbnail_url, view_count, is_published, is_premium, published_at')
    .eq('creator_id', userId)
    .eq('is_published', true)
    .order('published_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const stories = (data || []).map((s: any) => ({
    id: s.id,
    title: s.title,
    thumbnailUrl: s.thumbnail_url,
    views: Number(s.view_count || 0),
    isPremium: !!s.is_premium,
    publishedAt: s.published_at
  }))
  return NextResponse.json({ stories })
}


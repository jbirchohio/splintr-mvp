import { NextResponse } from 'next/server'
import { recommendationsService } from '@/lib/recommendations/for-you'
import { createServerClient } from '@/lib/supabase'

export async function GET() {
  try {
    const [creators, stories] = await Promise.all([
      recommendationsService.trendingCreators(10),
      (async () => {
        const sb = createServerClient()
        const { data } = await sb.rpc('get_trending_stories', { days_back: 7, limit_count: 10 })
        return data || []
      })()
    ])
    return NextResponse.json({ creators, stories })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed' }, { status: 500 })
  }
}


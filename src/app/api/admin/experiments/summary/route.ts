import { NextResponse } from 'next/server'
import { withSecurity } from '@/lib/security-middleware'
import { createServerClient } from '@/lib/supabase'

// Simple summary of feed exposure counts per variant by day
export const GET = withSecurity(async (_req, { user }) => {
  // For now, allow any signed-in user; tighten later if needed
  const supabase = createServerClient()
  // Cast to any for tables not present in generated Database types yet
  const { data, error } = await (supabase as any)
    .from('feed_exposures' as any)
    .select('variant, created_at' as any)
    .gte('created_at', new Date(Date.now() - 30*24*3600*1000).toISOString())
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const counts: Record<string, Record<string, number>> = {}
  for (const row of (data as any[]) || []) {
    const d = new Date((row as any).created_at as any).toISOString().slice(0,10)
    const v = ((row as any).variant as any) || 'A'
    counts[d] = counts[d] || { A: 0, B: 0 }
    counts[d][v] = (counts[d][v] || 0) + 1
  }
  return NextResponse.json({ counts })
})

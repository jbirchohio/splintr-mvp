import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET() {
  try {
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('brand_campaigns')
      .select('id, title, brief, budget_usd_cents, status, created_at')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ campaigns: data || [] })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to load campaigns' }, { status: 500 })
  }
}


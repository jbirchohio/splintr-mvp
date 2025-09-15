import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const adminKey = req.headers.get('x-admin-key')
  if (!adminKey || adminKey !== process.env.ADMIN_API_KEY) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = createServerClient()
  const { data, error } = await supabase.from('provider_configs').select('*')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ providers: data || [] })
}

export async function POST(req: NextRequest) {
  const adminKey = req.headers.get('x-admin-key')
  if (!adminKey || adminKey !== process.env.ADMIN_API_KEY) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json() as { provider: string; mode?: 'test'|'live'; enabled?: boolean }
  if (!body.provider) return NextResponse.json({ error: 'provider required' }, { status: 400 })
  const supabase = createServerClient()
  const { error } = await supabase
    .from('provider_configs')
    .upsert({ provider: body.provider, mode: body.mode || 'test', enabled: body.enabled ?? true }, { onConflict: 'provider' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}


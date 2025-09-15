import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

type Body = { title: string; brief: string; budgetUsdCents: number; status?: 'open' | 'closed' }

export async function POST(req: Request) {
  try {
    const adminKey = req.headers.get('x-admin-key')
    if (!adminKey || adminKey !== process.env.ADMIN_API_KEY) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = (await req.json()) as Body
    if (!body.title || !body.brief || !body.budgetUsdCents) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('brand_campaigns')
      .insert({ title: body.title, brief: body.brief, budget_usd_cents: Math.floor(body.budgetUsdCents), status: body.status || 'open' })
      .select('id')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ id: data.id })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to create campaign' }, { status: 400 })
  }
}


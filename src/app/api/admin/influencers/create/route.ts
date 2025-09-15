import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const adminKey = req.headers.get('x-admin-key')
  if (!adminKey || adminKey !== process.env.ADMIN_API_KEY) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { userId, promoCode, payoutRatePpm } = await req.json() as { userId: string; promoCode: string; payoutRatePpm?: number }
  if (!userId || !promoCode) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  const sb = createServerClient()
  const { error } = await sb.from('influencer_partners').insert({ user_id: userId, promo_code: promoCode, payout_rate_ppm: payoutRatePpm ?? 100000 })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}


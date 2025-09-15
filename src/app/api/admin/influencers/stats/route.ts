import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET() {
  const sb = createServerClient()
  const { data: partners, error } = await sb.from('influencer_partners').select('user_id, promo_code, payout_rate_ppm')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  // Join with referral_attributions as a naive performance metric
  const results: any[] = []
  for (const p of partners || []) {
    const { count } = await sb.from('referral_attributions').select('*', { count: 'exact', head: true }).eq('referrer_user_id', (p as any).user_id)
    results.push({ userId: (p as any).user_id, promoCode: (p as any).promo_code, referrals: count || 0, payoutRatePpm: (p as any).payout_rate_ppm })
  }
  return NextResponse.json({ partners: results })
}


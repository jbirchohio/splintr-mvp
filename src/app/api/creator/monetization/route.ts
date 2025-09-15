import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth-helpers'
import { walletService } from '@/lib/payments/wallet'
import { earningsService } from '@/lib/payments/earnings'
import { createServerClient } from '@/lib/supabase'

export const GET = withAuth(async (_req, user) => {
  try {
    const supabase = createServerClient()
    const [wallet, earnings, gifts] = await Promise.all([
      walletService.getOrCreate(user.id),
      earningsService.getSummary(user.id),
      supabase.from('gift_transactions').select('coins_spent, diamonds_earned, created_at').eq('creator_id', user.id).order('created_at', { ascending: false }).limit(50)
    ])
    const giftData = (gifts.data || [])
    const coinsTotal = giftData.reduce((s: number, g: any) => s + Number(g.coins_spent || 0), 0)
    const diamondsTotal = giftData.reduce((s: number, g: any) => s + Number(g.diamonds_earned || 0), 0)
    return NextResponse.json({
      walletBalance: wallet.coin_balance,
      earnings,
      recentGifts: giftData,
      aggregates: { coinsTotal, diamondsTotal }
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to load monetization data' }, { status: 500 })
  }
})


import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth-helpers'
import { walletService } from '@/lib/payments/wallet'

export const GET = withAuth(async (_req, user) => {
  try {
    const wallet = await walletService.getOrCreate(user.id)
    return NextResponse.json({ balance: wallet.coin_balance })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to load wallet' }, { status: 500 })
  }
})


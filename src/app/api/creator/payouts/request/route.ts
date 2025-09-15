import { withAuth } from '@/lib/auth-helpers'
import { NextResponse } from 'next/server'
import { earningsService } from '@/lib/payments/earnings'

export const POST = withAuth(async (_req, user) => {
  try {
    const result = await earningsService.requestPayout(user.id)
    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Payout request failed' }, { status: 400 })
  }
})


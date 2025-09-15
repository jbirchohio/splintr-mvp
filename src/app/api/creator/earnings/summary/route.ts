import { withAuth } from '@/lib/auth-helpers'
import { NextResponse } from 'next/server'
import { earningsService } from '@/lib/payments/earnings'

export const GET = withAuth(async (_req, user) => {
  try {
    const summary = await earningsService.getSummary(user.id)
    return NextResponse.json(summary)
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to load earnings' }, { status: 500 })
  }
})


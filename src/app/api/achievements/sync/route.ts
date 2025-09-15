import { withAuth } from '@/lib/auth-helpers'
import { NextResponse } from 'next/server'
import { achievementService } from '@/lib/gamification/achievements'

export const POST = withAuth(async (_req, user) => {
  try {
    const res = await achievementService.evaluateAndAward(user.id)
    return NextResponse.json(res)
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed' }, { status: 500 })
  }
})


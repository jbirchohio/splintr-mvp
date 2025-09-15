import { withAuth } from '@/lib/auth-helpers'
import { NextResponse } from 'next/server'
import { challengeService } from '@/lib/gamification/challenges'

export const GET = withAuth(async (_req, user) => {
  try {
    const data = await challengeService.getToday(user.id)
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed' }, { status: 500 })
  }
})


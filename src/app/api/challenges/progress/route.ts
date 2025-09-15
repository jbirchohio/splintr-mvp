import { withAuth } from '@/lib/auth-helpers'
import { NextResponse } from 'next/server'
import { challengeService } from '@/lib/gamification/challenges'

export const POST = withAuth(async (_req, user) => {
  try {
    await challengeService.recordProgress(user.id, 'playthrough')
    await challengeService.bumpStreak(user.id)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed' }, { status: 500 })
  }
})


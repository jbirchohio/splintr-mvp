import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth-helpers'
import { recommendationsService } from '@/lib/recommendations/for-you'

export const GET = withAuth(async (_req: NextRequest, user) => {
  try {
    const items = await recommendationsService.forUser(user.id, 20)
    return NextResponse.json({ items })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed' }, { status: 500 })
  }
})


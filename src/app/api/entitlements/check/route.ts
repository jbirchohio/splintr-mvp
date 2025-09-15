import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth-helpers'
import { entitlementsService } from '@/lib/payments/entitlements'

export const GET = withAuth(async (req: NextRequest, user) => {
  try {
    const { searchParams } = new URL(req.url)
    const storyId = searchParams.get('storyId')
    if (!storyId) return NextResponse.json({ error: 'Missing storyId' }, { status: 400 })
    const entitled = await entitlementsService.hasEntitlement(user.id, storyId)
    return NextResponse.json({ entitled })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Check failed' }, { status: 500 })
  }
})


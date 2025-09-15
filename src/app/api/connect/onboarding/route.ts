import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth-helpers'
import { connectService } from '@/lib/payments/connect'

export const POST = withAuth(async (req: NextRequest, user) => {
  try {
    const { origin } = new URL(req.url)
    const url = await connectService.onboardingLink(user.id, `${origin}/creator/monetization`)
    return NextResponse.json({ url })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to create onboarding link' }, { status: 500 })
  }
})


import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth-helpers'
import { entitlementsService } from '@/lib/payments/entitlements'

type Body = {
  storyId: string
  priceCoins: number
}

export const POST = withAuth(async (req, user) => {
  try {
    const body = (await req.json()) as Body
    if (!body?.storyId || !body?.priceCoins) {
      return NextResponse.json({ error: 'Missing storyId or priceCoins' }, { status: 400 })
    }
    const price = Math.max(0, Math.floor(body.priceCoins))
    if (price <= 0) return NextResponse.json({ error: 'priceCoins must be > 0' }, { status: 400 })

    // If already entitled, no-op
    const already = await entitlementsService.hasEntitlement(user.id, body.storyId)
    if (already) return NextResponse.json({ ok: true, already: true })

    // Enforce entitlement in feed/viewer is expected by client; this endpoint commits entitlement purchase
    await entitlementsService.purchaseEntitlementWithCoins(user.id, body.storyId, price)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    const msg = e?.message || 'Failed to purchase entitlement'
    const status = msg.includes('Insufficient') ? 402 : 500
    return NextResponse.json({ error: msg }, { status })
  }
})

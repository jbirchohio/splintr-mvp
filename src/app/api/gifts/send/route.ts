import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth-helpers'
import { giftsService } from '@/lib/payments/gifts'

type Body = { creatorId: string; storyId?: string; giftCode: string; quantity?: number }

export const POST = withAuth(async (req, user) => {
  try {
    const body = (await req.json()) as Body
    if (!body.creatorId || !body.giftCode) return NextResponse.json({ error: 'Missing creatorId or giftCode' }, { status: 400 })
    await giftsService.sendGift({ senderId: user.id, creatorId: body.creatorId, storyId: body.storyId, giftCode: body.giftCode, quantity: body.quantity })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    const msg = e.message || 'Failed to send gift'
    const status = msg.includes('Velocity limit') ? 429 : (msg.includes('Insufficient') ? 402 : 500)
    return NextResponse.json({ error: msg }, { status })
  }
})


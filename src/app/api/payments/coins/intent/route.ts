import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth-helpers'
import { stripe } from '@/lib/payments/stripe'

type Body = { amountCoins: number; currency?: string }

export const POST = withAuth(async (req, user) => {
  try {
    const body = (await req.json()) as Body
    const coins = Math.max(0, Math.floor(body?.amountCoins || 0))
    if (!coins) return NextResponse.json({ error: 'amountCoins must be > 0' }, { status: 400 })
    const currency = (body?.currency || 'USD').toLowerCase()

    // Simple pricing: 100 coins = $0.99 (example). Adjust as needed and/or fetch from config.
    const unitPriceUsdCentsPer100 = 99
    const amountInCents = Math.ceil((coins / 100) * unitPriceUsdCentsPer100)

    const intent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency,
      metadata: {
        userId: user.id,
        amountCoins: String(coins),
      },
      automatic_payment_methods: { enabled: true },
    })
    return NextResponse.json({ clientSecret: intent.client_secret, intentId: intent.id })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to create payment intent' }, { status: 500 })
  }
})


import { NextRequest, NextResponse } from 'next/server'
import { stripe, getStripeWebhookSecret } from '@/lib/payments/stripe'
import { createServerClient } from '@/lib/supabase'

export const POST = async (req: NextRequest) => {
  try {
    const rawBody = await req.text()
    const signature = req.headers.get('stripe-signature')
    const secret = getStripeWebhookSecret('connect')
    if (!signature) return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    let event
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, secret)
    } catch (err: any) {
      return NextResponse.json({ error: `Invalid signature: ${err.message}` }, { status: 400 })
    }

    const supabase = createServerClient()
    switch (event.type) {
      case 'transfer.created': {
        const tr = event.data.object as any
        await supabase.from('payouts').update({ status: 'processing' }).eq('provider_payout_id', tr.id)
        break
      }
      case 'transfer.updated':
      case 'transfer.reversed': {
        const tr = event.data.object as any
        await supabase.from('payouts').update({ status: 'failed' }).eq('provider_payout_id', tr.id)
        break
      }
      default:
        break
    }

    return NextResponse.json({ received: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Webhook error' }, { status: 500 })
  }
}


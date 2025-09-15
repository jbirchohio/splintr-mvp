import { NextRequest, NextResponse } from 'next/server'
import { stripe, getStripeWebhookSecret } from '@/lib/payments/stripe'
import { createServerClient } from '@/lib/supabase'
import { walletService } from '@/lib/payments/wallet'
import { ledger } from '@/lib/payments/ledger'
import { logger } from '@/lib/logger'
import { cacheService, CacheTTL } from '@/lib/redis'

export const POST = async (req: NextRequest) => {
  try {
    const rawBody = await req.text()
    const signature = req.headers.get('stripe-signature')
    const secret = getStripeWebhookSecret('payments')
    if (!signature) {
      logger.warn('Stripe webhook: missing signature')
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    }

    let event
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, secret)
    } catch (err: any) {
      logger.warn({ err }, 'Stripe webhook: invalid signature')
      return NextResponse.json({ error: `Invalid signature: ${err.message}` }, { status: 400 })
    }

    const supabase = createServerClient()

    // Log event
    await supabase.from('webhook_events').insert({ provider: 'stripe', event_type: event.type, payload: event })

    // Replay guard using Redis (idempotency per event.id)
    const eventId = (event as any).id as string | undefined
    if (eventId) {
      const replayKey = `webhook:stripe:event:${eventId}`
      const locked = await cacheService.setLock(replayKey, CacheTTL.DAY)
      if (!locked) {
        logger.info({ eventId }, 'Stripe webhook replay detected; ignoring')
        return NextResponse.json({ received: true, replay: true })
      }
    }

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object as any
        const userId = pi.metadata?.userId as string | undefined
        const amountCoins = Number(pi.metadata?.amountCoins || 0)
        if (!userId || !amountCoins) break

        // Idempotency: ensure we only insert once
        const providerPaymentId = pi.id as string
        const { data: existing } = await supabase
          .from('psp_payments')
          .select('id, status')
          .eq('provider', 'stripe')
          .eq('provider_payment_id', providerPaymentId)
          .maybeSingle()
        if (existing && existing.status === 'succeeded') break

        if (!existing) {
          const { error: insErr } = await supabase.from('psp_payments').insert({
            user_id: userId,
            provider: 'stripe',
            provider_payment_id: providerPaymentId,
            status: 'succeeded',
            amount: pi.amount_received,
            currency: pi.currency?.toUpperCase() || 'USD',
            description: 'Coin purchase (Stripe)',
            coins_credited: amountCoins
          })
          if (insErr) throw new Error(insErr.message)
        } else {
          const { error: upErr } = await supabase.from('psp_payments')
            .update({ status: 'succeeded', coins_credited: amountCoins })
            .eq('id', existing.id)
          if (upErr) throw new Error(upErr.message)
        }

        await walletService.creditCoins(userId, amountCoins, {
          referenceType: 'psp',
          referenceId: providerPaymentId,
          metadata: { provider: 'stripe' }
        })
        break
      }
      case 'charge.refunded': {
        const charge = event.data.object as any
        const piId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id
        if (!piId) break
        // Mark payment refunded and reverse coins via ledger compensation if applicable
        const { data: payment } = await createServerClient()
          .from('psp_payments')
          .select('id, user_id, coins_credited, refunded_coins')
          .eq('provider', 'stripe')
          .eq('provider_payment_id', piId)
          .maybeSingle()
        if (!payment) break

        // Record refund status
        await createServerClient().from('psp_payments').update({ status: 'refunded' }).eq('id', payment.id)

        // Attempt to reverse unspent coins up to coins_credited - refunded_coins
        const coinsCredited = Number(payment.coins_credited || 0)
        const coinsAlreadyRefunded = Number(payment.refunded_coins || 0)
        const remainingCoinsToReverse = Math.max(0, coinsCredited - coinsAlreadyRefunded)
        if (remainingCoinsToReverse > 0) {
          // Fetch wallet
          const sb = createServerClient()
          const { data: wallet } = await sb.from('wallets').select('id, coin_balance').eq('user_id', payment.user_id).maybeSingle()
          const toReverse = Math.min(remainingCoinsToReverse, Number(wallet?.coin_balance || 0))
          if (toReverse > 0) {
            // Debit user's coins (remove), relieve platform negative from refund
            const { walletService } = await import('@/lib/payments/wallet')
            await walletService.debitCoins(payment.user_id, toReverse, { referenceType: 'refund', referenceId: piId, metadata: { reason: 'charge_refunded' } })
            await sb.from('psp_payments').update({ refunded_coins: coinsAlreadyRefunded + toReverse }).eq('id', payment.id)
          }
        }

        // Create a reversing entry in ledger for cash refund
        await ledger.record([
          { account: 'platform_refund_expense', debit: charge.amount_refunded, currency: (charge.currency || 'usd').toUpperCase() },
          { account: 'platform_cash', credit: charge.amount_refunded, currency: (charge.currency || 'usd').toUpperCase() },
        ])
        break
      }
      case 'charge.dispute.created': {
        const dispute = event.data.object as any
        // Track dispute in ledger
        await ledger.record([
          { account: 'platform_dispute_reserve', debit: dispute.amount, currency: (dispute.currency || 'usd').toUpperCase() },
          { account: 'platform_cash', credit: dispute.amount, currency: (dispute.currency || 'usd').toUpperCase() },
        ])
        break
      }
      default:
        break
    }
    return NextResponse.json({ received: true })
  } catch (e: any) {
    logger.error({ err: e }, 'Stripe webhook processing error')
    return NextResponse.json({ error: e.message || 'Webhook error' }, { status: 500 })
  }
}

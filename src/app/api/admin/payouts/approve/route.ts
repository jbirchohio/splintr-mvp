import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { stripe } from '@/lib/payments/stripe'
import { ledger } from '@/lib/payments/ledger'

export async function POST(req: NextRequest) {
  const adminKey = req.headers.get('x-admin-key')
  if (!adminKey || adminKey !== process.env.ADMIN_API_KEY) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json() as { payoutId: string }
  if (!body.payoutId) return NextResponse.json({ error: 'payoutId required' }, { status: 400 })

  const supabase = createServerClient()
  const { data: payout, error } = await supabase
    .from('payouts')
    .select('id, user_id, amount, currency, status')
    .eq('id', body.payoutId)
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  if (payout.status !== 'pending_review') return NextResponse.json({ error: 'Payout not pending review' }, { status: 400 })

  const { data: acctRow, error: acctErr } = await supabase
    .from('creator_accounts')
    .select('provider_account_id, payouts_enabled')
    .eq('user_id', payout.user_id)
    .single()
  if (acctErr) return NextResponse.json({ error: acctErr.message }, { status: 400 })
  if (!acctRow.payouts_enabled) return NextResponse.json({ error: 'Payouts disabled' }, { status: 400 })

  // Perform transfer
  const tr = await stripe.transfers.create({
    amount: payout.amount,
    currency: payout.currency.toLowerCase(),
    destination: acctRow.provider_account_id,
    metadata: { creatorId: payout.user_id, payoutId: payout.id }
  })

  await supabase.from('payouts').update({ status: 'processing', provider_payout_id: tr.id }).eq('id', payout.id)

  // Ledger: move USD payable to cash
  await ledger.record([
    { account: `creator_payout_payable:${payout.user_id}`, userId: payout.user_id, debit: payout.amount, currency: payout.currency, referenceType: 'payout', referenceId: payout.id },
    { account: 'platform_cash', credit: payout.amount, currency: payout.currency, referenceType: 'payout', referenceId: payout.id },
  ])

  return NextResponse.json({ ok: true, transferId: tr.id })
}


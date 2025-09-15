import { createServerClient } from '@/lib/supabase'
import { conversionService } from './conversion'
import { stripe } from './stripe'
import { ledger } from './ledger'

export class EarningsService {
  async getSummary(creatorId: string) {
    const supabase = createServerClient()
    // Sum DIAMOND credits - debits for creator earnings account
    const { data, error } = await supabase
      .from('ledger_entries')
      .select('credit, debit, currency')
      .eq('account', `creator_earnings:${creatorId}`)
    if (error) throw new Error(error.message)
    let diamonds = 0
    for (const row of data || []) {
      if (row.currency === 'DIAMOND') {
        diamonds += Number(row.credit || 0)
        diamonds -= Number(row.debit || 0)
      }
    }
    const usdCents = await conversionService.diamondsToUSD(Math.max(0, diamonds))
    // Pending payouts from payouts table
    const { data: payouts } = await supabase
      .from('payouts')
      .select('status, amount, currency, created_at')
      .eq('user_id', creatorId)
      .order('created_at', { ascending: false })
    return { diamondsBalance: Math.max(0, diamonds), estUsdCents: usdCents, payouts: payouts || [] }
  }

  async requestPayout(creatorId: string) {
    const supabase = createServerClient()
    // Get diamonds balance
    const summary = await this.getSummary(creatorId)
    const diamonds = summary.diamondsBalance
    if (diamonds <= 0) throw new Error('No earnings available')
    const usdCents = await conversionService.diamondsToUSD(diamonds)
    if (usdCents < 100) throw new Error('Minimum payout is $1.00')

    // Record payout for review
    const { data: payout, error: pErr } = await supabase
      .from('payouts')
      .insert({ user_id: creatorId, provider: 'stripe_connect', status: 'pending_review', amount: usdCents, currency: 'USD' })
      .select('id')
      .single()
    if (pErr) throw new Error(pErr.message)

    // Ledger: reduce creator diamonds and create USD payable
    await ledger.record([
      { account: `creator_earnings:${creatorId}`, userId: creatorId, debit: diamonds, currency: 'DIAMOND', referenceType: 'payout', referenceId: payout.id },
      { account: `creator_payout_payable:${creatorId}`, userId: creatorId, credit: usdCents, currency: 'USD', referenceType: 'payout', referenceId: payout.id },
    ])
    return { payoutId: payout.id }
  }
}

export const earningsService = new EarningsService()

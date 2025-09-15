import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth-helpers'
import { createServerClient } from '@/lib/supabase'
import { stripe } from '@/lib/payments/stripe'

export const GET = withAuth(async (_req, user) => {
  try {
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('creator_accounts')
      .select('provider_account_id, requirements_due, details_submitted, payouts_enabled')
      .eq('user_id', user.id)
      .maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ exists: false })
    const acct = await stripe.accounts.retrieve(data.provider_account_id)
    return NextResponse.json({
      exists: true,
      payoutsEnabled: !!acct.payouts_enabled,
      detailsSubmitted: !!acct.details_submitted,
      requirementsDue: acct.requirements?.currently_due || [],
      tosAcceptance: acct.tos_acceptance,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to fetch status' }, { status: 500 })
  }
})


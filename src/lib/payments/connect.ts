import { stripe } from './stripe'
import { createServerClient } from '@/lib/supabase'

export class ConnectService {
  async ensureAccount(userId: string): Promise<{ accountId: string }> {
    const supabase = createServerClient()
    const { data: existing } = await supabase
      .from('creator_accounts')
      .select('provider_account_id')
      .eq('user_id', userId)
      .maybeSingle()
    if (existing?.provider_account_id) return { accountId: existing.provider_account_id }

    const acct = await stripe.accounts.create({
      type: 'express',
      country: 'US',
      capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
      business_type: 'individual',
      metadata: { userId },
    })
    const { error } = await supabase.from('creator_accounts').insert({
      user_id: userId,
      provider: 'stripe_connect',
      provider_account_id: acct.id,
      requirements_due: (acct.requirements?.currently_due?.length || 0) > 0,
      details_submitted: !!acct.details_submitted,
      payouts_enabled: !!acct.payouts_enabled,
    })
    if (error) throw new Error(error.message)
    return { accountId: acct.id }
  }

  async onboardingLink(userId: string, returnUrl: string): Promise<string> {
    const { accountId } = await this.ensureAccount(userId)
    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: returnUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    })
    return link.url
  }

  async refreshAccountStatus(userId: string) {
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('creator_accounts')
      .select('provider_account_id')
      .eq('user_id', userId)
      .single()
    if (error) throw new Error(error.message)
    const acct = await stripe.accounts.retrieve(data.provider_account_id)
    await supabase
      .from('creator_accounts')
      .update({
        requirements_due: (acct.requirements?.currently_due?.length || 0) > 0,
        details_submitted: !!acct.details_submitted,
        payouts_enabled: !!acct.payouts_enabled,
      })
      .eq('user_id', userId)
  }
}

export const connectService = new ConnectService()


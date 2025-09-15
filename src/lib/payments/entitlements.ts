import { createServerClient } from '@/lib/supabase'
import { walletService } from './wallet'

export class EntitlementsService {
  async hasEntitlement(userId: string, storyId: string, type: string = 'premium_unlock') {
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('entitlements')
      .select('id, expires_at')
      .eq('user_id', userId)
      .eq('story_id', storyId)
      .eq('entitlement_type', type)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) return false
    if (data.expires_at && new Date(data.expires_at) < new Date()) return false
    return true
  }

  async grantEntitlement(userId: string, storyId: string, type: string = 'premium_unlock', source: string = 'purchase') {
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('entitlements')
      .insert({ user_id: userId, story_id: storyId, entitlement_type: type, source })
      .select('id')
      .single()
    if (error) throw new Error(error.message)
    return data
  }

  async purchaseEntitlementWithCoins(userId: string, storyId: string, priceCoins: number) {
    // Debit coins, then grant entitlement
    await walletService.debitCoins(userId, priceCoins, {
      referenceType: 'entitlement',
      referenceId: storyId,
      metadata: { purpose: 'premium_unlock' },
    })
    await this.grantEntitlement(userId, storyId, 'premium_unlock', 'purchase')
  }
}

export const entitlementsService = new EntitlementsService()


import { createServerClient } from '@/lib/supabase'
import { walletService } from './wallet'
import { ledger } from './ledger'
import { conversionService } from './conversion'
import { createClient as createRedisClient } from 'redis'

const REDIS_URL = process.env.REDIS_URL

async function getRedis() {
  if (!REDIS_URL) throw new Error('REDIS_URL required for velocity limits')
  const client = createRedisClient({ url: REDIS_URL })
  if (!client.isOpen) await client.connect()
  return client
}

export class GiftsService {
  async listActive() {
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('gifts')
      .select('*')
      .eq('is_active', true)
      .order('price_coins', { ascending: true })
    if (error) throw new Error(error.message)
    return data || []
  }

  private async checkVelocity(senderId: string, coins: number) {
    const redis = await getRedis()
    const nowBucket = Math.floor(Date.now() / 1000)
    const perSecondKey = `gift:ps:${senderId}:${nowBucket}`
    const perHourKey = `gift:ph:${senderId}:${Math.floor(nowBucket / 3600)}`
    const sec = await redis.incrBy(perSecondKey, coins)
    await redis.expire(perSecondKey, 2)
    const hour = await redis.incrBy(perHourKey, coins)
    await redis.expire(perHourKey, 3600 + 60)
    if (sec > 5000) throw new Error('Velocity limit exceeded (per-second)')
    if (hour > 1_000_000) throw new Error('Velocity limit exceeded (per-hour)')
  }

  async sendGift(params: { senderId: string; creatorId: string; storyId?: string; giftCode: string; quantity?: number }) {
    const supabase = createServerClient()
    const qty = Math.max(1, Math.floor(params.quantity || 1))
    // Lookup gift
    const { data: gift, error } = await supabase
      .from('gifts')
      .select('id, code, price_coins, diamond_value')
      .eq('code', params.giftCode)
      .eq('is_active', true)
      .single()
    if (error || !gift) throw new Error('Invalid gift')

    const coinsToSpend = Number(gift.price_coins) * qty
    await this.checkVelocity(params.senderId, coinsToSpend)

    // Debit sender coins
    await walletService.debitCoins(params.senderId, coinsToSpend, {
      referenceType: 'gift',
      referenceId: String(gift.id),
      metadata: { qty, to: params.creatorId, storyId: params.storyId }
    })

    // Convert to diamonds for creator
    const diamondsTotal = Number(gift.diamond_value) * qty
    const ppm = 200000 // 20% platform fee
    const platformShare = Math.floor((diamondsTotal * ppm) / 1_000_000)
    const creatorDiamonds = diamondsTotal - platformShare

    // Ledger: relieve coin liability, credit creator diamonds, credit platform revenue
    await ledger.record([
      // Coins spent relieve platform coin liability
      { account: 'platform_coin_liability', credit: coinsToSpend, currency: 'COIN', referenceType: 'gift', referenceId: String(gift.id) },
      // Creator earnings in DIAMOND
      { account: `creator_earnings:${params.creatorId}`, userId: params.creatorId, credit: creatorDiamonds, currency: 'DIAMOND', referenceType: 'gift', referenceId: String(gift.id) },
      // Platform revenue in DIAMOND for remaining share (we keep in DIAMOND until conversion)
      { account: 'platform_revenue', credit: platformShare, currency: 'DIAMOND', referenceType: 'gift', referenceId: String(gift.id) }
    ])

    // Record transaction row
    const { error: txErr } = await supabase.from('gift_transactions').insert({
      gift_id: gift.id,
      sender_id: params.senderId,
      creator_id: params.creatorId,
      story_id: params.storyId || null,
      quantity: qty,
      coins_spent: coinsToSpend,
      diamonds_earned: creatorDiamonds,
      platform_fee_ppm: ppm,
    })
    if (txErr) throw new Error(txErr.message)
  }

  async diamondsToUsdCents(diamonds: number) {
    return conversionService.diamondsToUSD(diamonds)
  }
}

export const giftsService = new GiftsService()


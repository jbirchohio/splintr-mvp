import { createServerClient } from '@/lib/supabase'
import { ledger } from './ledger'

const PLATFORM_COIN_ACCOUNT = 'platform_coin_liability'

export type Wallet = {
  id: string
  user_id: string
  coin_balance: number
}

export class WalletService {
  private accountForUser(userId: string) {
    return `user_coin_wallet:${userId}`
  }

  async getOrCreate(userId: string): Promise<Wallet> {
    const supabase = createServerClient()
    let { data: wallet, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) throw new Error(error.message)
    if (!wallet) {
      const { data, error: insertErr } = await supabase
        .from('wallets')
        .insert({ user_id: userId, coin_balance: 0 })
        .select('*')
        .single()
      if (insertErr) throw new Error(insertErr.message)
      wallet = data as any
    }
    return wallet as unknown as Wallet
  }

  // Optimistic concurrency update with retry
  private async applyDelta(walletId: string, expectedBalance: number, delta: number): Promise<boolean> {
    const supabase = createServerClient()
    const newBalance = expectedBalance + delta
    if (newBalance < 0) return false
    const { error, count } = await supabase
      .from('wallets')
      .update({ coin_balance: newBalance })
      .eq('id', walletId)
      .eq('coin_balance', expectedBalance)
      .select('id', { count: 'exact', head: true })
    if (error) throw new Error(error.message)
    return (count || 0) > 0
  }

  async creditCoins(userId: string, amount: number, opts?: { referenceType?: string; referenceId?: string; metadata?: Record<string, any>; txId?: string }) {
    const amt = Math.max(0, Math.floor(amount))
    if (amt <= 0) throw new Error('Amount must be positive')

    // Update balance with retries
    const wallet = await this.getOrCreate(userId)
    let success = await this.applyDelta(wallet.id, wallet.coin_balance, amt)
    if (!success) {
      // refetch and retry up to 3 times
      for (let i = 0; i < 3 && !success; i++) {
        const latest = await this.getOrCreate(userId)
        success = await this.applyDelta(latest.id, latest.coin_balance, amt)
      }
      if (!success) throw new Error('Concurrent wallet update failed')
    }

    // Record ledger: platform liability decreases, user wallet increases (credit user)
    await ledger.record([
      { account: this.accountForUser(userId), userId, credit: amt, currency: 'COIN', referenceType: opts?.referenceType, referenceId: opts?.referenceId, metadata: opts?.metadata },
      { account: PLATFORM_COIN_ACCOUNT, debit: amt, currency: 'COIN', referenceType: opts?.referenceType, referenceId: opts?.referenceId, metadata: opts?.metadata },
    ], opts?.txId)
  }

  async debitCoins(userId: string, amount: number, opts?: { referenceType?: string; referenceId?: string; metadata?: Record<string, any>; txId?: string }) {
    const amt = Math.max(0, Math.floor(amount))
    if (amt <= 0) throw new Error('Amount must be positive')

    // Update balance with retries
    let latest = await this.getOrCreate(userId)
    if (latest.coin_balance < amt) throw new Error('Insufficient balance')
    let success = await this.applyDelta(latest.id, latest.coin_balance, -amt)
    if (!success) {
      for (let i = 0; i < 3 && !success; i++) {
        latest = await this.getOrCreate(userId)
        if (latest.coin_balance < amt) throw new Error('Insufficient balance')
        success = await this.applyDelta(latest.id, latest.coin_balance, -amt)
      }
      if (!success) throw new Error('Concurrent wallet update failed')
    }

    // Record ledger: user wallet decreases (debit user), platform liability increases
    await ledger.record([
      { account: this.accountForUser(userId), userId, debit: amt, currency: 'COIN', referenceType: opts?.referenceType, referenceId: opts?.referenceId, metadata: opts?.metadata },
      { account: PLATFORM_COIN_ACCOUNT, credit: amt, currency: 'COIN', referenceType: opts?.referenceType, referenceId: opts?.referenceId, metadata: opts?.metadata },
    ], opts?.txId)
  }
}

export const walletService = new WalletService()


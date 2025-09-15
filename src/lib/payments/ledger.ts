import { createServerClient } from '@/lib/supabase'

export type LedgerEntry = {
  account: string
  userId?: string
  currency?: string // default COIN
  debit?: number
  credit?: number
  referenceType?: string
  referenceId?: string
  metadata?: Record<string, any>
}

export class LedgerEngine {
  async record(entries: LedgerEntry[], txId?: string): Promise<{ txId: string }> {
    if (!entries || entries.length < 2) {
      throw new Error('Ledger requires at least two entries (double-entry)')
    }

    let totalDebit = 0
    let totalCredit = 0
    for (const e of entries) {
      if (!e.account) throw new Error('Ledger entry missing account')
      const debit = Math.max(0, Math.floor(e.debit || 0))
      const credit = Math.max(0, Math.floor(e.credit || 0))
      if (debit > 0 && credit > 0) throw new Error('Entry cannot have both debit and credit')
      totalDebit += debit
      totalCredit += credit
    }
    if (totalDebit !== totalCredit) {
      throw new Error('Debits and credits must balance')
    }

    const supabase = createServerClient()
    const transactionId = txId || crypto.randomUUID()
    const rows = entries.map(e => ({
      tx_id: transactionId,
      account: e.account,
      user_id: e.userId ?? null,
      currency: e.currency || 'COIN',
      debit: Math.max(0, Math.floor(e.debit || 0)),
      credit: Math.max(0, Math.floor(e.credit || 0)),
      reference_type: e.referenceType ?? null,
      reference_id: e.referenceId ?? null,
      metadata: e.metadata ?? {},
    }))

    const { error } = await supabase.from('ledger_entries').insert(rows)
    if (error) throw new Error(`Ledger insert failed: ${error.message}`)
    return { txId: transactionId }
  }
}

export const ledger = new LedgerEngine()


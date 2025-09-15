import { createServerClient } from '@/lib/supabase'

export class ConversionService {
  private cache: Record<string, number> = {}
  private key(from: string, to: string) { return `${from}->${to}` }

  async rate(from: string, to: string): Promise<number> {
    const k = this.key(from, to)
    if (this.cache[k]) return this.cache[k]
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from('conversion_rates')
      .select('rate')
      .eq('from_unit', from)
      .eq('to_unit', to)
      .maybeSingle()
    if (error || !data) throw new Error(`Missing conversion rate ${from}->${to}`)
    this.cache[k] = Number(data.rate)
    return this.cache[k]
  }

  async coinsToDiamonds(coins: number): Promise<number> {
    const r = await this.rate('COIN', 'DIAMOND')
    return Math.floor(coins * r)
  }

  async diamondsToUSD(diamonds: number): Promise<number> {
    const r = await this.rate('DIAMOND', 'USD')
    return Math.floor(diamonds * r * 100) // returns cents
  }
}

export const conversionService = new ConversionService()


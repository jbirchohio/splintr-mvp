"use client"
import { useEffect, useState } from 'react'

export default function MonetizationPage() {
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const [mon, st] = await Promise.all([
          fetch('/api/creator/monetization').then(r => r.json().then(j => ({ ok: r.ok, j }))),
          fetch('/api/connect/status').then(r => r.json().then(j => ({ ok: r.ok, j }))).catch(() => ({ ok: false, j: null }))
        ])
        if (!mon.ok) throw new Error(mon.j.error || 'Failed')
        setData({ ...mon.j, connectStatus: st.j || null })
      } catch (e: any) {
        setError(e.message)
      }
    })()
  }, [])

  if (error) return <div className="p-6">Error: {error}</div>
  if (!data) return <div className="p-6">Loading...</div>

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Monetization</h1>
      <section className="space-y-2">
        <div>Wallet Balance (Coins): <b>{data.walletBalance}</b></div>
        <div>Diamonds Balance: <b>{data.earnings.diamondsBalance}</b></div>
        <div>Estimated USD: <b>${(data.earnings.estUsdCents/100).toFixed(2)}</b></div>
      </section>
      {data.connectStatus && (
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Stripe Connect</h2>
          <div>Payouts enabled: {String(data.connectStatus.payoutsEnabled)}</div>
          <div>Details submitted: {String(data.connectStatus.detailsSubmitted)}</div>
          {data.connectStatus.requirementsDue?.length > 0 && (
            <div className="text-red-600">Requirements due: {data.connectStatus.requirementsDue.join(', ')}</div>
          )}
        </section>
      )}
      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Recent Gifts</h2>
        <div>Coins total: {data.aggregates.coinsTotal} | Diamonds total: {data.aggregates.diamondsTotal}</div>
        <ul className="space-y-1">
          {data.recentGifts.map((g: any, i: number) => (
            <li key={i} className="text-sm text-gray-600">{new Date(g.created_at).toLocaleString()} — +{g.diamonds_earned} diamonds ({g.coins_spent} coins)</li>
          ))}
        </ul>
      </section>
      <form onSubmit={async (e) => {
        e.preventDefault()
        setError(null)
        try {
          const res = await fetch('/api/creator/payouts/request', { method: 'POST' })
          const json = await res.json()
          if (!res.ok) throw new Error(json.error || 'Payout failed')
          alert('Payout requested')
        } catch (err: any) {
          setError(err.message)
        }
      }}>
        <button type="submit" className="px-4 py-2 bg-black text-white rounded">Request Payout</button>
      </form>
    </div>
  )
}

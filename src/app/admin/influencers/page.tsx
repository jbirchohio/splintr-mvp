"use client"
import { useEffect, useState } from 'react'

export default function InfluencersAdminPage() {
  const [partners, setPartners] = useState<any[]>([])
  const [userId, setUserId] = useState('')
  const [promo, setPromo] = useState('')
  const [rate, setRate] = useState(100000)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    try {
      const res = await fetch('/api/admin/influencers/stats')
      const json = await res.json()
      if (res.ok) setPartners(json.partners || [])
    } catch {}
  }
  useEffect(() => { load() }, [])

  const create = async () => {
    try {
      setError(null)
      const res = await fetch('/api/admin/influencers/create', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-key': process.env.NEXT_PUBLIC_ADMIN_KEY || '' }, body: JSON.stringify({ userId, promoCode: promo, payoutRatePpm: rate }) })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed')
      setUserId(''); setPromo(''); setRate(100000)
      await load()
    } catch (e: any) { setError(e.message) }
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Influencer Partners</h1>
      {error && <div className="text-sm text-red-600">{error}</div>}
      <div className="border rounded p-3 space-y-2">
        <div className="font-medium">Create Partner</div>
        <div className="flex gap-2 items-center text-sm">
          <input className="border rounded p-2 flex-1" placeholder="User ID" value={userId} onChange={e=>setUserId(e.target.value)} />
          <input className="border rounded p-2" placeholder="PROMO" value={promo} onChange={e=>setPromo(e.target.value)} />
          <input className="border rounded p-2 w-28" type="number" value={rate} onChange={e=>setRate(parseInt(e.target.value||'100000'))} />
          <button className="px-3 py-1 bg-black text-white rounded" onClick={create}>Create</button>
        </div>
      </div>
      <div className="grid gap-3">
        {partners.map(p => (
          <div key={p.promoCode} className="border rounded p-3 text-sm flex justify-between">
            <div>
              <div className="font-medium">{p.promoCode}</div>
              <div className="text-xs text-gray-600">User: {p.userId} • Referrals: {p.referrals} • Rate: {p.payoutRatePpm} ppm</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}


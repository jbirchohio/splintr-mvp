import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function ExperimentsDashboard() {
  const [data, setData] = useState<Record<string, { A: number; B: number }>>({})
  const [loading, setLoading] = useState(true)
  const [override, setOverride] = useState<string | ''>('')
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const res = await fetch('/api/admin/experiments/summary')
      const json = await res.json()
      setData(json.counts || {})
      setLoading(false)
    }
    load()
  }, [])
  const days = Object.keys(data).sort()
  const totalA = days.reduce((sum, d) => sum + (data[d]?.A || 0), 0)
  const totalB = days.reduce((sum, d) => sum + (data[d]?.B || 0), 0)
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-2xl font-bold mb-4">Experiments Summary</h1>
      <div className="mb-4 flex items-center gap-2">
        <label className="text-sm">Force variant (local device only):</label>
        <select value={override} onChange={(e) => setOverride(e.target.value)} className="border rounded px-2 py-1 text-sm">
          <option value="">None</option>
          <option value="A">A</option>
          <option value="B">B</option>
        </select>
        <button className="text-sm bg-blue-600 text-white rounded px-2 py-1" onClick={() => { if (override) localStorage.setItem('variantOverride', override); else localStorage.removeItem('variantOverride') }}>Apply</button>
      </div>
      {loading ? (
        <div>Loading…</div>
      ) : (
        <>
          <div className="mb-4">Total exposures — Variant A: <b>{totalA}</b>, Variant B: <b>{totalB}</b></div>
          <table className="w-full max-w-xl text-sm bg-white rounded shadow">
            <thead>
              <tr className="text-left border-b"><th className="py-2 px-3">Date</th><th className="py-2 px-3">A</th><th className="py-2 px-3">B</th></tr>
            </thead>
            <tbody>
              {days.map(d => (
                <tr key={d} className="border-b"><td className="py-1 px-3">{d}</td><td className="py-1 px-3">{data[d].A}</td><td className="py-1 px-3">{data[d].B}</td></tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}

export async function getServerSideProps(context: any) {
  const token = context.req.cookies['sb-access-token'] || context.req.headers.authorization?.replace('Bearer ', '') || ''
  if (!token) return { redirect: { destination: '/auth/signin?redirect=/admin/experiments', permanent: false } }
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user || (data.user as any).app_metadata?.role !== 'admin') {
    return { redirect: { destination: '/auth/signin?redirect=/admin/experiments', permanent: false } }
  }
  return { props: {} }
}

import React, { useEffect, useMemo, useState } from 'react'

type ConfigRow = { key: string; variant: string; data: any; active: boolean; updated_at: string }

export default function RecsAdminPage() {
  const [configs, setConfigs] = useState<ConfigRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<{ key: string; variant: string } | null>(null)
  const [json, setJson] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/recs/config')
      const data = await res.json()
      setConfigs(data.configs || [])
    } catch (e: any) {
      setError(e.message || 'Failed to load configs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (!selected) { setJson(''); return }
    const row = configs.find(c => c.key === selected.key && c.variant === selected.variant)
    setJson(row ? JSON.stringify(row.data, null, 2) : '{\n}\n')
  }, [selected, configs])

  const variants = useMemo(() => Array.from(new Set(configs.map(c => c.variant))).sort(), [configs])

  const save = async () => {
    if (!selected) return
    setSaving(true)
    setError(null)
    try {
      const parsed = JSON.parse(json)
      const res = await fetch('/api/recs/config', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: selected.key, variant: selected.variant, data: parsed, active: true }) })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      await load()
    } catch (e: any) {
      setError(e.message || 'Failed to save config (are you an admin?)')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Recommendations Config</h1>
      <p className="text-sm text-gray-600 mb-6">View and edit FYP weights per variant. Updates require admin privileges (server env: RECS_ADMIN_USER_IDS).</p>
      {error && <div className="mb-4 text-red-600">{error}</div>}
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <div className="mb-2 text-sm font-medium">Variants</div>
            <div className="flex gap-2 mb-4">
              {variants.map(v => (
                <button key={v} onClick={() => setSelected({ key: 'fyp_weights', variant: v })} className={`px-3 py-1 rounded ${selected?.variant === v ? 'bg-black text-white' : 'bg-gray-200'}`}>{v}</button>
              ))}
            </div>
            <div className="text-sm text-gray-600">Last updated:</div>
            <ul className="text-sm">
              {configs.filter(c => c.key === 'fyp_weights').map(c => (
                <li key={c.variant}>Variant {c.variant}: {new Date(c.updated_at).toLocaleString()}</li>
              ))}
            </ul>
          </div>
          <div className="md:col-span-2">
            {!selected ? (
              <div className="text-gray-600">Select a variant to edit.</div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium">Editing: {selected.key} / {selected.variant}</div>
                  <button disabled={saving} onClick={save} className="px-3 py-1 rounded bg-blue-600 text-white disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
                </div>
                <textarea value={json} onChange={e => setJson(e.target.value)} spellCheck={false} className="w-full h-[420px] font-mono text-sm p-3 border rounded" />
              </>
            )}
            <div className="mt-8">
              <MetricsPanel />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export async function getServerSideProps(context: any) {
  const { req } = context
  const token = req.cookies['sb-access-token'] || req.headers.authorization?.replace('Bearer ', '') || ''
  if (!token) return { redirect: { destination: '/auth/signin?redirect=/admin/recs', permanent: false } }
  const { data, error } = await (await import('@/lib/supabase')).supabase.auth.getUser(token)
  if (error || !data?.user || (data.user as any).app_metadata?.role !== 'admin') {
    return { redirect: { destination: '/auth/signin?redirect=/admin/recs', permanent: false } }
  }
  return { props: {} }
}

function MetricsPanel() {
  const [since, setSince] = useState(24)
  const [data, setData] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)
  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/recs/metrics?sinceHours=${since}`)
      const d = await res.json()
      setData(d)
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <div className="font-medium">Variant Metrics</div>
        <input type="number" min={1} max={720} value={since} onChange={e => setSince(parseInt(e.target.value || '24', 10))} className="w-20 px-2 py-1 border rounded" />
        <button onClick={load} className="px-3 py-1 rounded bg-gray-200">Refresh</button>
      </div>
      {loading ? <div>Loading...</div> : (
        <pre className="bg-gray-50 border p-3 rounded overflow-auto text-sm">{JSON.stringify(data || {}, null, 2)}</pre>
      )}
    </div>
  )
}

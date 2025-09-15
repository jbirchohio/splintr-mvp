import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'

type NodeStat = { nodeId: string; visits: number; exits: number; choices: Record<string, number> }
type TipsPoint = { date: string; amount: number }

export default function StoryAnalyticsDetailPage() {
  const router = useRouter()
  const { id } = router.query as { id?: string }
  const [data, setData] = useState<{ nodes: NodeStat[]; topPaths: Array<{ path: string[]; count: number }> } | null>(null)
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState<{ isPremium: boolean; tipEnabled: boolean; scheduledPublishAt: string | null } | null>(null)
  const [saving, setSaving] = useState(false)
  const [tips, setTips] = useState<TipsPoint[]>([])

  useEffect(() => {
    if (!id) return
    const load = async () => {
      setLoading(true)
      const [aRes, sRes, tRes] = await Promise.all([
        fetch(`/api/stories/${id}/analytics`),
        fetch(`/api/stories/${id}/settings.get`),
        fetch(`/api/stories/${id}/tips?days=60`),
      ])
      const [a, s, t] = await Promise.all([aRes.json(), sRes.json(), tRes.json()])
      setData(a)
      setSettings(s)
      setTips(t.series || [])
      setLoading(false)
    }
    load()
  }, [id])

  if (!id) return null
  if (loading) return <div className="p-6">Loading.</div>

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-2xl font-bold mb-4">Story Analytics</h1>

      {/* Settings Panel */}
      <div className="bg-white p-4 rounded shadow mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!settings?.isPremium} onChange={e => setSettings(prev => prev ? { ...prev, isPremium: e.target.checked } : prev)} />
            Premium
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!settings?.tipEnabled} onChange={e => setSettings(prev => prev ? { ...prev, tipEnabled: e.target.checked } : prev)} />
            Tips Enabled
          </label>
          <div className="flex items-center gap-2 text-sm">
            <span>Schedule:</span>
            <input type="datetime-local" value={settings?.scheduledPublishAt ? new Date(settings.scheduledPublishAt).toISOString().slice(0,16) : ''} onChange={e => setSettings(prev => prev ? { ...prev, scheduledPublishAt: e.target.value ? new Date(e.target.value).toISOString() : null } : prev)} className="border rounded px-2 py-1" />
            {settings?.scheduledPublishAt && (
              <button className="text-xs text-gray-600 underline" onClick={() => setSettings(prev => prev ? { ...prev, scheduledPublishAt: null } : prev)}>Clear</button>
            )}
          </div>
          <button disabled={saving} onClick={async () => {
            try {
              setSaving(true)
              await fetch(`/api/stories/${id}/settings`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings || {}) })
            } finally { setSaving(false) }
          }} className="ml-auto px-3 py-1.5 rounded bg-blue-600 text-white text-sm disabled:opacity-60">{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded shadow">
          <h2 className="font-semibold mb-2">Node Performance</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b"><th className="py-1">Node</th><th className="py-1">Visits</th><th className="py-1">Exits</th></tr>
            </thead>
            <tbody>
              {data?.nodes?.map((n: any) => (
                <tr key={n.nodeId} className="border-b hover:bg-gray-50">
                  <td className="py-1 font-mono text-xs">{n.nodeId}</td>
                  <td className="py-1">{n.visits}</td>
                  <td className="py-1">{n.exits}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h2 className="font-semibold mb-2">Choice CTR</h2>
          <div className="space-y-3">
            {data?.nodes?.map((n: any) => (
              <div key={n.nodeId}>
                <div className="text-xs font-mono text-gray-600 mb-1">{n.nodeId}</div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(n.choices || {}).map(([choiceId, count]: any) => (
                    <span key={choiceId} className="text-xs bg-gray-100 rounded px-2 py-1">{choiceId}: {count as number}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded shadow mt-6">
        <h2 className="font-semibold mb-2">Top Paths</h2>
        <ol className="list-decimal pl-6 space-y-1">
          {data?.topPaths?.map((p: any, idx: number) => (
            <li key={idx} className="text-sm">
              <span className="font-mono text-xs">{p.path.join(' → ')}</span>
              <span className="ml-2 text-gray-600">x{p.count}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Tips over time */}
      <div className="bg-white p-4 rounded shadow mt-6">
        <h2 className="font-semibold mb-2">Tips (last 60d)</h2>
        {tips.length === 0 ? (
          <div className="text-sm text-gray-600">No tips data.</div>
        ) : (
          <div className="w-full">
            <div className="flex items-end h-32 gap-1 border-b pb-2">
              {tips.map((pt, i) => {
                const max = Math.max(...tips.map(x => x.amount)) || 1
                const h = Math.max(2, Math.round((pt.amount / max) * 100))
                return <div key={i} title={`${pt.date}: $${pt.amount.toFixed(2)}`} style={{ height: `${h}%` }} className="w-2 bg-green-500" />
              })}
            </div>
            <div className="flex justify-between text-[10px] text-gray-500 mt-1">
              <span>{tips[0].date}</span>
              <span>{tips[tips.length - 1].date}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


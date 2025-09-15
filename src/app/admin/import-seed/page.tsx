"use client"
import { useState } from 'react'

export default function ImportSeedPage() {
  const [urls, setUrls] = useState('')
  const [category, setCategory] = useState('')
  const [log, setLog] = useState<string[]>([])
  const [busy, setBusy] = useState(false)

  const run = async () => {
    const list = urls.split(/\r?\n/).map(s => s.trim()).filter(Boolean)
    setLog([])
    setBusy(true)
    for (const url of list) {
      try {
        const res = await fetch('/api/import/video', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url, category }) })
        const json = await res.json()
        setLog(prev => [...prev, `${url} -> ${res.ok ? 'OK' : 'FAIL'} ${res.ok ? json.videoId : json.error}`])
      } catch (e: any) {
        setLog(prev => [...prev, `${url} -> FAIL ${e.message}`])
      }
    }
    setBusy(false)
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Seed Content Import</h1>
      <div className="space-y-2">
        <textarea className="w-full border rounded p-2 font-mono text-sm" rows={8} placeholder="One URL per line (YouTube supported)" value={urls} onChange={e=>setUrls(e.target.value)} />
        <div className="flex items-center gap-2">
          <input className="border rounded p-2 text-sm" placeholder="Category (optional)" value={category} onChange={e=>setCategory(e.target.value)} />
          <button disabled={busy} className="px-3 py-1 text-sm bg-black text-white rounded" onClick={run}>{busy ? 'Importing...' : 'Import'}</button>
        </div>
      </div>
      <div className="text-xs font-mono whitespace-pre-wrap">{log.join('\n')}</div>
    </div>
  )
}


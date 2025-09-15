import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'

type MyStory = { id: string; title: string; published_at: string | null }

export default function RespondPage() {
  const router = useRouter()
  const { id } = router.query as { id?: string }
  const [mine, setMine] = useState<MyStory[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [type, setType] = useState<'duet' | 'remix' | 'stitch'>('duet')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/creator/analytics')
        const data = await res.json()
        setMine((data.stories || []).map((s: any) => ({ id: s.id, title: s.title, published_at: s.publishedAt || null })))
      } catch (e: any) {
        setError(e.message || 'Failed to load your stories')
      } finally { setLoading(false) }
    }
    load()
  }, [])

  const submit = async () => {
    if (!id || !selected) return
    setError(null)
    const res = await fetch(`/api/stories/${id}/responses`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ responseStoryId: selected, type }) })
    if (res.ok) { setOk(true); setTimeout(() => router.push(`/story/${id}/play`), 800) } else { const d = await res.json().catch(()=>({})); setError(d.error || `HTTP ${res.status}`) }
  }

  if (!id) return null
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-2xl font-bold mb-4">Respond to Story</h1>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="bg-white p-4 rounded shadow max-w-2xl">
          <div className="mb-3 text-sm text-gray-600">Select one of your stories to duet/remix with this original.</div>
          <div className="mb-3">
            <label className="text-sm mr-2">Type:</label>
            <select value={type} onChange={e => setType(e.target.value as any)} className="border rounded px-2 py-1 text-sm">
              <option value="duet">Duet</option>
              <option value="remix">Remix</option>
              <option value="stitch">Stitch</option>
            </select>
          </div>
          <div className="max-h-64 overflow-auto border rounded">
            {mine.map((s) => (
              <label key={s.id} className={`flex items-center gap-3 px-3 py-2 border-b hover:bg-gray-50 ${selected === s.id ? 'bg-blue-50' : ''}`}>
                <input type="radio" name="story" checked={selected === s.id} onChange={() => setSelected(s.id)} />
                <div>
                  <div className="font-medium">{s.title}</div>
                  <div className="text-xs text-gray-500">{s.published_at ? new Date(s.published_at).toLocaleString() : 'Draft'}</div>
                </div>
              </label>
            ))}
          </div>
          {error && <div className="text-sm text-red-600 mt-3">{error}</div>}
          {ok && <div className="text-sm text-green-600 mt-3">Linked! Redirecting…</div>}
          <div className="mt-4">
            <button disabled={!selected} onClick={submit} className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-60">Create Response</button>
            <a href={`/story/${id}/play`} className="ml-3 text-sm text-gray-600 underline">Cancel</a>
          </div>
        </div>
      )}
    </div>
  )
}


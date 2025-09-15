import React, { useEffect, useState } from 'react'

export default function ChallengesPage() {
  const [list, setList] = useState<Array<any>>([])
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState<string | null>(null)
  const [myStories, setMyStories] = useState<Array<any>>([])
  const [selectedStory, setSelectedStory] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/challenges')
        const data = await res.json()
        setList(data.challenges || [])
        const sRes = await fetch('/api/creator/analytics')
        const sData = await sRes.json()
        setMyStories(sData.stories || [])
      } finally { setLoading(false) }
    }
    load()
  }, [])

  const join = async (challengeId: string) => {
    if (!selectedStory) return
    const res = await fetch(`/api/challenges/${challengeId}/join`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ storyId: selectedStory }) })
    if (res.ok) { setJoining(null); setSelectedStory(null) }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-2xl font-bold mb-4">Challenges</h1>
      {loading ? (
        <div>Loading…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((c) => (
            <div key={c.id} className="bg-white rounded-lg shadow p-4">
              <div className="text-lg font-semibold">{c.title}</div>
              {c.hashtag && <div className="text-sm text-gray-600">#{c.hashtag}</div>}
              <div className="text-sm text-gray-600 mt-1">Entries: {c.count}</div>
              <div className="mt-3">
                {joining === c.id ? (
                  <div>
                    <label className="text-sm block mb-1">Select one of your stories:</label>
                    <select className="border rounded px-2 py-1 w-full" value={selectedStory || ''} onChange={e => setSelectedStory(e.target.value)}>
                      <option value="">Select…</option>
                      {myStories.map((s: any) => (
                        <option key={s.id} value={s.id}>{s.title}</option>
                      ))}
                    </select>
                    <div className="mt-2 flex gap-2">
                      <button disabled={!selectedStory} onClick={() => join(c.id)} className="px-3 py-1.5 rounded bg-blue-600 text-white disabled:opacity-60">Join</button>
                      <button onClick={() => { setJoining(null); setSelectedStory(null) }} className="px-3 py-1.5 rounded bg-gray-200">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setJoining(c.id)} className="px-3 py-1.5 rounded bg-blue-600 text-white">Join Challenge</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


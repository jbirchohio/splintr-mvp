"use client"
import { useEffect, useState } from 'react'

export default function OnboardingPage() {
  const [steps, setSteps] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    ;(async () => {
      try {
        setLoading(true)
        const res = await fetch('/api/onboarding/steps')
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Failed')
        setSteps(json.steps || [])
      } catch (e: any) { setError(e.message) } finally { setLoading(false) }
    })()
  }, [])

  const complete = async (code: string) => {
    try {
      setError(null)
      const res = await fetch('/api/onboarding/steps', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stepCode: code }) })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed')
      setSteps(steps.map(s => s.code === code ? { ...s, completed: true } : s))
    } catch (e: any) { setError(e.message) }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Get Started</h1>
      {error && <div className="text-sm text-red-600">{error}</div>}
      {loading ? <div>Loading...</div> : (
        <ul className="space-y-3">
          {steps.map(s => (
            <li key={s.code} className="flex items-center justify-between border rounded p-3">
              <div>
                <div className="font-medium">{s.title}</div>
                {s.completed && <div className="text-xs text-green-600">Completed</div>}
              </div>
              {!s.completed && (
                <button onClick={() => complete(s.code)} className="px-3 py-1 text-xs rounded bg-black text-white">Mark Done</button>
              )}
            </li>
          ))}
        </ul>
      )}
      <section className="mt-6">
        <h2 className="text-xl font-semibold">Today’s Challenge</h2>
        <Challenges />
      </section>
    </div>
  )
}

function Challenges() {
  const [data, setData] = useState<any | null>(null)
  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/api/challenges/today')
        const json = await res.json()
        if (res.ok) setData(json)
      } catch {}
    })()
  }, [])
  if (!data) return null
  return (
    <div className="mt-2 space-y-2">
      {(data.challenges || []).map((c: any) => {
        const pr = (data.progress || []).find((p: any) => p.challenge_id === c.id)
        return (
          <div key={c.id} className="border rounded p-3 text-sm">
            <div className="font-medium">{c.title}</div>
            <div className="text-gray-600">{c.description}</div>
            <div className="text-xs mt-1">Progress: {pr?.progress || 0}{(c.criteria?.count ? `/${c.criteria.count}` : '')} {pr?.completed_at && <span className="text-green-600">(Completed)</span>}</div>
          </div>
        )
      })}
    </div>
  )
}


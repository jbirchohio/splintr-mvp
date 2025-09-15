"use client"
import { useEffect, useState } from 'react'

export default function CreatorApplicationsPage() {
  const [apps, setApps] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    try {
      setError(null)
      const res = await fetch('/api/admin/creator/applications', { headers: { 'x-admin-key': process.env.NEXT_PUBLIC_ADMIN_KEY || '' } })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed')
      setApps(json.applications || [])
    } catch (e: any) { setError(e.message) }
  }

  useEffect(() => { load() }, [])

  const act = async (id: string, action: 'approve'|'reject') => {
    try {
      const res = await fetch('/api/admin/creator/applications', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-key': process.env.NEXT_PUBLIC_ADMIN_KEY || '' }, body: JSON.stringify({ id, action }) })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed')
      await load()
    } catch (e: any) { setError(e.message) }
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Creator Applications</h1>
      {error && <div className="text-sm text-red-600">{error}</div>}
      <div className="grid gap-3">
        {apps.map(a => (
          <div key={a.id} className="border rounded p-3 text-sm flex justify-between items-center">
            <div>
              <div className="font-medium">{a.user_id}</div>
              <div className="text-gray-600">{a.bio}</div>
              <div className="text-xs">Status: {a.status}</div>
            </div>
            <div className="flex gap-2">
              {a.status === 'pending' && (
                <>
                  <button className="px-3 py-1 text-xs bg-green-600 text-white rounded" onClick={() => act(a.id, 'approve')}>Approve</button>
                  <button className="px-3 py-1 text-xs bg-red-600 text-white rounded" onClick={() => act(a.id, 'reject')}>Reject</button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}


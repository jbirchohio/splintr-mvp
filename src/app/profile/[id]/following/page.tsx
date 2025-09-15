"use client"
import { useEffect, useState } from 'react'

export default function FollowingPage({ params }: { params: { id: string } }) {
  const [list, setList] = useState<any[]>([])
  useEffect(() => { (async () => { try { const r = await fetch(`/api/profile/${params.id}/following`); const d = await r.json(); if (r.ok) setList(d.following || []) } catch {} })() }, [params.id])
  return (
    <div className="max-w-xl mx-auto p-4">
      <h1 className="text-xl font-bold mb-4">Following</h1>
      <ul className="divide-y divide-[color:var(--border)]">
        {list.map(u => (
          <li key={u.id} className="py-2 flex items-center gap-3">
            <img src={u.avatar || '/vercel.svg'} className="w-10 h-10 rounded-full object-cover" />
            <div className="flex-1">
              <div className="text-sm font-medium">{u.name} {u.verified && <span className="text-[10px] text-[color:var(--accent)]">• Verified</span>}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}


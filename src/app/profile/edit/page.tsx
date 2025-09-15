"use client"
import { useEffect, useState } from 'react'

export default function EditProfilePage() {
  const [profile, setProfile] = useState<any | null>(null)
  const [bio, setBio] = useState('')
  const [link, setLink] = useState('')
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => { (async () => { try { const r = await fetch('/api/profile/me'); const d = await r.json(); if (r.ok) { setProfile(d.profile); setBio(d.profile?.bio || ''); setLink(d.profile?.link || '') } } catch {} })() }, [])

  const save = async () => {
    try {
      setMsg(null)
      const r = await fetch('/api/profile/me', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bio, link }) })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Failed to save')
      setMsg('Saved')
    } catch (e: any) { setMsg(e.message) }
  }

  if (!profile) return <div className="p-6 text-sm text-muted">Loading...</div>
  return (
    <div className="max-w-xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Edit Profile</h1>
      <div className="space-y-2">
        <label className="text-sm">Bio</label>
        <textarea className="w-full border rounded p-2 text-sm" rows={5} placeholder="Tell people about you (emoji supported)" value={bio} onChange={e=>setBio(e.target.value)} />
      </div>
      <div className="space-y-2">
        <label className="text-sm">Link</label>
        <input className="w-full border rounded p-2 text-sm" placeholder="https://example.com" value={link} onChange={e=>setLink(e.target.value)} />
      </div>
      <div className="flex gap-2">
        <button onClick={save} className="px-4 py-2 rounded bg-[color:var(--primary-600)] text-white hover:bg-[color:var(--primary-700)]">Save</button>
        {msg && <span className="text-sm text-muted">{msg}</span>}
      </div>
    </div>
  )
}


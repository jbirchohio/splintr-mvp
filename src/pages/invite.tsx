import React, { useEffect, useState } from 'react'

export default function InvitePage() {
  const [code, setCode] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const submit = async () => {
    setMsg(null); setErr(null)
    try {
      const res = await fetch('/api/invite/claim', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`)
      setMsg('Invite accepted! Redirecting...')
      setTimeout(() => { window.location.href = '/' }, 800)
    } catch (e: any) {
      setErr(e.message || 'Failed to claim invite')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-lg shadow p-6 w-full max-w-md">
        <h1 className="text-xl font-semibold mb-2">Enter Invite Code</h1>
        <p className="text-sm text-gray-600 mb-4">This beta requires an invite code. If you were referred, ensure you visited using your referral link and logged in.</p>
        <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="8-char code" className="w-full border rounded px-3 py-2 mb-3 font-mono" />
        <button onClick={submit} className="w-full bg-blue-600 text-white rounded px-3 py-2">Submit</button>
        {msg && <div className="mt-3 text-green-600 text-sm">{msg}</div>}
        {err && <div className="mt-3 text-red-600 text-sm">{err}</div>}
      </div>
    </div>
  )
}


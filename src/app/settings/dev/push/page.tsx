"use client"
import { useEffect, useState } from 'react'
import { registerNativePush } from '@/lib/native/push'
import { notFound } from 'next/navigation'

function DevPushInner() {
  const [tokens, setTokens] = useState<{ platform: string; token: string; updated_at: string }[]>([])
  const [msg, setMsg] = useState<string | null>(null)
  const load = async () => {
    try {
      const r = await fetch('/api/notifications/native/tokens')
      const d = await r.json()
      if (r.ok) setTokens(d.tokens || [])
    } catch {}
  }
  useEffect(() => { load() }, [])

  const register = async () => {
    try { await registerNativePush(); await load(); setMsg('Registered') } catch (e: any) { setMsg(e.message || 'Failed') }
  }
  const send = async (token?: string) => {
    try {
      const body: any = { title: 'Test Push', body: 'Hello from Splintr Dev' }
      if (token) body.token = token
      const r = await fetch('/api/notifications/native/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const d = await r.json()
      setMsg(r.ok ? `Sent to ${d.sent}` : (d.error || 'Send failed'))
    } catch (e: any) { setMsg(e.message || 'Error') }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Native Push Test</h1>
      <div className="flex gap-2">
        <button className="px-3 py-1.5 rounded bg-[color:var(--primary-600)] text-white" onClick={register}>Register Token</button>
        <button className="px-3 py-1.5 rounded border" onClick={() => send()}>Send Test (all tokens)</button>
      </div>
      {msg && <div className="text-sm text-muted">{msg}</div>}
      <div className="mt-4">
        <h2 className="text-lg font-semibold mb-2">Tokens</h2>
        <ul className="text-xs space-y-2">
          {tokens.map((t,i) => (
            <li key={i} className="break-all">
              <div className="font-mono">[{t.platform}] {t.token}</div>
              <button className="text-[color:var(--primary-600)] underline" onClick={() => send(t.token)}>Send to this token</button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default function DevPushPage() {
  if (process.env.NODE_ENV === 'production') notFound()
  return <DevPushInner />
}

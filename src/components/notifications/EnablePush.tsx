"use client"
import { useEffect, useState } from 'react'

export function EnablePush() {
  const [supported, setSupported] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setSupported('serviceWorker' in navigator && 'PushManager' in window)
  }, [])

  const subscribe = async () => {
    try {
      setError(null)
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') throw new Error('Permission denied')
      const reg = await navigator.serviceWorker.ready
      const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapid) throw new Error('Missing public VAPID key')
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapid) })
      const res = await fetch('/api/notifications/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sub) })
      if (!res.ok) throw new Error('Subscribe failed')
      setEnabled(true)
    } catch (e: any) {
      setError(e.message || 'Failed to enable push')
    }
  }

  if (!supported) return null
  if (enabled) return <div className="text-xs text-gray-500">Notifications enabled</div>
  return (
    <div className="flex items-center gap-2">
      <button onClick={subscribe} className="px-3 py-1 text-xs rounded bg-black text-white">Enable Notifications</button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  )
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i)
  return out
}


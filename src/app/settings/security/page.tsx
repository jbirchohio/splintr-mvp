"use client"
import { useEffect, useState } from 'react'

export default function SecuritySettingsPage() {
  const [supported, setSupported] = useState<boolean>(false)
  const [enabled, setEnabled] = useState<boolean>(false)
  const [msg, setMsg] = useState<string | null>(null)
  useEffect(() => {
    // We'll attempt to import plugin if exists
    setSupported(true)
    try { const v = localStorage.getItem('biometricLock'); setEnabled(v === '1') } catch {}
  }, [])
  const test = async () => {
    try {
      const { BiometricAuth } = await import('capacitor-native-biometric').catch(() => ({ BiometricAuth: null as any }))
      if (BiometricAuth?.isAvailable) {
        const available = await BiometricAuth.isAvailable()
        if (!available.isAvailable) { setMsg('Biometric not available'); return }
        const verify = await BiometricAuth.verify({ reason: 'Unlock Splintr' })
        setMsg(verify.verified ? 'Verified' : 'Failed')
      } else {
        setMsg('Plugin not installed; requires native build')
      }
    } catch (e: any) { setMsg(e.message || 'Error') }
  }
  const toggle = async () => {
    const next = !enabled
    setEnabled(next)
    try { localStorage.setItem('biometricLock', next ? '1' : '0') } catch {}
  }
  return (
    <div className="max-w-xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Security</h1>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <input id="bio" type="checkbox" checked={enabled} onChange={toggle} />
          <label htmlFor="bio" className="text-sm">Require biometric unlock (native only)</label>
        </div>
        <button className="px-3 py-1.5 rounded bg-[color:var(--primary-600)] text-white" onClick={test}>Test Biometric</button>
        {msg && <div className="text-xs text-muted">{msg}</div>}
      </div>
    </div>
  )
}


"use client"
import { useEffect } from 'react'

export function NativeProvider() {
  useEffect(() => {
    ;(async () => {
      try {
        const { registerNativePush } = await import('@/lib/native/push')
        await registerNativePush()
      } catch {}
      try {
        const { registerBackgroundSync } = await import('@/lib/native/background')
        await registerBackgroundSync()
      } catch {}
    })()
  }, [])
  return null
}


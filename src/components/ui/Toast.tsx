"use client"
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'

type Toast = { id: string; title?: string; message: string; type?: 'info' | 'success' | 'error' } 

type ToastContextType = {
  show: (t: Omit<Toast, 'id'> & { timeoutMs?: number }) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const show = useCallback((t: Omit<Toast, 'id'> & { timeoutMs?: number }) => {
    const id = `${Date.now()}-${Math.random()}`
    const toast: Toast = { id, title: t.title, message: t.message, type: t.type || 'info' }
    setToasts(prev => [...prev, toast])
    const timeout = Math.max(1500, Math.min(8000, t.timeoutMs ?? 3000))
    setTimeout(() => setToasts(prev => prev.filter(x => x.id !== id)), timeout)
  }, [])
  const value = useMemo(() => ({ show }), [show])
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 space-y-2 w-[90%] max-w-sm">
        {toasts.map(t => (
          <div key={t.id} className={`rounded-lg shadow-lg p-3 text-sm text-white ${t.type==='success'?'bg-green-600': t.type==='error'?'bg-red-600':'bg-gray-900'}` }>
            {t.title && <div className="font-semibold mb-0.5">{t.title}</div>}
            <div>{t.message}</div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}


"use client"
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

type Theme = 'light' | 'dark' | 'system'

type ThemeContextType = {
  theme: Theme
  setTheme: (t: Theme) => void
  toggle: () => void
}

const ThemeContext = createContext<ThemeContextType | null>(null)

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  const systemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  const mode = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme
  root.setAttribute('data-theme', mode)
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system')
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('theme') as Theme | null
      const initial = saved || 'system'
      setThemeState(initial)
      applyTheme(initial)
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      const onChange = () => { if (initial === 'system') applyTheme('system') }
      mq.addEventListener?.('change', onChange)
      return () => mq.removeEventListener?.('change', onChange)
    } catch { /* ignore */ }
  }, [])

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t)
    try { window.localStorage.setItem('theme', t) } catch {}
    applyTheme(t)
  }, [])

  const toggle = useCallback(() => {
    setTheme(prev => {
      const next = prev === 'light' ? 'dark' : prev === 'dark' ? 'system' : 'light'
      try { window.localStorage.setItem('theme', next) } catch {}
      applyTheme(next)
      return next
    })
  }, [])

  const value = useMemo(() => ({ theme, setTheme, toggle }), [theme, setTheme, toggle])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}

export function ThemeToggle() {
  const { theme, setTheme, toggle } = useTheme()
  return (
    <div className="fixed bottom-4 right-4 z-50 bg-black/40 text-white rounded-full px-3 py-1.5 backdrop-blur-sm flex items-center gap-2">
      <span className="text-xs">Theme</span>
      <select className="bg-transparent text-xs" value={theme} onChange={e => setTheme(e.target.value as Theme)}>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
        <option value="system">System</option>
      </select>
      <button className="text-xs bg-white/10 rounded px-2 py-0.5" onClick={toggle}>Toggle</button>
    </div>
  )
}


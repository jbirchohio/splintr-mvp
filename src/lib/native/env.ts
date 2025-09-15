export function isNativeApp(): boolean {
  try {
    return typeof window !== 'undefined' && !!(window as any).Capacitor
  } catch {
    return false
  }
}


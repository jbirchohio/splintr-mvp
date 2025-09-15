export async function nativeShare(title: string, url: string) {
  try {
    const { Share } = await import('@capacitor/share')
    await Share.share({ title, url })
    return true
  } catch {
    try { await navigator.clipboard.writeText(url) } catch {}
    return false
  }
}


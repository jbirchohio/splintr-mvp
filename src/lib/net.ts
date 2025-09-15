export function getNetworkInfo() {
  const nav: any = navigator as any
  const connection = nav.connection || nav.mozConnection || nav.webkitConnection
  const saveData = !!(connection && connection.saveData)
  const effectiveType: string | undefined = connection?.effectiveType
  return { saveData, effectiveType }
}


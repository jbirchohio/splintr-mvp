/**
 * Lightweight antivirus scanning utilities.
 *
 * Notes:
 * - Detects the standard EICAR test signature in buffers for validation.
 * - Provides a pluggable hook to integrate with a real scanner (e.g., ClamAV)
 *   via environment variables in the future without changing call sites.
 */

export interface VirusScanResult {
  clean: boolean
  threat?: string
}

const EICAR_SIGNATURE =
  'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'

export async function scanBuffer(buffer: Uint8Array): Promise<VirusScanResult> {
  try {
    // Fast-path: check for EICAR signature (ASCII). This is a safe, standard test.
    const TD: any = (globalThis as any).TextDecoder || require('util').TextDecoder
    const decoder = new TD('utf-8', { fatal: false })
    const text = decoder.decode(buffer)
    if (text.includes(EICAR_SIGNATURE)) {
      return { clean: false, threat: 'EICAR_TEST_SIGNATURE' }
    }

    // Placeholder for future real scanning integration (e.g., ClamAV daemon).
    // For example:
    // if (process.env.CLAMAV_HOST && process.env.CLAMAV_PORT) {
    //   const result = await scanWithClamAV(buffer)
    //   return result
    // }

    return { clean: true }
  } catch (err) {
    // On any scanner failure, fail safely and treat as infected to err on the side of caution
    return { clean: false, threat: 'SCAN_ERROR' }
  }
}

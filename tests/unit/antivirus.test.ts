import { scanBuffer } from '@/lib/antivirus'

// Polyfill TextEncoder/TextDecoder for Node test environment if needed
const Te = (global as any).TextEncoder || require('util').TextEncoder
const Td = (global as any).TextDecoder || require('util').TextDecoder

describe('Antivirus scanning', () => {
  it('returns clean for normal content', async () => {
    const buf = new Te().encode('hello world')
    const result = await scanBuffer(buf)
    expect(result.clean).toBe(true)
    expect(result.threat).toBeUndefined()
  })

  it('detects EICAR test signature', async () => {
    const eicar =
      'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'
    const buf = new Te().encode(eicar)
    const result = await scanBuffer(buf)
    expect(result.clean).toBe(false)
    expect(result.threat).toBe('EICAR_TEST_SIGNATURE')
  })
})

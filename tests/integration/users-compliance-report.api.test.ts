/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/users/compliance-report/route'
import { ComplianceAuditService } from '@/services/compliance-audit.service'
import { createClient } from '@/lib/supabase'

jest.mock('@/lib/supabase')
jest.mock('next/headers', () => ({ cookies: () => ({}) }))

const mockSupabase: any = {
  auth: {
    getUser: jest.fn()
  },
  from: jest.fn()
}
;(createClient as jest.Mock).mockReturnValue(mockSupabase)

describe('/api/users/compliance-report', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: new Error('no auth') })
    const req = new NextRequest('http://localhost:3000/api/users/compliance-report')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns compliance report for authenticated user', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1', created_at: new Date().toISOString() } }, error: null })

    // Mock ComplianceAuditService instance methods
    jest.spyOn(ComplianceAuditService.prototype as any, 'generateComplianceReport').mockResolvedValue({
      totalAuditEntries: 1,
      actionsSummary: { export: 1 },
      dataRetentionStatus: { recordsNearingExpiration: 0 }
    })
    jest.spyOn(ComplianceAuditService.prototype as any, 'logDataAccess').mockResolvedValue(undefined as any)

    // Mock profile fetch for created_at
    const mockSingle = jest.fn().mockResolvedValue({ data: { created_at: new Date().toISOString(), updated_at: new Date().toISOString() }, error: null })
    const mockEq = jest.fn().mockReturnValue({ single: mockSingle })
    const mockSelect = jest.fn().mockReturnValue({ eq: mockEq })
    mockSupabase.from.mockReturnValue({ select: mockSelect })

    const req = new NextRequest('http://localhost:3000/api/users/compliance-report')
    const res = await GET(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.complianceStatus.gdprCompliant).toBe(true)
    expect(body.totalAuditEntries).toBe(1)
  })
})

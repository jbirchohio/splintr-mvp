import { ComplianceAuditService } from '@/services/compliance-audit.service'

// Mock Next.js headers
jest.mock('next/headers', () => ({
  cookies: () => ({})
}))

const mockSupabase = {
  from: jest.fn(() => ({
    insert: jest.fn(() => ({ error: null })),
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        order: jest.fn(() => ({
          range: jest.fn(() => ({ data: [], error: null }))
        }))
      }))
    }))
  }))
}

describe('ComplianceAuditService', () => {
  let service: ComplianceAuditService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new ComplianceAuditService(mockSupabase)
  })

  describe('logAction', () => {
    it('should log compliance action to database', async () => {
      const mockInsert = jest.fn().mockResolvedValue({ error: null })
      mockSupabase.from.mockReturnValue({
        insert: mockInsert
      })

      const result = await service.logAction(
        'user123',
        'export',
        { format: 'json' }
      )

      expect(mockSupabase.from).toHaveBeenCalledWith('compliance_audit_logs')
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user123',
          action: 'export',
          details: { format: 'json' }
        })
      )
      expect(result.userId).toBe('user123')
      expect(result.action).toBe('export')
    })

    it('should handle database errors gracefully', async () => {
      const mockInsert = jest.fn().mockResolvedValue({ 
        error: new Error('Database error') 
      })
      mockSupabase.from.mockReturnValue({
        insert: mockInsert
      })

      const result = await service.logAction(
        'user123',
        'export',
        { format: 'json' }
      )

      // Should still return audit log object even if database save fails
      expect(result.userId).toBe('user123')
      expect(result.action).toBe('export')
    })
  })

  describe('getUserAuditLogs', () => {
    it('should retrieve user audit logs', async () => {
      const mockData = [
        {
          id: 'log1',
          user_id: 'user123',
          action: 'export',
          created_at: '2023-01-01T00:00:00Z',
          details: { format: 'json' },
          ip_address: '127.0.0.1',
          user_agent: 'test-agent'
        }
      ]

      const mockRange = jest.fn().mockResolvedValue({ data: mockData, error: null })
      const mockOrder = jest.fn().mockReturnValue({ range: mockRange })
      const mockEq = jest.fn().mockReturnValue({ order: mockOrder })
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq })

      mockSupabase.from.mockReturnValue({ select: mockSelect })

      const result = await service.getUserAuditLogs('user123', 10, 0)

      expect(mockSupabase.from).toHaveBeenCalledWith('compliance_audit_logs')
      expect(mockSelect).toHaveBeenCalledWith('*')
      expect(mockEq).toHaveBeenCalledWith('user_id', 'user123')
      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false })
      expect(mockRange).toHaveBeenCalledWith(0, 9)

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('log1')
      expect(result[0].userId).toBe('user123')
      expect(result[0].action).toBe('export')
    })

    it('should handle database errors when retrieving logs', async () => {
      const mockRange = jest.fn().mockResolvedValue({ 
        data: null, 
        error: new Error('Database error') 
      })
      const mockOrder = jest.fn().mockReturnValue({ range: mockRange })
      const mockEq = jest.fn().mockReturnValue({ order: mockOrder })
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq })

      mockSupabase.from.mockReturnValue({ select: mockSelect })

      const result = await service.getUserAuditLogs('user123')

      expect(result).toEqual([])
    })
  })

  describe('logDataExport', () => {
    it('should log data export with specific details', async () => {
      const mockInsert = jest.fn().mockResolvedValue({ error: null })
      mockSupabase.from.mockReturnValue({
        insert: mockInsert
      })

      const result = await service.logDataExport(
        'user123',
        {
          format: 'json',
          dataCategories: ['Account Information', 'Content Data'],
          totalRecords: 10,
          fileSizeBytes: 1024
        }
      )

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user123',
          action: 'export',
          details: expect.objectContaining({
            format: 'json',
            dataCategories: ['Account Information', 'Content Data'],
            totalRecords: 10,
            fileSizeBytes: 1024,
            exportedAt: expect.any(String)
          })
        })
      )
      expect(result.action).toBe('export')
    })
  })

  describe('logDataDeletion', () => {
    it('should log data deletion with specific details', async () => {
      const mockInsert = jest.fn().mockResolvedValue({ error: null })
      mockSupabase.from.mockReturnValue({
        insert: mockInsert
      })

      const result = await service.logDataDeletion(
        'user123',
        {
          reason: 'User requested',
          dataCategories: ['All Data'],
          totalRecordsDeleted: 25
        }
      )

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user123',
          action: 'deletion',
          details: expect.objectContaining({
            reason: 'User requested',
            dataCategories: ['All Data'],
            totalRecordsDeleted: 25,
            deletedAt: expect.any(String)
          })
        })
      )
      expect(result.action).toBe('deletion')
    })
  })

  describe('logConsentUpdate', () => {
    it('should log consent updates', async () => {
      const mockInsert = jest.fn().mockResolvedValue({ error: null })
      mockSupabase.from.mockReturnValue({
        insert: mockInsert
      })

      const result = await service.logConsentUpdate(
        'user123',
        {
          consentType: 'cookies',
          granted: true,
          previousValue: false
        }
      )

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user123',
          action: 'consent_update',
          details: expect.objectContaining({
            consentType: 'cookies',
            granted: true,
            previousValue: false,
            updatedAt: expect.any(String)
          })
        })
      )
      expect(result.action).toBe('consent_update')
    })
  })

  describe('generateComplianceReport', () => {
    it('should generate comprehensive compliance report', async () => {
      const mockAuditLogs = [
        {
          id: 'log1',
          userId: 'user123',
          action: 'export' as const,
          timestamp: new Date('2023-01-01'),
          details: {},
          ipAddress: '127.0.0.1',
          userAgent: 'test'
        },
        {
          id: 'log2',
          userId: 'user123',
          action: 'export' as const,
          timestamp: new Date('2023-01-02'),
          details: {},
          ipAddress: '127.0.0.1',
          userAgent: 'test'
        },
        {
          id: 'log3',
          userId: 'user123',
          action: 'consent_update' as const,
          timestamp: new Date('2023-01-03'),
          details: {},
          ipAddress: '127.0.0.1',
          userAgent: 'test'
        }
      ]

      // Mock getUserAuditLogs to return test data
      jest.spyOn(service, 'getUserAuditLogs').mockResolvedValue(mockAuditLogs)

      const report = await service.generateComplianceReport('user123')

      expect(report.userId).toBe('user123')
      expect(report.totalAuditEntries).toBe(3)
      expect(report.actionsSummary.export).toBe(2)
      expect(report.actionsSummary.consent_update).toBe(1)
      expect(report.recentActions).toHaveLength(3)
      expect(report.dataRetentionStatus.oldestRecord).toBe('2023-01-03T00:00:00.000Z')
      expect(report.dataRetentionStatus.retentionPeriodDays).toBe(2555)
    })

    it('should handle empty audit logs', async () => {
      jest.spyOn(service, 'getUserAuditLogs').mockResolvedValue([])

      const report = await service.generateComplianceReport('user123')

      expect(report.userId).toBe('user123')
      expect(report.totalAuditEntries).toBe(0)
      expect(report.actionsSummary).toEqual({})
      expect(report.recentActions).toHaveLength(0)
      expect(report.dataRetentionStatus.oldestRecord).toBeNull()
    })
  })
})
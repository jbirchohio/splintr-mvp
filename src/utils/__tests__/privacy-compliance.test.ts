import {
  requiresGDPRCompliance,
  requiresCCPACompliance,
  validateDataExportRequest,
  validateDataDeletionRequest,
  createComplianceAuditLog,
  isDataRetentionExpired,
  anonymizeUserData,
  getDataCategories,
  estimateExportSize
} from '../privacy-compliance'

describe('Privacy Compliance Utils', () => {
  describe('requiresGDPRCompliance', () => {
    it('should return true for EU countries', () => {
      expect(requiresGDPRCompliance('DE')).toBe(true)
      expect(requiresGDPRCompliance('FR')).toBe(true)
      expect(requiresGDPRCompliance('IT')).toBe(true)
    })

    it('should return false for non-EU countries', () => {
      expect(requiresGDPRCompliance('US')).toBe(false)
      expect(requiresGDPRCompliance('CA')).toBe(false)
      expect(requiresGDPRCompliance('JP')).toBe(false)
    })

    it('should return true when no location provided (safe default)', () => {
      expect(requiresGDPRCompliance()).toBe(true)
      expect(requiresGDPRCompliance('')).toBe(true)
    })
  })

  describe('requiresCCPACompliance', () => {
    it('should return true for California', () => {
      expect(requiresCCPACompliance('CA')).toBe(true)
      expect(requiresCCPACompliance('US-CA')).toBe(true)
    })

    it('should return false for other locations', () => {
      expect(requiresCCPACompliance('US')).toBe(false)
      expect(requiresCCPACompliance('NY')).toBe(false)
      expect(requiresCCPACompliance('DE')).toBe(false)
    })
  })

  describe('validateDataExportRequest', () => {
    it('should validate correct export request', () => {
      const request = {
        userId: 'user123',
        requestDate: new Date(),
        format: 'json' as const
      }

      const result = validateDataExportRequest(request)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject invalid export request', () => {
      const request = {
        userId: '',
        requestDate: new Date(),
        format: 'xml' as any
      }

      const result = validateDataExportRequest(request)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('User ID is required')
      expect(result.errors).toContain('Format must be json or csv')
    })
  })

  describe('validateDataDeletionRequest', () => {
    it('should validate correct deletion request', () => {
      const request = {
        userId: 'user123',
        requestDate: new Date(),
        confirmationText: 'DELETE MY ACCOUNT'
      }

      const result = validateDataDeletionRequest(request)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject incorrect confirmation text', () => {
      const request = {
        userId: 'user123',
        requestDate: new Date(),
        confirmationText: 'delete my account'
      }

      const result = validateDataDeletionRequest(request)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Confirmation text must match exactly')
    })
  })

  describe('createComplianceAuditLog', () => {
    it('should create audit log entry', () => {
      const log = createComplianceAuditLog(
        'user123',
        'export',
        { format: 'json' }
      )

      expect(log.userId).toBe('user123')
      expect(log.action).toBe('export')
      expect(log.details).toEqual({ format: 'json' })
      expect(log.timestamp).toBeInstanceOf(Date)
      expect(log.id).toBeDefined()
    })
  })

  describe('isDataRetentionExpired', () => {
    it('should return false for recent data', () => {
      const recentDate = new Date()
      recentDate.setDate(recentDate.getDate() - 30) // 30 days ago

      expect(isDataRetentionExpired(recentDate)).toBe(false)
    })

    it('should return true for old data', () => {
      const oldDate = new Date()
      oldDate.setFullYear(oldDate.getFullYear() - 10) // 10 years ago

      expect(isDataRetentionExpired(oldDate)).toBe(true)
    })

    it('should respect custom retention period', () => {
      const date = new Date()
      date.setDate(date.getDate() - 10) // 10 days ago

      expect(isDataRetentionExpired(date, 5)).toBe(true) // 5 day retention
      expect(isDataRetentionExpired(date, 15)).toBe(false) // 15 day retention
    })
  })

  describe('anonymizeUserData', () => {
    it('should anonymize personal information', () => {
      const userData = {
        id: 'user123',
        email: 'user@example.com',
        name: 'John Doe',
        avatarUrl: 'https://example.com/avatar.jpg',
        createdAt: '2023-01-01'
      }

      const anonymized = anonymizeUserData(userData)

      expect(anonymized.id).toBe('user123') // Keep ID for data integrity
      expect(anonymized.email).toMatch(/^hashed_/) // Should be hashed
      expect(anonymized.name).toBe('Anonymous User')
      expect(anonymized.avatarUrl).toBeUndefined()
      expect(anonymized.anonymized).toBe(true)
      expect(anonymized.anonymizedAt).toBeDefined()
    })
  })

  describe('getDataCategories', () => {
    it('should return all data categories', () => {
      const categories = getDataCategories()

      expect(categories).toHaveLength(4)
      expect(categories[0].category).toBe('Account Information')
      expect(categories[0].tables).toContain('users')
    })
  })

  describe('estimateExportSize', () => {
    it('should estimate export size', () => {
      const categories = ['Account Information', 'Content Data']
      const estimate = estimateExportSize(categories)

      expect(estimate.estimatedSizeMB).toBeGreaterThan(0)
      expect(estimate.estimatedItems).toBeGreaterThan(0)
    })

    it('should handle empty categories', () => {
      const estimate = estimateExportSize([])

      expect(estimate.estimatedSizeMB).toBe(0)
      expect(estimate.estimatedItems).toBe(0)
    })
  })
})
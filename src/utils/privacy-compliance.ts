/**
 * Privacy compliance utilities for GDPR, CCPA, and other data protection regulations
 */

export interface DataExportRequest {
  userId: string
  requestDate: Date
  format: 'json' | 'csv'
  includeDeleted?: boolean
}

export interface DataDeletionRequest {
  userId: string
  requestDate: Date
  reason?: string
  confirmationText: string
}

export interface ComplianceAuditLog {
  id: string
  userId: string
  action: 'export' | 'deletion' | 'consent_update' | 'data_access'
  timestamp: Date
  details: Record<string, any>
  ipAddress?: string
  userAgent?: string
}

/**
 * Check if user is in a region that requires GDPR compliance
 */
export function requiresGDPRCompliance(userLocation?: string): boolean {
  const gdprCountries = [
    'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
    'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
    'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'IS', 'LI', 'NO'
  ]
  
  return userLocation ? gdprCountries.includes(userLocation.toUpperCase()) : true
}

/**
 * Check if user is in a region that requires CCPA compliance
 */
export function requiresCCPACompliance(userLocation?: string): boolean {
  return userLocation?.toUpperCase() === 'CA' || userLocation?.toUpperCase() === 'US-CA'
}

/**
 * Validate data export request
 */
export function validateDataExportRequest(request: DataExportRequest): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!request.userId) {
    errors.push('User ID is required')
  }

  if (!request.requestDate) {
    errors.push('Request date is required')
  }

  if (!['json', 'csv'].includes(request.format)) {
    errors.push('Format must be json or csv')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Validate data deletion request
 */
export function validateDataDeletionRequest(request: DataDeletionRequest): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!request.userId) {
    errors.push('User ID is required')
  }

  if (!request.requestDate) {
    errors.push('Request date is required')
  }

  if (request.confirmationText !== 'DELETE MY ACCOUNT') {
    errors.push('Confirmation text must match exactly')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Generate compliance audit log entry
 */
export function createComplianceAuditLog(
  userId: string,
  action: ComplianceAuditLog['action'],
  details: Record<string, any>,
  request?: Request
): ComplianceAuditLog {
  return {
    id: crypto.randomUUID(),
    userId,
    action,
    timestamp: new Date(),
    details,
    ipAddress: request?.headers.get('x-forwarded-for') || 
               request?.headers.get('x-real-ip') || 
               'unknown',
    userAgent: request?.headers.get('user-agent') || 'unknown'
  }
}

/**
 * Check if data retention period has expired
 */
export function isDataRetentionExpired(
  createdAt: Date,
  retentionPeriodDays: number = 2555 // ~7 years default
): boolean {
  const expirationDate = new Date(createdAt)
  expirationDate.setDate(expirationDate.getDate() + retentionPeriodDays)
  return new Date() > expirationDate
}

/**
 * Anonymize user data for compliance
 */
export function anonymizeUserData(userData: any): any {
  const anonymized = { ...userData }
  
  // Remove or hash personally identifiable information
  if (anonymized.email) {
    anonymized.email = hashPII(anonymized.email)
  }
  
  if (anonymized.name) {
    anonymized.name = 'Anonymous User'
  }
  
  if (anonymized.avatarUrl) {
    delete anonymized.avatarUrl
  }
  
  // Keep only aggregated/anonymized data
  return {
    ...anonymized,
    anonymized: true,
    anonymizedAt: new Date().toISOString()
  }
}

/**
 * Hash personally identifiable information
 */
function hashPII(data: string): string {
  // In a real implementation, use a proper cryptographic hash
  // This is a simple example
  let hash = 0
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return `hashed_${Math.abs(hash).toString(16)}`
}

/**
 * Get data categories for export
 */
export function getDataCategories(): {
  category: string
  description: string
  tables: string[]
}[] {
  return [
    {
      category: 'Account Information',
      description: 'Basic account and profile data',
      tables: ['users', 'auth.users']
    },
    {
      category: 'Content Data',
      description: 'Stories, videos, and creative content',
      tables: ['stories', 'videos']
    },
    {
      category: 'Interaction Data',
      description: 'Viewing history and user interactions',
      tables: ['story_playthroughs']
    },
    {
      category: 'Moderation Data',
      description: 'Content reports and moderation history',
      tables: ['content_flags']
    }
  ]
}

/**
 * Calculate estimated export file size
 */
export function estimateExportSize(dataCategories: string[]): {
  estimatedSizeMB: number
  estimatedItems: number
} {
  // Rough estimates based on typical data sizes
  const categoryEstimates = {
    'Account Information': { sizeMB: 0.001, items: 1 },
    'Content Data': { sizeMB: 0.1, items: 10 },
    'Interaction Data': { sizeMB: 0.01, items: 50 },
    'Moderation Data': { sizeMB: 0.005, items: 5 }
  }

  let totalSize = 0
  let totalItems = 0

  dataCategories.forEach(category => {
    const estimate = categoryEstimates[category as keyof typeof categoryEstimates]
    if (estimate) {
      totalSize += estimate.sizeMB
      totalItems += estimate.items
    }
  })

  return {
    estimatedSizeMB: Math.round(totalSize * 100) / 100,
    estimatedItems: totalItems
  }
}
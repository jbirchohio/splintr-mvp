import { createClient } from '@/lib/supabase'
import { cookies } from 'next/headers'
import { ComplianceAuditLog, createComplianceAuditLog } from '@/utils/privacy-compliance'

export class ComplianceAuditService {
  private supabase

  constructor(supabaseClient?: any) {
    if (supabaseClient) {
      this.supabase = supabaseClient
    } else {
      const cookieStore = cookies()
      this.supabase = createClient(cookieStore)
    }
  }

  /**
   * Log a compliance-related action to the audit trail
   */
  async logAction(
    userId: string,
    action: ComplianceAuditLog['action'],
    details: Record<string, any>,
    request?: Request
  ): Promise<ComplianceAuditLog> {
    const auditLog = createComplianceAuditLog(userId, action, details, request)

    try {
      const { error } = await this.supabase
        .from('compliance_audit_logs')
        .insert({
          id: auditLog.id,
          user_id: auditLog.userId,
          action: auditLog.action,
          details: auditLog.details,
          ip_address: auditLog.ipAddress,
          user_agent: auditLog.userAgent,
          created_at: auditLog.timestamp.toISOString()
        })

      if (error) {
        console.error('Failed to save compliance audit log:', error)
        throw error
      }

      console.log(`Compliance audit logged: ${action} for user ${userId}`)
      return auditLog

    } catch (error) {
      console.error('Compliance audit logging failed:', error)
      // Return the audit log object even if database save failed
      // This ensures the calling code can still use the audit ID
      return auditLog
    }
  }

  /**
   * Get audit logs for a specific user (for transparency)
   */
  async getUserAuditLogs(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<ComplianceAuditLog[]> {
    try {
      const { data, error } = await this.supabase
        .from('compliance_audit_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) {
        console.error('Failed to fetch audit logs:', error)
        throw error
      }

      return data.map(log => ({
        id: log.id,
        userId: log.user_id,
        action: log.action,
        timestamp: new Date(log.created_at),
        details: log.details,
        ipAddress: log.ip_address,
        userAgent: log.user_agent
      }))

    } catch (error) {
      console.error('Failed to retrieve user audit logs:', error)
      return []
    }
  }

  /**
   * Log data export request
   */
  async logDataExport(
    userId: string,
    exportDetails: {
      format: string
      dataCategories: string[]
      totalRecords?: number
      fileSizeBytes?: number
    },
    request?: Request
  ): Promise<ComplianceAuditLog> {
    return this.logAction(userId, 'export', {
      ...exportDetails,
      exportedAt: new Date().toISOString()
    }, request)
  }

  /**
   * Log data deletion request
   */
  async logDataDeletion(
    userId: string,
    deletionDetails: {
      reason?: string
      dataCategories: string[]
      totalRecordsDeleted?: number
    },
    request?: Request
  ): Promise<ComplianceAuditLog> {
    return this.logAction(userId, 'deletion', {
      ...deletionDetails,
      deletedAt: new Date().toISOString()
    }, request)
  }

  /**
   * Log consent updates (cookie preferences, etc.)
   */
  async logConsentUpdate(
    userId: string,
    consentDetails: {
      consentType: string
      granted: boolean
      previousValue?: boolean
    },
    request?: Request
  ): Promise<ComplianceAuditLog> {
    return this.logAction(userId, 'consent_update', {
      ...consentDetails,
      updatedAt: new Date().toISOString()
    }, request)
  }

  /**
   * Log data access requests (when users view their data)
   */
  async logDataAccess(
    userId: string,
    accessDetails: {
      dataType: string
      accessMethod: string
      recordsAccessed?: number
    },
    request?: Request
  ): Promise<ComplianceAuditLog> {
    return this.logAction(userId, 'data_access', {
      ...accessDetails,
      accessedAt: new Date().toISOString()
    }, request)
  }

  /**
   * Generate compliance report for a user
   */
  async generateComplianceReport(userId: string): Promise<{
    userId: string
    reportGeneratedAt: string
    totalAuditEntries: number
    actionsSummary: Record<string, number>
    recentActions: ComplianceAuditLog[]
    dataRetentionStatus: {
      oldestRecord: string | null
      retentionPeriodDays: number
      recordsNearingExpiration: number
    }
  }> {
    try {
      const auditLogs = await this.getUserAuditLogs(userId, 1000) // Get more for analysis

      const actionsSummary = auditLogs.reduce((acc, log) => {
        acc[log.action] = (acc[log.action] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      const oldestRecord = auditLogs.length > 0 
        ? auditLogs[auditLogs.length - 1].timestamp.toISOString()
        : null

      // Calculate records nearing expiration (within 30 days of 7-year retention)
      const retentionPeriodDays = 2555 // ~7 years
      const nearExpirationThreshold = 30 // days
      const now = new Date()
      
      const recordsNearingExpiration = auditLogs.filter(log => {
        const daysSinceCreation = Math.floor(
          (now.getTime() - log.timestamp.getTime()) / (1000 * 60 * 60 * 24)
        )
        return daysSinceCreation > (retentionPeriodDays - nearExpirationThreshold)
      }).length

      return {
        userId,
        reportGeneratedAt: new Date().toISOString(),
        totalAuditEntries: auditLogs.length,
        actionsSummary,
        recentActions: auditLogs.slice(0, 10), // Last 10 actions
        dataRetentionStatus: {
          oldestRecord,
          retentionPeriodDays,
          recordsNearingExpiration
        }
      }

    } catch (error) {
      console.error('Failed to generate compliance report:', error)
      throw error
    }
  }
}

// Export singleton instance factory
export const createComplianceAuditService = (supabaseClient?: any) => 
  new ComplianceAuditService(supabaseClient)
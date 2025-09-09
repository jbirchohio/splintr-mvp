import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { cookies } from 'next/headers'
import { ComplianceAuditService } from '@/services/compliance-audit.service'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const auditService = new ComplianceAuditService(supabase)

    // Generate comprehensive compliance report
    const report = await auditService.generateComplianceReport(user.id)

    // Add additional user data context
    const { data: profile } = await supabase
      .from('users')
      .select('created_at, updated_at')
      .eq('id', user.id)
      .single()

    const enhancedReport = {
      ...report,
      accountInfo: {
        accountCreated: profile?.created_at || user.created_at,
        lastUpdated: profile?.updated_at || user.updated_at,
        accountAge: calculateAccountAge(profile?.created_at || user.created_at)
      },
      complianceStatus: {
        gdprCompliant: true,
        ccpaCompliant: true,
        dataRetentionCompliant: report.dataRetentionStatus.recordsNearingExpiration === 0,
        auditTrailComplete: report.totalAuditEntries > 0
      },
      recommendations: generateComplianceRecommendations(report)
    }

    // Log this compliance report access
    await auditService.logDataAccess(
      user.id,
      {
        dataType: 'compliance_report',
        accessMethod: 'api',
        recordsAccessed: 1
      },
      request
    )

    return NextResponse.json(enhancedReport)

  } catch (error) {
    console.error('Failed to generate compliance report:', error)
    return NextResponse.json(
      { error: 'Failed to generate compliance report' },
      { status: 500 }
    )
  }
}

/**
 * Calculate account age in days
 */
function calculateAccountAge(createdAt: string): number {
  const created = new Date(createdAt)
  const now = new Date()
  return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * Generate compliance recommendations based on report data
 */
function generateComplianceRecommendations(report: any): string[] {
  const recommendations: string[] = []

  if (report.totalAuditEntries === 0) {
    recommendations.push('Consider performing some privacy-related actions to build your audit trail')
  }

  if (report.dataRetentionStatus.recordsNearingExpiration > 0) {
    recommendations.push(`${report.dataRetentionStatus.recordsNearingExpiration} audit records are nearing expiration and will be automatically deleted`)
  }

  if (!report.actionsSummary.export) {
    recommendations.push('You can export your data at any time to see what information we have about you')
  }

  if (report.actionsSummary.export && report.actionsSummary.export > 5) {
    recommendations.push('You have requested multiple data exports - consider if you need to download your data again')
  }

  if (recommendations.length === 0) {
    recommendations.push('Your account is fully compliant with privacy regulations')
  }

  return recommendations
}
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

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100) // Max 100
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0)
    const action = searchParams.get('action') // Optional filter by action type

    const auditService = new ComplianceAuditService(supabase)

    // Get user's audit logs
    let auditLogs = await auditService.getUserAuditLogs(user.id, limit, offset)

    // Filter by action if specified
    if (action) {
      auditLogs = auditLogs.filter(log => log.action === action)
    }

    // Format response for client consumption
    const formattedLogs = auditLogs.map(log => ({
      id: log.id,
      action: log.action,
      timestamp: log.timestamp.toISOString(),
      details: log.details,
      // Don't expose IP address and user agent to the user for privacy
      summary: generateActionSummary(log.action, log.details)
    }))

    return NextResponse.json({
      auditLogs: formattedLogs,
      pagination: {
        limit,
        offset,
        hasMore: formattedLogs.length === limit
      },
      totalActions: auditLogs.length
    })

  } catch (error) {
    console.error('Failed to fetch audit logs:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve audit logs' },
      { status: 500 }
    )
  }
}

/**
 * Generate human-readable summary of audit log actions
 */
function generateActionSummary(action: string, details: any): string {
  switch (action) {
    case 'export':
      return `Data exported in ${details.format} format (${details.totalRecords || 'unknown'} records)`
    
    case 'deletion':
      return `Account deletion requested${details.reason ? ` - ${details.reason}` : ''}`
    
    case 'consent_update':
      return `${details.consentType} consent ${details.granted ? 'granted' : 'revoked'}`
    
    case 'data_access':
      return `Accessed ${details.dataType} data via ${details.accessMethod}`
    
    default:
      return `${action} action performed`
  }
}
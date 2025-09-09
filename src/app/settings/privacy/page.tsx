'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface AuditLog {
  id: string
  action: string
  timestamp: string
  summary: string
}

interface ComplianceReport {
  totalAuditEntries: number
  actionsSummary: Record<string, number>
  complianceStatus: {
    gdprCompliant: boolean
    ccpaCompliant: boolean
    dataRetentionCompliant: boolean
    auditTrailComplete: boolean
  }
  recommendations: string[]
}

export default function PrivacySettingsPage() {
  const [isExporting, setIsExporting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('')
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [complianceReport, setComplianceReport] = useState<ComplianceReport | null>(null)
  const [showAuditLogs, setShowAuditLogs] = useState(false)
  const [loadingAuditLogs, setLoadingAuditLogs] = useState(false)
  const router = useRouter()

  // Load compliance report on component mount
  useEffect(() => {
    loadComplianceReport()
  }, [])

  const loadComplianceReport = async () => {
    try {
      const response = await fetch('/api/users/compliance-report')
      if (response.ok) {
        const report = await response.json()
        setComplianceReport(report)
      }
    } catch (error) {
      console.error('Failed to load compliance report:', error)
    }
  }

  const loadAuditLogs = async () => {
    setLoadingAuditLogs(true)
    try {
      const response = await fetch('/api/users/audit-logs?limit=20')
      if (response.ok) {
        const data = await response.json()
        setAuditLogs(data.auditLogs)
      }
    } catch (error) {
      console.error('Failed to load audit logs:', error)
    } finally {
      setLoadingAuditLogs(false)
    }
  }

  const handleExportData = async () => {
    setIsExporting(true)
    try {
      const response = await fetch('/api/users/export', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to export data')
      }

      // Create download link
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `splintr-data-export-${Date.now()}.json`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

    } catch (error) {
      console.error('Export failed:', error)
      alert('Failed to export data. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmationText !== 'DELETE MY ACCOUNT') {
      alert('Please type "DELETE MY ACCOUNT" to confirm')
      return
    }

    setIsDeleting(true)
    try {
      const response = await fetch('/api/users/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to delete account')
      }

      // Redirect to goodbye page or home
      router.push('/?deleted=true')

    } catch (error) {
      console.error('Account deletion failed:', error)
      alert('Failed to delete account. Please try again or contact support.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-lg rounded-lg">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Privacy Settings</h1>
            <p className="text-gray-600 mt-1">
              Manage your data, privacy preferences, and account settings
            </p>
          </div>

          <div className="p-6 space-y-8">
            {/* Data Export Section */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Data Export</h2>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h3 className="font-medium text-blue-900 mb-2">Download Your Data</h3>
                <p className="text-sm text-blue-800 mb-4">
                  Get a complete copy of all your personal data stored on Splintr, including:
                </p>
                <ul className="text-sm text-blue-700 list-disc list-inside space-y-1 mb-4">
                  <li>Profile information and account details</li>
                  <li>All stories and videos you've created</li>
                  <li>Your viewing history and interactions</li>
                  <li>Content flags and reports you've made</li>
                </ul>
                <button
                  onClick={handleExportData}
                  disabled={isExporting}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  {isExporting ? 'Preparing Export...' : 'Export My Data'}
                </button>
              </div>
              <p className="text-xs text-gray-500">
                Your data will be provided in JSON format. This may take a few moments for accounts with lots of content.
              </p>
            </section>

            {/* Privacy Controls Section */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Privacy Controls</h2>
              <div className="space-y-4">
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-2">Cookie Preferences</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Manage which cookies and tracking technologies you allow
                  </p>
                  <button
                    onClick={() => {
                      // Clear existing consent to show banner again
                      localStorage.removeItem('splintr-cookie-consent')
                      window.location.reload()
                    }}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium underline"
                  >
                    Update Cookie Preferences
                  </button>
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-2">Data Processing</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Learn about how we process your data and your rights
                  </p>
                  <div className="flex gap-3">
                    <Link 
                      href="/privacy" 
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium underline"
                    >
                      Privacy Policy
                    </Link>
                    <Link 
                      href="/terms" 
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium underline"
                    >
                      Terms of Service
                    </Link>
                  </div>
                </div>
              </div>
            </section>

            {/* Account Deletion Section */}
            <section>
              <h2 className="text-xl font-semibold text-red-600 mb-4">Danger Zone</h2>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="font-medium text-red-900 mb-2">Delete Account</h3>
                <p className="text-sm text-red-800 mb-4">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
                
                {!showDeleteConfirmation ? (
                  <button
                    onClick={() => setShowDeleteConfirmation(true)}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Delete My Account
                  </button>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-red-100 border border-red-300 rounded-md p-3">
                      <h4 className="font-medium text-red-900 mb-2">⚠️ This will permanently delete:</h4>
                      <ul className="text-sm text-red-800 list-disc list-inside space-y-1">
                        <li>Your profile and account information</li>
                        <li>All videos and stories you've created</li>
                        <li>Your viewing history and interactions</li>
                        <li>Content flags and reports you've made</li>
                        <li>All associated files and media</li>
                      </ul>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-red-900 mb-2">
                        Type "DELETE MY ACCOUNT" to confirm:
                      </label>
                      <input
                        type="text"
                        value={deleteConfirmationText}
                        onChange={(e) => setDeleteConfirmationText(e.target.value)}
                        className="block w-full px-3 py-2 border border-red-300 rounded-md text-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                        placeholder="DELETE MY ACCOUNT"
                      />
                    </div>
                    
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setShowDeleteConfirmation(false)
                          setDeleteConfirmationText('')
                        }}
                        className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleDeleteAccount}
                        disabled={isDeleting || deleteConfirmationText !== 'DELETE MY ACCOUNT'}
                        className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                      >
                        {isDeleting ? 'Deleting Account...' : 'Permanently Delete Account'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Compliance Status Section */}
            {complianceReport && (
              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Compliance Status</h2>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center mb-3">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <h3 className="ml-2 font-medium text-green-900">Privacy Compliance Status</h3>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center">
                      <span className={`inline-block w-2 h-2 rounded-full mr-2 ${complianceReport.complianceStatus.gdprCompliant ? 'bg-green-500' : 'bg-red-500'}`}></span>
                      <span className="text-sm text-green-800">GDPR Compliant</span>
                    </div>
                    <div className="flex items-center">
                      <span className={`inline-block w-2 h-2 rounded-full mr-2 ${complianceReport.complianceStatus.ccpaCompliant ? 'bg-green-500' : 'bg-red-500'}`}></span>
                      <span className="text-sm text-green-800">CCPA Compliant</span>
                    </div>
                    <div className="flex items-center">
                      <span className={`inline-block w-2 h-2 rounded-full mr-2 ${complianceReport.complianceStatus.dataRetentionCompliant ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                      <span className="text-sm text-green-800">Data Retention OK</span>
                    </div>
                    <div className="flex items-center">
                      <span className={`inline-block w-2 h-2 rounded-full mr-2 ${complianceReport.complianceStatus.auditTrailComplete ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                      <span className="text-sm text-green-800">Audit Trail Active</span>
                    </div>
                  </div>

                  <div className="text-sm text-green-700">
                    <p><strong>Total Privacy Actions:</strong> {complianceReport.totalAuditEntries}</p>
                    {complianceReport.recommendations.length > 0 && (
                      <div className="mt-2">
                        <p className="font-medium mb-1">Recommendations:</p>
                        <ul className="list-disc list-inside space-y-1">
                          {complianceReport.recommendations.map((rec, index) => (
                            <li key={index}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* Privacy Activity Section */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Privacy Activity</h2>
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-medium text-gray-900">Your Privacy Actions</h3>
                    <p className="text-sm text-gray-600">
                      View a log of all privacy-related actions on your account
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowAuditLogs(!showAuditLogs)
                      if (!showAuditLogs && auditLogs.length === 0) {
                        loadAuditLogs()
                      }
                    }}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium underline"
                  >
                    {showAuditLogs ? 'Hide' : 'View'} Activity Log
                  </button>
                </div>

                {showAuditLogs && (
                  <div className="border-t border-gray-200 pt-4">
                    {loadingAuditLogs ? (
                      <div className="text-center py-4">
                        <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        <p className="text-sm text-gray-600 mt-2">Loading activity...</p>
                      </div>
                    ) : auditLogs.length > 0 ? (
                      <div className="space-y-3">
                        {auditLogs.map((log) => (
                          <div key={log.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-md">
                            <div className="flex-shrink-0">
                              <div className={`w-2 h-2 rounded-full mt-2 ${
                                log.action === 'export' ? 'bg-blue-500' :
                                log.action === 'deletion' ? 'bg-red-500' :
                                log.action === 'consent_update' ? 'bg-green-500' :
                                'bg-gray-500'
                              }`}></div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 capitalize">
                                {log.action.replace('_', ' ')}
                              </p>
                              <p className="text-sm text-gray-600">{log.summary}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {new Date(log.timestamp).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-sm text-gray-600">No privacy actions recorded yet.</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Actions like data exports and privacy setting changes will appear here.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>

            {/* Contact Section */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Need Help?</h2>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-700 mb-3">
                  If you have questions about your privacy, data, or need assistance with these settings, 
                  please contact our privacy team:
                </p>
                <div className="text-sm text-gray-600">
                  <p><strong>Email:</strong> privacy@splintr.app</p>
                  <p><strong>Subject:</strong> Privacy Settings Inquiry</p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
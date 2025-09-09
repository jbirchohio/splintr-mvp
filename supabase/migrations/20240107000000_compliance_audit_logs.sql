-- Create compliance audit logs table for GDPR/CCPA tracking
CREATE TABLE IF NOT EXISTS compliance_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL CHECK (action IN ('export', 'deletion', 'consent_update', 'data_access')),
  details JSONB NOT NULL DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes for efficient querying
  INDEX idx_compliance_audit_logs_user_id ON compliance_audit_logs(user_id),
  INDEX idx_compliance_audit_logs_action ON compliance_audit_logs(action),
  INDEX idx_compliance_audit_logs_created_at ON compliance_audit_logs(created_at)
);

-- Add RLS policies
ALTER TABLE compliance_audit_logs ENABLE ROW LEVEL SECURITY;

-- Users can only see their own audit logs
CREATE POLICY "Users can view own audit logs" ON compliance_audit_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Only system can insert audit logs (no direct user access)
CREATE POLICY "System can insert audit logs" ON compliance_audit_logs
  FOR INSERT WITH CHECK (true);

-- Add comments for documentation
COMMENT ON TABLE compliance_audit_logs IS 'Audit trail for data privacy compliance (GDPR, CCPA, etc.)';
COMMENT ON COLUMN compliance_audit_logs.action IS 'Type of privacy-related action performed';
COMMENT ON COLUMN compliance_audit_logs.details IS 'Additional context and metadata for the action';
COMMENT ON COLUMN compliance_audit_logs.ip_address IS 'IP address of the request (for security auditing)';
COMMENT ON COLUMN compliance_audit_logs.user_agent IS 'User agent string (for security auditing)';
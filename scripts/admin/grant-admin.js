#!/usr/bin/env node
/*
 Grants admin role to a Supabase user by ID by setting app_metadata.role = 'admin'.
 Usage:
   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/admin/grant-admin.js <userId>
*/

const { createClient } = require('@supabase/supabase-js')

async function main() {
  const userId = process.argv[2]
  if (!userId) {
    console.error('Usage: node scripts/admin/grant-admin.js <userId>')
    process.exit(1)
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars')
    process.exit(1)
  }
  const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  try {
    const { data, error } = await sb.auth.admin.updateUserById(userId, { app_metadata: { role: 'admin' } })
    if (error) {
      console.error('Failed to grant admin:', error.message)
      process.exit(1)
    }
    console.log('Granted admin role to user:', data.user.id)
  } catch (e) {
    console.error('Error:', e.message)
    process.exit(1)
  }
}

main()


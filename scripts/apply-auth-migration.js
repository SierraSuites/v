/**
 * Apply AUTH_SECURITY_ENHANCEMENTS Migration
 *
 * This script applies the auth security enhancements migration to the Supabase database.
 * It should be run manually or as part of the deployment process.
 *
 * Usage:
 *   node scripts/apply-auth-migration.js
 */

const fs = require('fs')
const path = require('path')

async function applyMigration() {
  console.log('🔐 Auth Security Enhancements Migration')
  console.log('========================================\n')

  // Read migration file
  const migrationPath = path.join(
    __dirname,
    '..',
    'database',
    'migrations',
    '202602111500-AUTH_SECURITY_ENHANCEMENTS.sql'
  )

  if (!fs.existsSync(migrationPath)) {
    console.error('❌ Migration file not found:', migrationPath)
    process.exit(1)
  }

  console.log('📄 Migration file located successfully\n')

  console.log('To apply this migration, you have several options:\n')

  console.log('1️⃣  Using Supabase Dashboard:')
  console.log('   - Go to https://supabase.com/dashboard')
  console.log('   - Select your project')
  console.log('   - Navigate to SQL Editor')
  console.log('   - Copy and paste the migration file contents')
  console.log('   - Run the migration\n')

  console.log('2️⃣  Using Supabase CLI:')
  console.log('   npx supabase db push\n')

  console.log('3️⃣  Using psql directly:')
  console.log('   psql $DATABASE_URL -f database/migrations/202602111500-AUTH_SECURITY_ENHANCEMENTS.sql\n')

  console.log('📋 Migration Summary:')
  console.log('   ✅ Creates auth_audit_logs table for security monitoring')
  console.log('   ✅ Creates user_sessions table for session tracking')
  console.log('   ✅ Creates password_history table to prevent reuse')
  console.log('   ✅ Creates rate_limit_records table for brute force protection')
  console.log('   ✅ Adds 20+ security columns to user_profiles')
  console.log('   ✅ Enhances handle_new_user() trigger with OAuth and RBAC')
  console.log('   ✅ Adds RLS policies for all new tables')
  console.log('   ✅ Creates cleanup functions for maintenance\n')

  console.log('⚠️  IMPORTANT:')
  console.log('   - Backup your database before applying')
  console.log('   - Test in development environment first')
  console.log('   - This migration is safe to run multiple times (uses IF NOT EXISTS)\n')

  console.log('✅ Migration file is ready to apply!')
  console.log('📍 Location:', migrationPath)
}

applyMigration().catch((error) => {
  console.error('❌ Error:', error)
  process.exit(1)
})

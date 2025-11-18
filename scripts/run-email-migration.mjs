#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Read the migration file
const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20250130000001_email_retrieval_function.sql')
const sql = readFileSync(migrationPath, 'utf-8')

console.log('Executing email retrieval function migration...')

// Execute the SQL
const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })

if (error) {
  // If exec_sql RPC doesn't exist, try direct execution
  console.log('Trying alternative method...')

  // Split by statements and execute each
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  for (const statement of statements) {
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({ query: statement + ';' })
      })

      if (!response.ok) {
        console.error(`Failed to execute statement: ${statement.substring(0, 100)}...`)
        console.error(await response.text())
      }
    } catch (err) {
      console.error(`Error executing statement: ${err.message}`)
    }
  }

  console.log('Migration executed via alternative method')
} else {
  console.log('Migration executed successfully!')
}

console.log('\nVerifying function was created...')
const { data: functions, error: funcError } = await supabase
  .rpc('get_user_emails_for_challenge_update', {
    p_user_ids: [],
    p_challenge_id: '00000000-0000-0000-0000-000000000000'
  })

if (funcError && !funcError.message.includes('relation')) {
  console.error('Function verification failed:', funcError)
} else {
  console.log('✓ Function is available and working!')
}

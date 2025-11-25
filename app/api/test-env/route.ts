import { NextResponse } from 'next/server'

export async function GET() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  return NextResponse.json({
    hasServiceRoleKey: !!serviceRoleKey,
    length: serviceRoleKey?.length || 0,
    prefix: serviceRoleKey?.substring(0, 20) || 'undefined',
    suffix: serviceRoleKey?.substring(serviceRoleKey.length - 20) || 'undefined',
    // Check for common issues
    hasQuotes: serviceRoleKey?.startsWith('"') || serviceRoleKey?.startsWith("'"),
    hasWhitespace: serviceRoleKey?.trim().length !== serviceRoleKey?.length,
  })
}

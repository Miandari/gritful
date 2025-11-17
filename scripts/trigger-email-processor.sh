#!/bin/bash

# Script to manually trigger the email processor edge function
# This is useful for testing or can be set up as a cron job

SUPABASE_PROJECT_REF="nwkwjcsezizdakpzmhlx"
FUNCTION_URL="https://${SUPABASE_PROJECT_REF}.supabase.co/functions/v1/email-processor"

echo "Triggering email processor..."
echo "URL: $FUNCTION_URL"
echo ""

# Trigger the function
response=$(curl -s -X POST "$FUNCTION_URL" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json")

echo "Response:"
echo "$response" | jq '.'

echo ""
echo "Done! Check your Supabase logs for details."

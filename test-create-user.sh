#!/bin/bash
# ============================================
# Test script for create-user Edge Function
# ============================================

# Configuration
SUPABASE_URL=""  # Your Supabase URL (e.g., https://xxx.supabase.co)
FUNCTION_URL="${SUPABASE_URL}/functions/v1/create-user"
ANON_KEY=""      # Your anon key (optional, for initial login)
ADMIN_EMAIL=""   # Admin email for login
ADMIN_PASSWORD="" # Admin password for login

echo "=== Supabase Create-User Function Test ==="
echo ""

# Check if variables are set
if [ -z "$SUPABASE_URL" ]; then
  echo "Error: Please set SUPABASE_URL"
  echo "Example: export SUPABASE_URL='https://your-project.supabase.co'"
  exit 1
fi

# Step 1: Login as admin to get token
echo "Step 1: Logging in as admin..."
LOGIN_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
  -H "Content-Type: application/json" \
  -H "apikey: ${ANON_KEY}" \
  -d "{
    \"email\": \"${ADMIN_EMAIL}\",
    \"password\": \"${ADMIN_PASSWORD}\"
  }")

echo "Login response: $LOGIN_RESPONSE"
echo ""

# Extract access token
ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.access_token // empty')

if [ -z "$ACCESS_TOKEN" ] || [ "$ACCESS_TOKEN" = "null" ]; then
  echo "Error: Failed to get access token. Check admin credentials."
  exit 1
fi

echo "Access token obtained: ${ACCESS_TOKEN:0:20}..."
echo ""

# Step 2: Create a new user
echo "Step 2: Creating new user via Edge Function..."
NEW_USER_EMAIL="test-$(date +%s)@example.com"
NEW_USER_PASSWORD="testpass123"
NEW_USER_NAME="Test User"
NEW_USER_ROLE="student"

echo "Creating user: $NEW_USER_EMAIL"
echo ""

CREATE_RESPONSE=$(curl -s -X POST "${FUNCTION_URL}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "apikey: ${ANON_KEY}" \
  -d "{
    \"email\": \"${NEW_USER_EMAIL}\",
    \"password\": \"${NEW_USER_PASSWORD}\",
    \"fullName\": \"${NEW_USER_NAME}\",
    \"role\": \"${NEW_USER_ROLE}\"
  }")

echo "Create response:"
echo "$CREATE_RESPONSE" | jq '.'
echo ""

# Check if user was created
SUCCESS=$(echo $CREATE_RESPONSE | jq -r '.success // false')

if [ "$SUCCESS" = "true" ]; then
  echo "✓ User created successfully!"
  echo ""
  echo "Debug info:"
  echo "$CREATE_RESPONSE" | jq '.debug'
else
  echo "✗ User creation failed!"
  echo ""
  echo "Error details:"
  echo "$CREATE_RESPONSE" | jq '.error, .details'
fi

echo ""
echo "=== Test Complete ==="

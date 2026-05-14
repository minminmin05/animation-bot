/**
 * ============================================
 * Test script for create-user Edge Function
 * Run with: node test-create-user.js
 * ============================================
 */

// STEP 1: Load dotenv FIRST - must be at the very top
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current file directory (ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// STEP 2: Debug - show current working directory
console.log('[DEBUG] Current working directory:', process.cwd());
console.log('[DEBUG] Script directory:', __dirname);

// STEP 3: Try to load .env files in order
const envPaths = [
  path.join(process.cwd(), '.env'),
  path.join(process.cwd(), '.env.local'),
  path.join(__dirname, '.env'),
  path.join(__dirname, '.env.local')
];

let envLoaded = false;
for (const envPath of envPaths) {
  const result = dotenv.config({ path: envPath });
  if (!result.error) {
    console.log(`[DEBUG] ✓ Loaded .env from: ${envPath}`);
    envLoaded = true;
    break;
  } else {
    console.log(`[DEBUG] ✗ No .env at: ${envPath}`);
  }
}

if (!envLoaded) {
  console.warn('[WARNING] No .env file found - relying on system environment variables');
}

// STEP 4: Debug - print loaded environment variables (safe - only showing first few chars)
const debugEnv = {
  SUPABASE_URL: process.env.SUPABASE_URL ? `${process.env.SUPABASE_URL.substring(0, 20)}...` : 'NOT SET',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? `${process.env.SUPABASE_ANON_KEY.substring(0, 20)}...` : 'NOT SET',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'NOT SET',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD ? '***' : 'NOT SET'
};

console.log('[DEBUG] Environment variables loaded:');
console.log(`  SUPABASE_URL:        ${debugEnv.SUPABASE_URL}`);
console.log(`  SUPABASE_ANON_KEY:   ${debugEnv.SUPABASE_ANON_KEY}`);
console.log(`  ADMIN_EMAIL:         ${debugEnv.ADMIN_EMAIL}`);
console.log(`  ADMIN_PASSWORD:      ${debugEnv.ADMIN_PASSWORD}`);
console.log('');

// Configuration - UPDATE THESE
const CONFIG = {
  supabaseUrl: process.env.SUPABASE_URL || '', // e.g., 'https://xxx.supabase.co'
  anonKey: process.env.SUPABASE_ANON_KEY || '',
  adminEmail: process.env.ADMIN_EMAIL || '',
  adminPassword: process.env.ADMIN_PASSWORD || ''
};

// Test user data
const TEST_USER = {
  email: `test-${Date.now()}@example.com`,
  password: 'testpass123',
  fullName: 'Test User',
  role: 'student' // or 'teacher', 'parent'
};

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function loginAsAdmin() {
  console.log('\n=== Step 1: Login as Admin ===');
  const url = `${CONFIG.supabaseUrl}/auth/v1/token?grant_type=password`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': CONFIG.anonKey
    },
    body: JSON.stringify({
      email: CONFIG.adminEmail,
      password: CONFIG.adminPassword
    })
  });

  const data = await response.json();

  if (!response.ok || !data.access_token) {
    console.error('❌ Login failed:', data);
    throw new Error('Failed to login as admin');
  }

  console.log('✓ Login successful');
  return data.access_token;
}

async function createUser(accessToken, userData) {
  console.log('\n=== Step 2: Create User via Edge Function ===');
  console.log(`Creating user: ${userData.email}`);

  const url = `${CONFIG.supabaseUrl}/functions/v1/create-user`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'apikey': CONFIG.anonKey
    },
    body: JSON.stringify(userData)
  });

  const data = await response.json();
  console.log('\nResponse:');
  console.log(JSON.stringify(data, null, 2));

  return { success: data.success, data, status: response.status };
}

async function verifyUserInDatabase(accessToken, userId) {
  console.log('\n=== Step 3: Verify User in Database ===');

  // Check auth.users (we can't directly access auth.users, but we can check if user exists via profile)
  const url = `${CONFIG.supabaseUrl}/rest/v1/users?id=eq.${userId}&select=*`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'apikey': CONFIG.anonKey
    }
  });

  const data = await response.json();

  if (data.length > 0) {
    console.log('✓ User found in public.users:', data[0]);
  } else {
    console.log('❌ User NOT found in public.users');
  }

  return data;
}

async function main() {
  console.log('==========================================');
  console.log('  Supabase Create-User Function Test');
  console.log('==========================================');

  // Validate config
  if (!CONFIG.supabaseUrl || !CONFIG.adminEmail || !CONFIG.adminPassword) {
    console.error('\n❌ Missing configuration!');
    console.error('Please set the following environment variables:');
    console.error('  - SUPABASE_URL');
    console.error('  - SUPABASE_ANON_KEY');
    console.error('  - ADMIN_EMAIL');
    console.error('  - ADMIN_PASSWORD');
    console.error('\nOr update the CONFIG object in this script.');
    console.error('\nCreate a .env file with:');
    console.error('  SUPABASE_URL=https://your-project.supabase.co');
    console.error('  SUPABASE_ANON_KEY=your-anon-key');
    console.error('  ADMIN_EMAIL=your-admin@email.com');
    console.error('  ADMIN_PASSWORD=your-admin-password');
    process.exit(1);
  }

  try {
    // Step 1: Login
    const accessToken = await loginAsAdmin();

    // Step 2: Create user
    const result = await createUser(accessToken, TEST_USER);

    if (result.success) {
      console.log('\n✓ User created successfully!');
      console.log('\nDebug Info:');
      console.log('  - Trigger worked:', result.data.debug?.triggerWorked);
      console.log('  - Profile created:', result.data.debug?.profileCreated);
      console.log('  - Profile table:', result.data.debug?.profileTable);

      // Step 3: Verify in database
      if (result.data.user?.id) {
        await sleep(1000); // Wait for any pending operations
        await verifyUserInDatabase(accessToken, result.data.user.id);
      }
    } else {
      console.log('\n❌ User creation failed!');
      console.log('Error:', result.data.error);
      console.log('Details:', result.data.details);
    }

  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    console.error(error);
  }

  console.log('\n==========================================');
  console.log('  Test Complete');
  console.log('==========================================\n');
}

// Run the test
main().catch(console.error);

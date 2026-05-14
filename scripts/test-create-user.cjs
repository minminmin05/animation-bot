/**
 * Test Create User - Debug
 */

const { createClient } = require('@supabase/supabase-js');
const { readFileSync } = require('fs');
const { join } = require('path');

function loadEnv() {
  const envPath = join(process.cwd(), '.env');
  try {
    const envContent = readFileSync(envPath, 'utf-8');
    const envVars = {};
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && !key.startsWith('#') && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join('=').trim();
      }
    });
    return envVars;
  } catch (error) {
    return {};
  }
}

const env = loadEnv();
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCreateUser() {
  const testEmail = `test${Date.now()}@gmail.com`;

  console.log('🧪 Testing user creation...');
  console.log('Email:', testEmail);

  // 1. Login as admin
  const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
    email: 'admin@school.com',
    password: 'demo1234'
  });

  if (loginError) {
    console.error('❌ Admin login failed:', loginError.message);
    return;
  }
  console.log('✅ Admin logged in');

  // 2. Check if test email exists anywhere
  console.log('\n🔍 Checking if email exists...');

  const { data: publicCheck } = await supabase
    .from('users')
    .select('*')
    .eq('email', testEmail);

  console.log('public.users count:', publicCheck?.length || 0);

  // 3. Try RPC call
  console.log('\n🔄 Calling admin_create_user RPC...');

  const { data: rpcData, error: rpcError } = await supabase.rpc('admin_create_user', {
    user_email: testEmail,
    user_password: 'test1234',
    user_full_name: 'Test User',
    user_role: 'student'
  });

  console.log('RPC Response:');
  console.log('  data:', JSON.stringify(rpcData, null, 2));
  console.log('  error:', rpcError ? JSON.stringify(rpcError, null, 2) : 'none');

  if (rpcData?.success) {
    console.log('\n✅ User created successfully!');
    console.log('User ID:', rpcData.user_id);
  } else {
    console.log('\n❌ User creation failed');
    console.log('Error:', rpcData?.error || rpcError?.message);
  }

  // 4. Verify in public.users
  const { data: verifyUser } = await supabase
    .from('users')
    .select('*')
    .eq('email', testEmail)
    .single();

  if (verifyUser) {
    console.log('\n✅ User found in public.users');
  } else {
    console.log('\n⚠️ User NOT found in public.users');
  }

  await supabase.auth.signOut();
}

testCreateUser().catch(console.error);

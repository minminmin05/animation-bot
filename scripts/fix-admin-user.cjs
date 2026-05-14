/**
 * Fix Admin User - Sync to public.users
 *
 * Run: node scripts/fix-admin-user.cjs
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

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixAdminUser() {
  console.log('🔧 Fixing admin user...\n');

  // Login as admin
  const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
    email: 'admin@school.com',
    password: 'demo1234'
  });

  if (loginError) {
    console.error('❌ Login failed:', loginError.message);
    return;
  }

  console.log('✅ Logged in as admin');
  const userId = loginData.user.id;
  console.log('User ID:', userId);

  // Check if user exists in public.users
  const { data: existingUser } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (existingUser) {
    console.log('✅ User already exists in public.users');
    console.log('Role:', existingUser.role);
  } else {
    // Insert into public.users using RPC
    console.log('⚠️ User not found in public.users, adding...');

    const { data: insertData, error: insertError } = await supabase.rpc('admin_create_user', {
      user_email: 'admin@school.com',
      user_password: 'demo1234',
      user_full_name: 'ผู้ดูแลระบบ',
      user_role: 'admin'
    });

    if (insertError) {
      console.error('❌ Insert failed:', insertError);

      // Try direct insert
      console.log('🔄 Trying direct insert...');
      const { data: directData, error: directError } = await supabase
        .from('users')
        .insert({
          id: userId,
          email: 'admin@school.com',
          role: 'admin',
          full_name: 'ผู้ดูแลระบบ'
        });

      if (directError) {
        console.error('❌ Direct insert failed:', directError.message);
      } else {
        console.log('✅ Direct insert success!');
      }
    } else {
      console.log('✅ RPC insert success:', insertData);
    }
  }

  // Final check
  const { data: finalCheck } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (finalCheck) {
    console.log('\n✅ Final check - User exists in public.users');
    console.log('Email:', finalCheck.email);
    console.log('Role:', finalCheck.role);
    console.log('Name:', finalCheck.full_name);
  } else {
    console.log('\n❌ User still not in public.users');
  }

  await supabase.auth.signOut();
}

fixAdminUser().catch(console.error);

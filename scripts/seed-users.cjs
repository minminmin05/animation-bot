/**
 * Seed Demo Users Script
 *
 * Run: node scripts/seed-users.cjs
 *
 * This script creates demo users for development/testing.
 * Make sure your .env file has VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
 */

const { createClient } = require('@supabase/supabase-js');
const { readFileSync } = require('fs');
const { join } = require('path');

// Load env variables
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
    console.error('Error loading .env file:', error.message);
    return {};
  }
}

const env = loadEnv();
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const demoUsers = [
  { email: 'admin@school.com', password: 'demo1234', role: 'admin', name: 'ผู้ดูแลระบบ' },
  { email: 'teacher@school.com', password: 'demo1234', role: 'teacher', name: 'ครูสมชาย' },
  { email: 'student@school.com', password: 'demo1234', role: 'student', name: 'นักเรียนวิชาย' },
  { email: 'parent@school.com', password: 'demo1234', role: 'parent', name: 'คุณแม่สมหญิง' }
];

async function seedUsers() {
  console.log('🌱 Seeding demo users...\n');

  for (const user of demoUsers) {
    console.log(`Creating ${user.email}...`);

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', user.email)
      .single();

    if (existingUser) {
      console.log(`  ✅ Already exists, skipping\n`);
      continue;
    }

    // Create user in Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email: user.email,
      password: user.password,
      options: {
        data: { role: user.role, full_name: user.name }
      }
    });

    if (error) {
      if (error.message.includes('rate limit')) {
        console.log(`  ⏳ Rate limited - user may already exist\n`);
      } else {
        console.log(`  ❌ Error: ${error.message}\n`);
      }
    } else {
      console.log(`  ✅ Success!\n`);
    }
  }

  console.log('\n✨ Done! Demo accounts:');
  console.log('┌────────────────────────────────┬─────────────┐');
  console.log('│ Email                          │ Password    │');
  console.log('├────────────────────────────────┼─────────────┤');
  demoUsers.forEach(u => {
    console.log(`│ ${u.email.padEnd(30)} │ demo1234    │`);
  });
  console.log('└────────────────────────────────┴─────────────┘');
}

seedUsers().catch(console.error);

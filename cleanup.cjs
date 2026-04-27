const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://dyjsznvinfosvugpmmeh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5anN6bnZpbmZvc3Z1Z3BtbWVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyMzk5MjYsImV4cCI6MjA5MjgxNTkyNn0.TFcuxb-FzbjE-Oc6e3Qxk74IdqQhVt-Kt0rpine4ulk'
);

async function cleanup() {
  console.log('Cleaning up orphaned auth records...');

  const { data, error } = await supabase.rpc('cleanup_orphaned_auth_records');

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Result:', data);
  }

  console.log('\nChecking current users...');
  const { data: users } = await supabase.from('users').select('email');
  console.log(`Public users: ${users?.length || 0}`);
}

cleanup().catch(console.error);

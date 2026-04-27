const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://dyjsznvinfosvugpmmeh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5anN6bnZpbmZvc3Z1Z3BtbWVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyMzk5MjYsImV4cCI6MjA5MjgxNTkyNn0.TFcuxb-FzbjE-Oc6e3Qxk74IdqQhVt-Kt0rpine4ulk'
);

async function checkEmails() {
  console.log('Checking emails in public.users:');
  const { data: publicUsers, error } = await supabase
    .from('users')
    .select('email, role, full_name');

  if (error) {
    console.error('Error:', error);
  } else {
    console.log(`Found ${publicUsers?.length || 0} users:`);
    publicUsers?.forEach(u => console.log(`  - ${u.email} (${u.role})`));
  }
}

checkEmails().catch(console.error);

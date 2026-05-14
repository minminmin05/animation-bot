# Authentication Setup Guide

## Problem Fixed

The "Invalid login credentials" error was caused by the signup system using PostgreSQL's `crypt()` function to hash passwords, which Supabase's authentication system doesn't recognize.

## Solution

1. **Signup flow now uses Supabase's native `auth.signUp()`**
   - Passwords are properly hashed by Supabase's authentication system
   - Users can log in immediately after signup

2. **Database trigger creates role profiles automatically**
   - When a user signs up, a trigger creates entries in:
     - `public.users` (basic user info)
     - Role-specific tables (`teachers`, `students`, `parents`)

## Initial Setup

### Step 1: Run the Migration

Apply the new migration to your Supabase database:

```bash
# Using Supabase CLI
supabase db push

# Or run the SQL directly in Supabase SQL Editor:
# Open supabase/migrations/20240427000049_fix_auth_signup_trigger.sql
# and run it in the SQL Editor
```

### Step 2: Create the Admin Account

Option A: **Via the Setup Page** (Recommended for new installations)

1. Navigate to `http://localhost:5173/setup`
2. Fill in the admin details:
   - Email: admin@school.com (or your preferred email)
   - Password: (minimum 6 characters)
   - Full Name: Admin User
3. Click "Create Admin Account"
4. You'll be redirected to login - sign in with your new credentials

Option B: **Via the Signup Page** (Alternative)

1. Navigate to `http://localhost:5173/signup`
2. Select "Admin" as the role
3. Fill in your details and create the account
4. Log in with your new admin credentials

### Step 3: Verify the Setup

After logging in as admin, you should be able to:
- Access the Admin Dashboard
- Create additional users (teachers, students, parents)
- Manage classes and enrollments

## Creating Additional Users

### Via Admin Dashboard

Once logged in as admin:
1. Go to **Users** or **Teachers/Students** in the admin menu
2. Click "Add User" or "Create"
3. Fill in the user details
4. The system will create the user and they can log in immediately

### Via Signup Page

Users can also self-register:
1. Navigate to `/signup`
2. Select their role (Student, Teacher, Parent, Admin)
3. Fill in their details
4. They can log in immediately after signup

## Password Requirements

- Minimum 6 characters (enforced by Supabase)
- No email confirmation required (auto-confirmed for development)

## Troubleshooting

### "Invalid login credentials" after signup

1. Make sure the migration has been applied
2. Check the browser console for errors
3. Verify the user exists in `public.users` table:
   ```sql
   SELECT * FROM public.users WHERE email = 'user@example.com';
   ```
4. Check if role-specific profile exists:
   ```sql
   SELECT * FROM teachers WHERE user_id = (SELECT id FROM public.users WHERE email = 'user@example.com');
   ```

### User not being created properly

1. Check the trigger is enabled:
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
   ```

2. Check for errors in Supabase Logs (Database > Logs)

3. Manually sync existing auth users:
   ```sql
   -- Run the sync function
   SELECT sync_all_auth_users();
   ```

## Migration Files

- `20240427000049_fix_auth_signup_trigger.sql` - Updated trigger for role profiles
- `scripts/setup-initial-users.sql` - Manual setup script for existing auth users

## Demo Accounts (for testing)

After initial setup, you can create these demo accounts:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@school.com | demo1234 |
| Teacher | teacher@school.com | demo1234 |
| Student | student@school.com | demo1234 |
| Parent | parent@school.com | demo1234 |

## Security Notes

- This setup is for development/testing
- For production, enable email confirmation
- Use strong passwords
- Consider implementing two-factor authentication

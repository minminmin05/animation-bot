# Supabase Setup Guide

This guide will walk you through setting up Supabase for the School Management System.

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in:
   - **Project Name**: e.g., `school-management`
   - **Database Password**: Choose a strong password (save it!)
   - **Region**: Choose closest to your users
5. Wait for project to be created (~2 minutes)

## Step 2: Get Your API Credentials

1. Go to **Project Settings** (gear icon) → **API**
2. Copy these values:
   - **Project URL** → This is your `VITE_SUPABASE_URL`
   - **anon/public** key → This is your `VITE_SUPABASE_ANON_KEY`
   - **service_role** key → This is for backend only (NEVER share!)

## Step 3: Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and fill in your values:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

## Step 4: Run the Database Schema

1. In Supabase Dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy the contents of `supabase/schema.sql`
4. Paste and click "Run" (or press Ctrl+Enter)

This will create all tables, indexes, RLS policies, functions, and triggers.

## Step 5: Configure Email Templates (Optional)

1. Go to **Authentication** → **Email Templates**
2. Customize the confirmation email and reset password templates

## Step 6: Test Your Setup

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to the app and try signing up a new user

## Step 7: Create Your First Admin User

After signup, you'll need to manually promote a user to admin:

1. Go to **Table Editor** → **users**
2. Find your user
3. Change `role` to `admin`

Or run in SQL Editor:
```sql
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
```

## Security Checklist

- ✅ Never commit `.env` file to git
- ✅ Never expose `service_role` key to frontend
- ✅ RLS is enabled on all tables
- ✅ Users can only access their own data (or their children's for parents)
- ✅ Admins have full access through RLS policies

## Troubleshooting

### "Missing Supabase environment variables"
- Make sure you copied `.env.example` to `.env`
- Check that the values are correct (no extra spaces)

### "Row Level Security policy violated"
- Check that you've run the schema.sql
- Verify the user's role in the `users` table
- Check that RLS policies match your use case

### Can't see data after signup
- The `handle_new_user()` trigger should create a user record
- Check the `users` table to see if the record was created
- For students/teachers/parents, you need to insert into those tables separately

## Next Steps

1. Implement additional features as needed
2. Set up Supabase Storage for file uploads
3. Enable Realtime for live updates
4. Set up Edge Functions for server-side logic

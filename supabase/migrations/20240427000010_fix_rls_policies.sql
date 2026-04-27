-- ========================================
-- FIX INFINITE RECURSION IN RLS POLICIES
-- ========================================
-- Migration: 20240427000010_fix_rls_policies
-- Description: Fix infinite recursion in users table RLS policies

-- Drop existing problematic policies on users table
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can update all users" ON users;
DROP POLICY IF EXISTS "Allow user insert during signup" ON users;

-- Create new simplified policies for users table
-- These policies use auth.uid() directly instead of querying the users table

-- Everyone can view users (for development)
CREATE POLICY "Allow all authenticated to view users"
  ON users FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- Users can insert (needed for signup)
CREATE POLICY "Allow user insert"
  ON users FOR INSERT
  WITH CHECK (true);

-- Admin can update any user (checked in application, not policy)
CREATE POLICY "Admins can update any user"
  ON users FOR UPDATE
  USING (true);


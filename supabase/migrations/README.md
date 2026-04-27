# Supabase Migrations

This directory contains database migrations for the School Management System.

## Migration Files

| File | Description |
|------|-------------|
| `20240427000001_initial_schema.sql` | Creates all database tables and indexes |
| `20240427000002_rls_policies.sql` | Enables RLS and creates security policies |
| `20240427000003_functions_triggers.sql` | Creates functions and triggers |
| `20240427000004_seed_data.sql` | Seeds demo data for testing |

## How to Apply Migrations

### Option 1: Using Supabase Dashboard (Recommended for now)

1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to **SQL Editor**
4. Run each migration file in order (01 → 02 → 03 → 04)

### Option 2: Using Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Push migrations to remote
supabase db push

# Or run specific migrations
supabase migration up
```

### Option 3: Local Development

```bash
# Start local Supabase
supabase start

# Apply migrations locally
supabase db reset

# Access local studio at http://localhost:54323
```

## After Applying Migrations

1. Create demo users in **Authentication** → **Users**:
   - `admin@school.com` / `demo1234` (role: admin)
   - `teacher@school.com` / `demo1234` (role: teacher)
   - `student@school.com` / `demo1234` (role: student)
   - `parent@school.com` / `demo1234` (role: parent)

2. Run the seed migration (`20240427000004_seed_data.sql`) to sync auth users with database tables

## Important Notes

- Migrations must be run in order (by timestamp)
- The seed data migration is optional - skip for production
- Always test migrations in a development environment first

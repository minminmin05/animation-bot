# Root Cause Analysis: False "Email Already Exists" Error

## Problem Statement
When creating a new user, the system returns "Email already exists" even though the email is NOT present in the database.

## Complete Flow Trace

### Frontend (SignupPage.jsx lines 48-76)
```javascript
const { data, error: rpcError } = await supabase.rpc('public_signup', {
  user_email: formData.email,
  user_password: formData.password,
  user_full_name: formData.fullName,
  user_role: formData.role
})

if (rpcError) {
  throw new Error(rpcError.message)  // Error caught here
}

if (!data?.success) {
  throw new Error(data?.error || 'Failed to create account')  // Or here
}
```

### Database RPC Function (public_signup from migration 11)

Here is the EXACT current flow of the `public_signup` function:

```sql
-- Step 1: Normalize email
normalized_email := lower(trim(user_email));

-- Step 2: SYNC ALL AUTH USERS FIRST ⚠️
PERFORM sync_all_auth_users();

-- Step 3: Check public.users for email
IF EXISTS (
  SELECT 1 FROM public.users WHERE email = normalized_email
  LIMIT 1
) THEN
  RETURN jsonb_build_object('success', false, 'error', 'Email already registered');
END IF;

-- Step 4: Check for orphaned auth record
SELECT id INTO existing_auth_id
FROM auth.users
WHERE email = normalized_email
LIMIT 1;

-- Step 5: Delete orphaned auth record if found
IF existing_auth_id IS NOT NULL THEN
  DELETE FROM auth.users WHERE id = existing_auth_id;
END IF;

-- Step 6: Insert into auth.users
INSERT INTO auth.users (id, email, ...) VALUES (...);

-- Step 7: Insert into public.users
INSERT INTO public.users (id, email, role, full_name) VALUES (...);
```

### The sync_auth_users_to_public() Function (migration 7)

```sql
-- This loops through ALL orphaned auth records
FOR auth_user IN
  SELECT au.id, au.email, au.raw_user_meta_data
  FROM auth.users au
  WHERE au.id NOT IN (SELECT id FROM public.users WHERE id IS NOT NULL)
LOOP
  -- INSERT into public.users
  INSERT INTO public.users (id, email, role, full_name) VALUES (...);
END LOOP;
```

## THE BUG: Self-Inflicted Race Condition

### Scenario: User tries to signup with `test@example.com`

**Initial State:**
- `auth.users`: Has record with email `test@example.com` (orphaned from failed signup)
- `public.users`: Does NOT have `test@example.com`

**Execution Flow:**

| Step | Action | Result |
|------|--------|--------|
| 1 | User submits signup form | Frontend calls `public_signup('test@example.com', ...)` |
| 2 | `public_signup` calls `sync_all_auth_users()` | **⚠️ SYNCS ALL ORPHANED RECORDS** |
| 3 | `sync_auth_users_to_public()` loops through orphaned auth records | Finds `test@example.com` in auth.users |
| 4 | `sync_auth_users_to_public()` inserts into public.users | **Creates `test@example.com` in public.users!** |
| 5 | Back in `public_signup`, check `IF EXISTS (SELECT 1 FROM public.users WHERE email = 'test@example.com')` | **FINDS IT! (Because we just created it in step 4!)** |
| 6 | Returns error | `{success: false, error: "Email already registered"}` |
| 7 | Frontend receives response | Throws `new Error("Email already registered")` |
| 8 | User sees error | ❌ "Email already exists" - FALSE POSITIVE! |

## Root Cause Summary

**THE BUG:** The `public_signup` function calls `sync_all_auth_users()` BEFORE checking for duplicate emails. This sync function inserts orphaned auth records into `public.users`, which can include the email the user is trying to register!

**Why it happens:**
1. A previous signup attempt may have failed partway through, leaving an orphaned `auth.users` record
2. When a new signup is attempted with the same email, `sync_all_auth_users()` is called first
3. This syncs the orphaned record to `public.users`
4. Then the duplicate check finds the email that was JUST synced
5. The signup is blocked with "Email already registered"

**Additional issues:**
1. No check for `deleted_at IS NULL` when checking `auth.users` for duplicates
2. The trigger `on_auth_user_created` fires AFTER inserting into `auth.users`, which could cause issues
3. The check for orphaned records happens AFTER the sync (too late!)

## The Fix

The fix addresses ALL the issues:

1. **Remove the problematic sync call** - Don't call `sync_all_auth_users()` during signup
2. **Handle orphaned records BEFORE duplicate checks** - Clean orphaned records first
3. **Check for duplicates atomically** - Use UNION to check both tables together
4. **Exclude soft-deleted records** - Add `AND deleted_at IS NULL` for auth.users
5. **Handle trigger conflict** - Use `ON CONFLICT (id) DO UPDATE` for public.users insert

### Fixed Flow:

```sql
-- Step 1: Normalize email
normalized_email := lower(trim(user_email));

-- Step 2: Handle orphaned auth record FIRST (before any duplicate checks!)
SELECT id INTO existing_auth_id
FROM auth.users
WHERE email = normalized_email
AND deleted_at IS NULL
AND NOT EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.users.id)
LIMIT 1;

-- Step 3: Delete orphaned record if found
IF existing_auth_id IS NOT NULL THEN
  DELETE FROM auth.users WHERE id = existing_auth_id;
END IF;

-- Step 4: ATOMIC duplicate check across both tables
IF EXISTS (
  SELECT 1 FROM public.users WHERE email = normalized_email
  UNION ALL
  SELECT 1 FROM auth.users WHERE email = normalized_email AND deleted_at IS NULL
) THEN
  RETURN jsonb_build_object('success', false, 'error', 'Email already registered');
END IF;

-- Step 5: Insert into auth.users (trigger fires here)
INSERT INTO auth.users (...) VALUES (...);

-- Step 6: Insert into public.users with ON CONFLICT to handle trigger-created record
INSERT INTO public.users (id, email, role, full_name)
  VALUES (new_user_id, normalized_email, user_role, user_full_name)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    full_name = EXCLUDED.full_name;
```

### Additional Issue: Trigger Conflict

The `on_auth_user_created` trigger fires when we insert into `auth.users` and also tries to insert into `public.users`. This causes a race condition:

1. RPC inserts into auth.users → trigger fires
2. Trigger inserts into public.users
3. RPC tries to insert into public.users → UNIQUE constraint violation!

**Fix:** Use `ON CONFLICT (id) DO UPDATE` so if the trigger already created the record, we update it instead of failing.

## Migration Required

The complete fix is in: `supabase/migrations/20240427000016_fix_duplicate_email_detection.sql`

This migration:
1. ✅ Drops the old `public_signup` and `admin_create_user` functions
2. ✅ Creates new versions with the correct flow
3. ✅ Removes the problematic `sync_all_auth_users()` call
4. ✅ Handles orphaned records BEFORE duplicate checks
5. ✅ Uses UNION for atomic duplicate checking
6. ✅ Excludes soft-deleted auth records (`deleted_at IS NULL`)
7. ✅ Uses `ON CONFLICT (id) DO UPDATE` to handle trigger conflict

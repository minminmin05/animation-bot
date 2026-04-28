-- ========================================
-- FIX USER MANAGEMENT FUNCTIONS
-- ========================================
-- Migration: 20240427000013_fix_user_management
-- Description: Fix missing grants and sync function for user management

-- Grant execute permission for admin_create_user
GRANT EXECUTE ON FUNCTION admin_create_user(TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- Grant execute permission for admin_update_role
GRANT EXECUTE ON FUNCTION admin_update_role(UUID, TEXT) TO authenticated;

-- Grant execute permission for admin_delete_user
GRANT EXECUTE ON FUNCTION admin_delete_user(UUID) TO authenticated;

-- Grant execute permission for admin_get_all_users
GRANT EXECUTE ON FUNCTION admin_get_all_users() TO authenticated;

-- Create missing sync_all_auth_users function (alias for sync_auth_users_to_public)
CREATE OR REPLACE FUNCTION sync_all_auth_users()
RETURNS JSONB AS $$
BEGIN
  RETURN sync_auth_users_to_public();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION sync_all_auth_users() TO authenticated;

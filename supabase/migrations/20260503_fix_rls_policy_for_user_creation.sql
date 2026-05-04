-- ============================================
-- FIX: RLS Policy สำหรับให้ trigger/function สร้าง user ได้
-- Date: 2026-05-02
-- Problem: Edge Function returned 500 error when creating users
-- Root Cause: RLS policy 'users_insert_own' blocked inserts from trigger
--             because auth.uid() was NULL in trigger context
-- ============================================

-- ลบ policy เดิม (ถ้ามี)
DROP POLICY IF EXISTS users_insert_own ON public.users;
DROP POLICY IF EXISTS users_insert_via_trigger ON public.users;

-- สร้าง policy ใหม่ที่อนุญาตให้ SECURITY DEFINER function insert ได้
-- Policy นี้อนุญาต 2 กรณี:
-- 1. id = auth.uid() (กรณี user insert ข้อมูลตัวเอง)
-- 2. id มีอยู่ใน auth.users แล้ว (กรณี trigger สร้างหลังจาก auth user ถูกสร้าง)
CREATE POLICY users_insert_via_trigger ON public.users
  FOR INSERT TO authenticated
  WITH CHECK (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = public.users.id
      AND auth.users.deleted_at IS NULL
    )
  );

-- Grant permissions
GRANT ALL ON public.users TO postgres;

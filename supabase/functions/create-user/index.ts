import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

// ใช้ service_role key เพื่อสร้าง auth user
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  try {
    // 1. รับข้อมูลจาก request
    const { email, password, fullName, role } = await req.json()

    // 2. Validate inputs
    if (!email || !password || !fullName || !role) {
      return new Response(
        JSON.stringify({ success: false, error: 'All fields are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (!['student', 'teacher', 'parent', 'admin'].includes(role)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid role' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // 3. ตรวจสอบสิทธิ์ admin (จาก Authorization header)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // 4. สร้าง Supabase client ด้วย service_role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 5. ตรวจสอบว่า user ที่ส่ง request เป็น admin
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // 6. เช็ค role จาก public.users
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userError || !userData || userData.role !== 'admin') {
      return new Response(
        JSON.stringify({ success: false, error: 'Admin access required' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // 7. สร้าง auth user (ใช้ admin API + fake email support)
    const { data: newUserData, error: createError } = await supabase.auth.admin.createUser({
      email: email.trim(),
      password: password,
      email_confirm: true,        // ← ปิด email confirmation
      user_metadata: {
        full_name: fullName.trim(),
        role: role
      }
    })

    if (createError) {
      // ตรวจสอบ error จาก duplicate email
      if (createError.message?.includes('already been registered')) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'A user with this email already exists'
          }),
          { status: 409, headers: { 'Content-Type': 'application/json' } }
        )
      }
      throw createError
    }

    // 8. Trigger จะทำงานอัตโนมัติ → สร้างข้อมูลใน public.users
    // ไม่ต้อง insert เพิ่มเอง

    return new Response(
      JSON.stringify({
        success: true,
        message: 'User created successfully',
        user: {
          id: newUserData.user.id,
          email: newUserData.user.email,
          full_name: fullName,
          role: role
        }
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error creating user:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to create user'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

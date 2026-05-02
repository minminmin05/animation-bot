/**
 * สร้าง Mock Users สำหรับระบบโรงเรียน
 * ใช้วิธี SQL โดยตรง (INSERT INTO auth.users)
 *
 * วิธีรัน: node scripts/create-mock-users-direct.js
 * ต้องมี environment variables: SUPABASE_URL และ SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

// โหลด environment variables
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config()

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ ไม่พบ SUPABASE_URL หรือ SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// สร้าง Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const DEFAULT_PASSWORD = '123456'

// ฟังก์ชัน hash password (สำหรับ auth.users - Supabase ใช้ bcrypt)
// แต่เราจะใช้ค่า raw_password_hash แทน เพราะ Supabase จะ hash ให้เอง
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

// ฟังก์ชันสร้าง full_name จาก email
function getFullNameFromEmail(email, role) {
  const number = email.replace(/[^0-9]/g, '')
  const roleLabel = {
    student: 'นักเรียน',
    teacher: 'ครู',
    parent: 'ผู้ปกครอง'
  }
  return `${roleLabel[role]} ${number}`
}

// ฟังก์ชันสร้าง user ด้วย SQL โดยตรง
async function createUserViaSQL(email, password, role, fullName) {
  const userId = generateUUID()
  const normalizedEmail = email.toLowerCase().trim()

  try {
    // ใช้ RPC เพื่อ execute SQL โดยตรง
    // ใช้ฟังก์ชัน pgcrypto เพื่อ hash password
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        DO $$
        DECLARE
          v_user_id UUID := '${userId}';
          v_email TEXT := '${normalizedEmail}';
          v_password TEXT := '${password}';
          v_full_name TEXT := '${fullName.replace(/'/g, "''")}';
          v_role TEXT := '${role}';
          v_exists INT;
        BEGIN
          -- Check duplicate in public.users
          SELECT COUNT(*) INTO v_exists FROM public.users WHERE email = v_email;
          IF v_exists > 0 THEN
            RAISE NOTICE 'EXISTS: %', v_email;
            RETURN;
          END IF;

          -- Check duplicate in auth.users
          SELECT COUNT(*) INTO v_exists FROM auth.users WHERE email = v_email AND deleted_at IS NULL;
          IF v_exists > 0 THEN
            RAISE NOTICE 'EXISTS_AUTH: %', v_email;
            RETURN;
          END IF;

          -- Insert into auth.users
          INSERT INTO auth.users (
            id,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_user_meta_data,
            raw_app_meta_data,
            created_at,
            updated_at,
            confirmation_token
          ) VALUES (
            v_user_id,
            v_email,
            crypt(v_password, gen_salt('bf')),
            NOW(),
            jsonb_build_object('full_name', v_full_name, 'role', v_role),
            '{"provider": "email", "providers": ["email"]}'::jsonb,
            NOW(),
            NOW(),
            encode(gen_random_bytes(32), 'hex')
          );

          RAISE NOTICE 'CREATED: %', v_email;
        END $$;
      `
    })

    // exec_sql อาจไม่มี ให้ลองวิธีอื่น
    if (error) {
      // ลองใช้วิธี direct insert ผ่าน supabase.from()
      // แต่ auth.users ไม่สามารถเข้าถึงได้โดยตรง
      return { success: false, error: 'Cannot directly insert into auth.users', email }
    }

    return { success: true, email, id: userId, role }
  } catch (err) {
    return { success: false, error: err.message, email }
  }
}

// ฟังก์ชันสร้าง user ผ่าน HTTP API โดยตรง (เรียก Supabase REST API)
async function createUserViaAPI(email, password, role, fullName) {
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          role: role
        },
        app_metadata: {
          provider: 'email',
          providers: ['email']
        }
      })
    })

    const data = await response.json()

    if (!response.ok) {
      // Check if duplicate
      console.log(`    DEBUG: Status ${response.status}`, JSON.stringify(data))
      if (data.message?.includes('already') || data.message?.includes('duplicate') || data.message?.includes('User already registered')) {
        return { success: false, error: 'User นี้มีอยู่แล้ว', email, skipped: true }
      }
      return { success: false, error: data.message || data.error_description || JSON.stringify(data), email }
    }

    return { success: true, email, id: data.id, role }
  } catch (err) {
    return { success: false, error: err.message, email }
  }
}

// ฟังก์ชันสร้าง users หลายคน
async function createUsers(userList, role) {
  const results = []

  for (const user of userList) {
    const result = await createUserViaAPI(user.email, DEFAULT_PASSWORD, role, user.fullName)
    results.push(result)

    if (result.success) {
      console.log(`  ✅ ${user.email}`)
    } else if (result.skipped) {
      console.log(`  ⏭️  ${user.email} - มีอยู่แล้ว`)
    } else {
      console.log(`  ❌ ${user.email}: ${result.error}`)
    }

    await new Promise(resolve => setTimeout(resolve, 300))
  }

  return results
}

// ฟังก์ชันสร้าง Markdown
function generateMarkdownDoc(students, teachers, parents) {
  let markdown = `# Test Users สำหรับระบบโรงเรียน

สร้างเมื่อ: ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}

รหัสผ่านสำหรับทุกบัญชี: **123456**

---

## นักเรียน (Students)

`

  students.forEach(user => {
    markdown += `* **${user.fullName}** - [${user.email}](mailto:${user.email}) / 123456\n`
  })

  markdown += `\n## ครู (Teachers)\n\n`

  teachers.forEach(user => {
    markdown += `* **${user.fullName}** - [${user.email}](mailto:${user.email}) / 123456\n`
  })

  markdown += `\n## ผู้ปกครอง (Parents)\n\n`

  parents.forEach(user => {
    markdown += `* **${user.fullName}** - [${user.email}](mailto:${user.email}) / 123456\n`
  })

  markdown += `\n---\n\n## สรุป\n\n`
  markdown += `- นักเรียน: ${students.length} คน\n`
  markdown += `- ครู: ${teachers.length} คน\n`
  markdown += `- ผู้ปกครอง: ${parents.length} คน\n`
  markdown += `- รวมทั้งหมด: ${students.length + teachers.length + parents.length} คน\n`

  return markdown
}

async function main() {
  console.log('🚀 เริ่มสร้าง Mock Users...\n')

  const students = Array.from({ length: 20 }, (_, i) => ({
    email: `student${i + 1}@fake.com`,
    fullName: getFullNameFromEmail(`student${i + 1}@fake.com`, 'student')
  }))

  const teachers = Array.from({ length: 5 }, (_, i) => ({
    email: `teacher${i + 1}@fake.com`,
    fullName: getFullNameFromEmail(`teacher${i + 1}@fake.com`, 'teacher')
  }))

  const parents = Array.from({ length: 5 }, (_, i) => ({
    email: `parent${i + 1}@fake.com`,
    fullName: getFullNameFromEmail(`parent${i + 1}@fake.com`, 'parent')
  }))

  console.log('📚 กำลังสร้าง นักเรียน 20 คน...')
  const studentResults = await createUsers(students, 'student')

  console.log('\n👨‍🏫 กำลังสร้าง ครู 5 คน...')
  const teacherResults = await createUsers(teachers, 'teacher')

  console.log('\n👪 กำลังสร้าง ผู้ปกครอง 5 คน...')
  const parentResults = await createUsers(parents, 'parent')

  const allResults = [...studentResults, ...teacherResults, ...parentResults]
  const success = allResults.filter(r => r.success)
  const skipped = allResults.filter(r => r.skipped)
  const failed = allResults.filter(r => !r.success && !r.skipped)

  console.log('\n' + '='.repeat(50))
  console.log(`✅ สร้างสำเร็จ: ${success.length} คน`)
  console.log(`⏭️  ข้าม (มีอยู่แล้ว): ${skipped.length} คน`)
  console.log(`❌ ล้มเหลว: ${failed.length} คน`)
  console.log('='.repeat(50))

  const createdStudents = studentResults.filter(r => r.success || r.skipped).map((r, i) => ({
    email: students[i].email,
    fullName: students[i].fullName
  }))
  const createdTeachers = teacherResults.filter(r => r.success || r.skipped).map((r, i) => ({
    email: teachers[i].email,
    fullName: teachers[i].fullName
  }))
  const createdParents = parentResults.filter(r => r.success || r.skipped).map((r, i) => ({
    email: parents[i].email,
    fullName: parents[i].fullName
  }))

  const markdown = generateMarkdownDoc(createdStudents, createdTeachers, createdParents)

  const outputPath = path.join(process.cwd(), 'test-users.md')
  fs.writeFileSync(outputPath, markdown, 'utf-8')

  console.log(`\n📄 สร้างไฟล์รายการ users: ${outputPath}`)

  if (success.length > 0) {
    console.log('\n🎉 Users ที่สร้างสำเร็จสามารถใช้ล็อกอินได้ทันที!')
  }

  console.log('\n👋 เสร็จสิ้น!')
}

main().catch(err => {
  console.error('เกิดข้อผิดพลาด:', err)
  process.exit(1)
})

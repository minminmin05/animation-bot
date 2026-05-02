/**
 * สร้าง Mock Users สำหรับระบบโรงเรียน
 * ใช้ Supabase RPC function: admin_create_user
 *
 * วิธีรัน: node scripts/create-mock-users-rpc.js
 * ต้องมี environment variables: SUPABASE_URL และ SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// โหลด environment variables
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config()

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ ไม่พบ SUPABASE_URL หรือ SUPABASE_SERVICE_ROLE_KEY ใน environment variables')
  process.exit(1)
}

// สร้าง Supabase admin client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const DEFAULT_PASSWORD = '123456'

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

// ฟังก์ชันสร้าง user ด้วย RPC
async function createUser(email, password, role, fullName) {
  try {
    // เรียกใช้ RPC function admin_create_user
    const { data, error } = await supabase.rpc('admin_create_user', {
      user_email: email,
      user_password: password,
      user_full_name: fullName,
      user_role: role
    })

    if (error) {
      return { success: false, error: error.message, email }
    }

    if (!data || !data.success) {
      return { success: false, error: data?.error || 'Unknown error', email }
    }

    return { success: true, email, id: data.user_id, role }
  } catch (err) {
    return { success: false, error: err.message, email }
  }
}

// ฟังก์ชันสร้าง users หลายคน (แบบ sequential เพื่อความปลอดภัย)
async function createUsers(userList, role) {
  const results = []

  for (const user of userList) {
    const result = await createUser(user.email, DEFAULT_PASSWORD, role, user.fullName)
    results.push(result)

    if (result.success) {
      console.log(`  ✅ ${user.email}`)
    } else {
      console.log(`  ❌ ${user.email}: ${result.error}`)
    }

    // รอเล็กน้อยเพื่อไม่ให้โหลด database
    await new Promise(resolve => setTimeout(resolve, 200))
  }

  return results
}

// ฟังก์ชันสร้าง Markdown เอกสาร
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

// ฟังก์ชันหลัก
async function main() {
  console.log('🚀 เริ่มสร้าง Mock Users...\n')

  // เตรียมข้อมูล users
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

  // สร้าง users แต่ละกลุ่ม
  console.log('📚 กำลังสร้าง นักเรียน 20 คน...')
  const studentResults = await createUsers(students, 'student')

  console.log('\n👨‍🏫 กำลังสร้าง ครู 5 คน...')
  const teacherResults = await createUsers(teachers, 'teacher')

  console.log('\n👪 กำลังสร้าง ผู้ปกครอง 5 คน...')
  const parentResults = await createUsers(parents, 'parent')

  // รวบรวมผลลัพธ์
  const allResults = [...studentResults, ...teacherResults, ...parentResults]
  const success = allResults.filter(r => r.success)
  const failed = allResults.filter(r => !r.success)

  // แสดงสรุป
  console.log('\n' + '='.repeat(50))
  console.log(`✅ สร้างสำเร็จ: ${success.length} คน`)
  console.log(`❌ ล้มเหลว: ${failed.length} คน`)
  console.log('='.repeat(50))

  // สร้างไฟล์ Markdown
  const createdStudents = studentResults.filter(r => r.success).map((r, i) => ({
    email: students[i].email,
    fullName: students[i].fullName
  }))
  const createdTeachers = teacherResults.filter(r => r.success).map((r, i) => ({
    email: teachers[i].email,
    fullName: teachers[i].fullName
  }))
  const createdParents = parentResults.filter(r => r.success).map((r, i) => ({
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

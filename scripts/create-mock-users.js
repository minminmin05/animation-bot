/**
 * สร้าง Mock Users สำหรับระบบโรงเรียน
 * ใช้ Supabase Admin API (service_role key) เพื่อสร้าง users พร้อมยืนยัน email แล้ว
 *
 * วิธีรัน: node scripts/create-mock-users.js
 * ต้องมี environment variables: SUPABASE_URL และ SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

// โหลด environment variables (รองรับ .env และ .env.local)
dotenv.config({ path: '.env.local' })
dotenv.config() // โหลด .env เพิ่มเติมถ้ามี

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ ไม่พบ SUPABASE_URL หรือ SUPABASE_SERVICE_ROLE_KEY ใน environment variables')
  console.error('กรุณาเพิ่มในไฟล์ .env ของคุณ')
  process.exit(1)
}

// สร้าง Supabase client ด้วย service_role key (สำหรับ Admin API)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// รหัสผ่านมาตรฐานสำหรับทุก user
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

// ฟังก์ชันสร้าง user ด้วย Admin API
async function createUser(email, password, role, fullName) {
  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // ยืนยัน email อัตโนมัติ
      user_metadata: {
        full_name: fullName,
        role: role
      }
    })

    if (error) {
      if (error.message.includes('already been registered')) {
        return { success: false, error: 'User นี้มีอยู่แล้ว', email, skipped: true }
      }
      return { success: false, error: error.message, email }
    }

    return { success: true, email, id: data.user.id, role }
  } catch (err) {
    return { success: false, error: err.message, email }
  }
}

// ฟังก์ชันสร้าง users หลายคน
async function createUsers(userList, role) {
  const results = []
  const batchSize = 5 // สร้างทีละ 5 user เพื่อไม่ให้โหลด server มาก

  for (let i = 0; i < userList.length; i += batchSize) {
    const batch = userList.slice(i, i + batchSize)
    const promises = batch.map(user =>
      createUser(user.email, DEFAULT_PASSWORD, role, user.fullName)
    )
    const batchResults = await Promise.all(promises)
    results.push(...batchResults)

    // รอเล็กน้อยก่อน batch ถัดไป
    if (i + batchSize < userList.length) {
      await new Promise(resolve => setTimeout(resolve, 500))
    }
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

  console.log('👨‍🏫 กำลังสร้าง ครู 5 คน...')
  const teacherResults = await createUsers(teachers, 'teacher')

  console.log('👪 กำลังสร้าง ผู้ปกครอง 5 คน...')
  const parentResults = await createUsers(parents, 'parent')

  // รวบรวมผลลัพธ์
  const allResults = [...studentResults, ...teacherResults, ...parentResults]
  const success = allResults.filter(r => r.success)
  const failed = allResults.filter(r => !r.success)
  const skipped = allResults.filter(r => r.skipped)

  // แสดงผลลัพธ์
  console.log('\n✅ สร้างสำเร็จ:', success.length, 'คน')
  console.log('⏭️  ข้าม (มีอยู่แล้ว):', skipped.length, 'คน')
  console.log('❌ ล้มเหลว:', failed.length, 'คน')

  if (failed.length > 0) {
    console.log('\nรายการที่ล้มเหลว:')
    failed.forEach(f => {
      console.log(`  - ${f.email}: ${f.error}`)
    })
  }

  // สร้างไฟล์ Markdown
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

  // แสดงตัวอย่าง users ที่สร้างสำเร็จ
  if (success.length > 0) {
    console.log('\nตัวอย่าง users ที่สร้างสำเร็จ:')
    success.slice(0, 5).forEach(s => {
      console.log(`  ✅ ${s.email} (${s.role})`)
    })
  }

  console.log('\n🎉 เสร็จสิ้น!')
}

// รัน
main().catch(err => {
  console.error('เกิดข้อผิดพลาด:', err)
  process.exit(1)
})

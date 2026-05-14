import { extractStudentName } from './services/grade.service.js'

const questions = [
  'ขอข้อมูลของ Ava Martinez มีเกรดอะไรเท่าไหร่บ้าง',
  'เกรดของ Emma Miller',
  'grades for Sophia Chen',
  'show grades for Ethan Rodriguez'
]

questions.forEach(q => {
  const name = extractStudentName(q)
  console.log(`Q: ${q}`)
  console.log(`  Extracted name: "${name}"`)
  console.log('')
})

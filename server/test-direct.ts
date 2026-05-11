import { searchStudentsByName, getStudentDataByName, detectPersonalDataType } from './services/grade.service.js'
import 'dotenv/config'

async function testDirect() {
  const studentName = 'Ava Martinez'
  const adminId = '768cf99b-d8d6-4c08-88a1-7035c29bd87e'
  const adminRole = 'admin'

  console.log('Testing direct database query...')
  console.log('Student name:', studentName)
  console.log('Admin:', adminId, adminRole)

  try {
    const result = await getStudentDataByName(studentName, 'grades', adminId, adminRole)
    console.log('\nResult:', result)
  } catch (error: any) {
    console.error('Error:', error.message)
    console.error('Stack:', error.stack)
  }
}

testDirect().catch(console.error)

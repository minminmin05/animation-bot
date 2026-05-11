import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

async function testWithAdmin() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  const { data: admin } = await supabase
    .from('users')
    .select('id, role')
    .eq('role', 'admin')
    .limit(1)
    .single()

  const adminId = admin?.id || 'test-admin-id'
  console.log('Testing with admin:', adminId)

  const response = await fetch('http://localhost:3001/api/rag/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      question: 'ขอข้อมูลของ Ava Martinez มีเกรดอะไรเท่าไหร่บ้าง',
      userId: adminId,
      userRole: 'admin'
    })
  })

  const data = await response.json()
  console.log('\nQ: ขอข้อมูลของ Ava Martinez มีเกรดอะไรเท่าไหร่บ้าง')
  console.log('Intent:', data.intent)
  console.log('Response:', data.text?.substring(0, 400))
}

testWithAdmin().catch(console.error)

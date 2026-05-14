import 'dotenv/config'

async function testWithFullResponse() {
  const adminId = '768cf99b-d8d6-4c08-88a1-7035c29bd87e'

  const response = await fetch('http://localhost:3001/api/rag/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      question: 'ขอข้อมูลของ Ava Martinez มีเกรดอะไรเท่าไหร่บ้าง',
      userId: adminId,
      userRole: 'admin'
    })
  })

  console.log('Status:', response.status)
  console.log('Headers:', Object.fromEntries(response.headers.entries()))

  const text = await response.text()
  console.log('Raw response:', text.substring(0, 500))

  try {
    const data = JSON.parse(text)
    console.log('\nParsed data:', JSON.stringify(data, null, 2))
  } catch {
    console.log('Response is not valid JSON')
  }
}

testWithFullResponse().catch(console.error)

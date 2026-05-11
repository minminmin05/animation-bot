async function testPersonalQuery() {
  const questions = [
    'ขอข้อมูลของ Ava Martinez มีเกรดอะไรเท่าไหร่บ้าง',
    'เกรดของ Emma Miller',
    'grades for Sophia Chen'
  ]

  for (const q of questions) {
    const response = await fetch('http://localhost:3001/api/rag/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ question: q })
    })

    const data = await response.json()
    console.log(`Q: ${q}`)
    console.log(`Intent: ${data.intent || 'unknown'}`)
    console.log(`A: ${data.text.substring(0, 200)}...`)
    console.log('')
  }
}

testPersonalQuery().catch(console.error)
